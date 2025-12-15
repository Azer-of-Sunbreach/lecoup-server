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

        // Create the game room with initial state
        // Note: In production, we would import the actual game creation logic
        // For now, we send a signal that clients should create the game state
        const room = gameRoomManager.createRoom(startResult.lobby!, {
            turn: 1,
            // Initial state will be set by the first state sync from host
        });

        lobbyManager.setGameInProgress(lobby.code);

        // Notify all players that game has started
        io.to(lobby.code).emit('game_started', {
            gameState: room.gameState,
            turnOrder: room.turnOrder
        });

        console.log(`[Game] Started: ${lobby.code}`);
    });

    // ==================
    // GAME EVENTS
    // ==================

    socket.on('player_action', ({ action }) => {
        const code = socket.data.gameCode;
        if (!code) {
            socket.emit('error', { message: 'Not in a game' });
            return;
        }

        // Verify it's the player's turn
        if (!gameRoomManager.isPlayerTurn(code, socket.id)) {
            socket.emit('action_result', { success: false, error: 'Not your turn' });
            return;
        }

        // For now, we trust the client to process the action
        // In production, we would validate and process server-side
        console.log(`[Game] ${code}: Action from ${socket.id} - ${action.type}`);

        // Broadcast that an action was taken (for real-time visibility)
        socket.to(code).emit('action_result', {
            success: true,
            gameState: null // State will be synced separately
        });

        socket.emit('action_result', { success: true });
    });

    socket.on('end_turn', () => {
        const code = socket.data.gameCode;
        if (!code) {
            socket.emit('error', { message: 'Not in a game' });
            return;
        }

        if (!gameRoomManager.isPlayerTurn(code, socket.id)) {
            socket.emit('error', { message: 'Not your turn' });
            return;
        }

        const turnResult = gameRoomManager.advanceTurn(code);
        if (!turnResult) {
            socket.emit('error', { message: 'Failed to advance turn' });
            return;
        }

        // Notify all players of turn change
        io.to(code).emit('turn_changed', {
            currentFaction: turnResult.newFaction,
            turnNumber: turnResult.newTurnNumber
        });

        // If it's AI turn, we'll need to trigger AI processing
        // For now, AI processing happens client-side on the host
        if (turnResult.isAITurn) {
            console.log(`[Game] ${code}: AI turn for ${turnResult.newFaction}`);
            // The host client will process the AI turn and send updates
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
                gameRoomManager.setAttackerChoice(code, choice);

                // If defender is human, request their choice
                if (combat.defenderSocketId) {
                    io.to(combat.defenderSocketId).emit('combat_choice_requested', {
                        combatState: combat.combatState,
                        role: 'DEFENDER'
                    });
                }
            }
        } else if (socket.id === combat.defenderSocketId) {
            if (choice === 'FIGHT' || choice === 'RETREAT_CITY') {
                gameRoomManager.setDefenderChoice(code, choice as 'FIGHT' | 'RETREAT_CITY');
            }
        }

        // Check if combat is ready to resolve
        if (gameRoomManager.isCombatReady(code)) {
            // Combat resolution happens client-side for now
            // The host will send the resolved state
            io.to(code).emit('combat_resolved', {
                result: room.pendingCombat,
                gameState: room.gameState
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
