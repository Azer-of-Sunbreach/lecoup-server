// Le Coup Multiplayer Server
// Main entry point

import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
    ServerToClientEvents,
    ClientToServerEvents,
    InterServerEvents,
    SocketData,
    FactionId
} from './types';
import { LobbyManager } from './lobbyManager';
import { GameRoomManager } from './gameRoom';
import {
    createMultiplayerGameState,
    processPlayerAction,
    advanceTurn,
    processAITurn,
    getClientState,
    MultiplayerGameState
} from './gameLogic';
import { resolveCombatResult } from '../../shared/services/combat';

const PORT = process.env.PORT || 3001;

// Create HTTP server
const httpServer = createServer();

// Create Socket.IO server with CORS configuration
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Initialize managers
const lobbyManager = new LobbyManager();
const gameRoomManager = new GameRoomManager();

console.log('=================================');
console.log('  Le Coup - Multiplayer Server   ');
console.log('=================================');

io.on('connection', (socket) => {
    console.log(`[Connection] New client: ${socket.id}`);

    // Initialize socket data
    socket.data.odId = socket.id;
    socket.data.gameCode = null;
    socket.data.faction = null;

    // ==================
    // LOBBY EVENTS
    // ==================

    socket.on('create_game', ({ maxPlayers, nickname }) => {
        const lobby = lobbyManager.createLobby(socket.id, maxPlayers, nickname);
        socket.data.gameCode = lobby.code;
        socket.join(lobby.code);

        socket.emit('game_created', { code: lobby.code, lobby });
    });

    socket.on('join_game', ({ code, nickname }) => {
        const result = lobbyManager.joinLobby(code, socket.id, nickname);

        if (!result.success || !result.lobby) {
            socket.emit('error', { message: result.error || 'Failed to join game' });
            return;
        }

        socket.data.gameCode = result.lobby.code;
        socket.join(result.lobby.code);

        // Notify all players in the lobby
        io.to(result.lobby.code).emit('player_joined', {
            player: result.lobby.players.find(p => p.odId === socket.id)!,
            lobby: result.lobby
        });
    });

    socket.on('leave_game', () => {
        const { lobby, wasHost } = lobbyManager.leaveLobby(socket.id);
        const code = socket.data.gameCode;

        if (code) {
            socket.leave(code);
            socket.data.gameCode = null;
            socket.data.faction = null;

            if (wasHost) {
                // Notify all players that the game was closed
                io.to(code).emit('error', { message: 'Host left the game', code: 'HOST_LEFT' });
            } else if (lobby) {
                io.to(code).emit('player_left', { odId: socket.id, lobby });
            }
        }
    });

    socket.on('select_faction', ({ faction }) => {
        const result = lobbyManager.selectFaction(socket.id, faction);

        if (!result.success || !result.lobby) {
            socket.emit('error', { message: result.error || 'Failed to select faction' });
            return;
        }

        socket.data.faction = faction;
        io.to(result.lobby.code).emit('faction_selected', {
            odId: socket.id,
            faction,
            lobby: result.lobby
        });
    });

    socket.on('set_ready', ({ isReady }) => {
        const result = lobbyManager.setPlayerReady(socket.id, isReady);

        if (!result.success || !result.lobby) {
            socket.emit('error', { message: result.error || 'Failed to set ready' });
            return;
        }

        io.to(result.lobby.code).emit('player_ready', {
            odId: socket.id,
            isReady,
            lobby: result.lobby
        });
    });

    socket.on('start_game', () => {
        const lobby = lobbyManager.getPlayerLobby(socket.id);
        if (!lobby) {
            socket.emit('error', { message: 'Not in a game' });
            return;
        }

        // Only host can start
        if (lobby.hostSocketId !== socket.id) {
            socket.emit('error', { message: 'Only the host can start the game' });
            return;
        }

        const startResult = lobbyManager.startGame(lobby.code);
        if (!startResult.success) {
            socket.emit('error', { message: startResult.error || 'Cannot start game' });
            return;
        }

        // Notify all players that game is starting
        io.to(lobby.code).emit('game_starting', { lobby: startResult.lobby! });

        // Determine human and AI factions
        const humanFactions: FactionId[] = startResult.lobby!.players
            .map(p => p.faction)
            .filter((f): f is FactionId => f !== null);

        let aiFaction: FactionId | null = null;
        if (startResult.lobby!.maxPlayers === 2) {
            const allFactions = [FactionId.REPUBLICANS, FactionId.CONSPIRATORS, FactionId.NOBLES];
            aiFaction = allFactions.find(f => !humanFactions.includes(f as FactionId)) as FactionId || null;
        }

        // Create REAL server-side game state using shared logic
        const serverGameState = createMultiplayerGameState(humanFactions, aiFaction);

        // Create game room with the proper state
        const room = gameRoomManager.createRoom(startResult.lobby!, serverGameState);

        lobbyManager.setGameInProgress(lobby.code);

        // Notify all players that game has started with the full state
        io.to(lobby.code).emit('game_started', {
            gameState: getClientState(serverGameState),
            turnOrder: room.turnOrder
        });

        console.log(`[Game] Started: ${lobby.code} with factions: humans=${humanFactions}, AI=${aiFaction}`);
    });

    // ==================
    // GAME EVENTS
    // ==================

    socket.on('player_action', ({ action }) => {
        console.log(`[Game] Received player_action from socket ${socket.id}:`, action?.type);
        const code = socket.data.gameCode;
        console.log(`[Game] Socket gameCode: ${code}`);
        if (!code) {
            console.log(`[Game] ERROR: No gameCode for socket ${socket.id}`);
            socket.emit('error', { message: 'Not in a game' });
            return;
        }

        const room = gameRoomManager.getRoom(code);
        if (!room) {
            socket.emit('error', { message: 'Game room not found' });
            return;
        }

        // Get player's faction
        const playerFaction = room.playerFactions.get(socket.id);
        if (!playerFaction) {
            socket.emit('action_result', { success: false, error: 'Player faction not found' });
            return;
        }

        // Process action on server using shared game logic
        console.log(`[Game] ${code}: Processing ${action.type} from ${playerFaction}`);
        const sharedAction = { ...action, faction: playerFaction }; // Add faction for shared type
        const result = processPlayerAction(room.gameState, sharedAction as any, playerFaction);

        if (!result.success) {
            socket.emit('action_result', { success: false, error: result.error });
            return;
        }

        // Update server state
        room.gameState = result.newState;

        // Check if combat was triggered by this action
        if (result.newState.combatState) {
            const combat = result.newState.combatState;
            const attackerIsAI = combat.attackerFaction === room.aiFaction;
            const defenderIsAI = combat.defenderFaction === room.aiFaction;

            console.log(`[Game] ${code}: Combat detected - Attacker: ${combat.attackerFaction} (AI: ${attackerIsAI}), Defender: ${combat.defenderFaction} (AI: ${defenderIsAI})`);

            if (attackerIsAI && defenderIsAI) {
                // AI vs AI - auto resolve with FIGHT
                console.log(`[Game] ${code}: AI vs AI combat - auto-resolving`);
                const updates = resolveCombatResult(room.gameState, 'FIGHT', 0);
                room.gameState = { ...room.gameState, ...updates };
            } else if (attackerIsAI) {
                // AI attacker vs Human defender - AI always fights, ask defender
                console.log(`[Game] ${code}: AI attacker - auto-choosing FIGHT, asking defender`);
                const defenderSocketId = gameRoomManager.getSocketForFaction(code, combat.defenderFaction);
                if (defenderSocketId) {
                    gameRoomManager.initiateCombat(code, combat, 'AI', combat.defenderFaction);
                    gameRoomManager.setAttackerChoice(code, 'FIGHT');
                    io.to(defenderSocketId).emit('combat_choice_requested', {
                        combatState: combat,
                        role: 'DEFENDER'
                    });
                } else {
                    // Defender is also AI (shouldn't happen) - auto resolve
                    const updates = resolveCombatResult(room.gameState, 'FIGHT', 0);
                    room.gameState = { ...room.gameState, ...updates };
                }
            } else if (defenderIsAI) {
                // Human attacker vs AI defender - ask attacker, AI will auto-respond
                console.log(`[Game] ${code}: Human attacker vs AI defender - asking attacker`);
                gameRoomManager.initiateCombat(code, combat, socket.id, combat.defenderFaction);
                socket.emit('combat_choice_requested', {
                    combatState: combat,
                    role: 'ATTACKER'
                });
            } else {
                // Human vs Human - ask attacker first
                console.log(`[Game] ${code}: PvP combat - asking attacker`);
                gameRoomManager.initiateCombat(code, combat, socket.id, combat.defenderFaction);
                socket.emit('combat_choice_requested', {
                    combatState: combat,
                    role: 'ATTACKER'
                });
            }
        }

        // Broadcast updated state to ALL players
        const clientState = getClientState(room.gameState);
        io.to(code).emit('state_update', { gameState: clientState });

        socket.emit('action_result', { success: true });
        console.log(`[Game] ${code}: Action ${action.type} processed successfully`);
    });

    socket.on('end_turn', async () => {
        const code = socket.data.gameCode;
        if (!code) {
            socket.emit('error', { message: 'Not in a game' });
            return;
        }

        if (!gameRoomManager.isPlayerTurn(code, socket.id)) {
            socket.emit('error', { message: 'Not your turn' });
            return;
        }

        const room = gameRoomManager.getRoom(code);
        if (!room) {
            socket.emit('error', { message: 'Game room not found' });
            return;
        }

        console.log(`[Game] ${code}: Ending turn for ${room.gameState.currentTurnFaction}`);

        try {
            // 1. Advance the turn (calculates next faction, potentially processes full turn if round complete)
            let result = await advanceTurn(room.gameState);

            // Update room state
            room.gameState = result.newState;

            // Notify players of the new state and turn
            io.to(code).emit('state_update', { gameState: getClientState(room.gameState) });
            io.to(code).emit('turn_changed', {
                currentFaction: room.gameState.currentTurnFaction,
                turnNumber: room.gameState.turn
            });

            // 2. If it's an AI turn, process it immediately
            // Loop in case multiple AI turns happen in sequence (unlikely in this design but good for robustness)
            while (result.isAITurn) {
                console.log(`[Game] ${code}: Skipping AI turn for ${result.nextFaction} (AI plays during round resolution)`);

                // Advance turn AGAIN (if AI is last, this will trigger processTurn which runs AI logic)
                result = await advanceTurn(room.gameState);
                room.gameState = result.newState;

                // Send updates after AI turn
                io.to(code).emit('state_update', { gameState: getClientState(room.gameState) });
                io.to(code).emit('turn_changed', {
                    currentFaction: room.gameState.currentTurnFaction,
                    turnNumber: room.gameState.turn
                });
            }

        } catch (err: any) {
            console.error(`[Game] ${code}: Error ending turn:`, err);
            socket.emit('error', { message: 'Failed to process end turn' });
        }
    });

    // ==================
    // COMBAT EVENTS
    // ==================

    socket.on('combat_choice', ({ choice, siegeCost }) => {
        const code = socket.data.gameCode;
        if (!code) {
            socket.emit('error', { message: 'Not in a game' });
            return;
        }

        const room = gameRoomManager.getRoom(code);
        if (!room || !room.pendingCombat) {
            socket.emit('error', { message: 'No pending combat' });
            return;
        }

        const combat = room.pendingCombat;

        // Determine if this is attacker or defender choice
        if (socket.id === combat.attackerSocketId) {
            if (choice === 'FIGHT' || choice === 'RETREAT' || choice === 'SIEGE') {
                gameRoomManager.setAttackerChoice(code, choice, siegeCost);

                // If defender is human, request their choice
                if (combat.defenderSocketId) {
                    io.to(combat.defenderSocketId).emit('combat_choice_requested', {
                        combatState: combat.combatState,
                        role: 'DEFENDER'
                    });
                } else {
                    // Defender is AI - auto-choose FIGHT and resolve immediately
                    console.log(`[Game] ${code}: AI defender - auto-choosing FIGHT`);
                    gameRoomManager.setDefenderChoice(code, 'FIGHT');
                }
            }
        } else if (socket.id === combat.defenderSocketId) {
            if (choice === 'FIGHT' || choice === 'RETREAT_CITY') {
                gameRoomManager.setDefenderChoice(code, choice as 'FIGHT' | 'RETREAT_CITY');
            }
        }

        // Check if combat is ready to resolve
        if (gameRoomManager.isCombatReady(code)) {
            // Determine final choice based on precedence
            // Priority: RETREAT_CITY > RETREAT > SIEGE > FIGHT
            let finalChoice: 'FIGHT' | 'RETREAT' | 'RETREAT_CITY' | 'SIEGE' = 'FIGHT';
            let finalSiegeCost = combat.siegeCost || 0;

            if (combat.defenderChoice === 'RETREAT_CITY') {
                finalChoice = 'RETREAT_CITY';
            } else if (combat.attackerChoice === 'RETREAT') {
                finalChoice = 'RETREAT';
            } else if (combat.attackerChoice === 'SIEGE') {
                finalChoice = 'SIEGE';
            } else {
                finalChoice = 'FIGHT';
            }

            console.log(`[Game] ${code}: Resolving combat with choice: ${finalChoice}`);

            // Import resolver dynamically or use the one from gameLogic if available?
            // gameLogic.ts doesn't export resolveCombatResult but imports it.
            // Better to import directly from shared here.

            // NOTE: We need resolveCombatResult from shared/services/combat
            // Since index.ts doesn't import it yet, we assume it needs to be imported.
            // But verify inputs.

            // Wait, we need to import resolveCombatResult at the top of index.ts first.
            // For now, let's assume we added the import (I will upate imports next).

            const updates = resolveCombatResult(room.gameState, finalChoice, finalSiegeCost);

            // Update state
            room.gameState = { ...room.gameState, ...updates };

            io.to(code).emit('combat_resolved', {
                result: room.pendingCombat, // Send original pending context
                gameState: getClientState(room.gameState)
            });

            io.to(code).emit('state_update', {
                gameState: getClientState(room.gameState)
            });

            gameRoomManager.clearCombat(code);
        }
    });

    // ==================
    // DISCONNECT
    // ==================

    socket.on('disconnect', (reason) => {
        console.log(`[Connection] Client disconnected: ${socket.id} (${reason})`);

        const lobby = lobbyManager.markPlayerDisconnected(socket.id);
        if (lobby) {
            io.to(lobby.code).emit('player_left', { odId: socket.id, lobby });
        }
    });
});

// Start server - bind to 0.0.0.0 for Render compatibility
httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`CORS enabled for: ${process.env.CLIENT_URL || "http://localhost:5173"}`);
    console.log('');
    console.log('Ready for connections...');
});
