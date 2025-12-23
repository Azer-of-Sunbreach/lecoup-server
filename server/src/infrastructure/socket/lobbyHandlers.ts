/**
* Lobby Socket Handlers
* Handles all lobby-related socket events: create, join, leave, faction selection, ready, start
*/

import { Server, Socket } from 'socket.io';
import { FactionId, PlayerInfo } from '../../types';
import { LobbyManager } from '../../lobbyManager';
import { GameRoomManager } from '../../gameRoom';
import { createMultiplayerGameState, getClientState } from '../../gameLogic';

export function registerLobbyHandlers(
    io: Server,
    socket: Socket,
    lobbyManager: LobbyManager,
    gameRoomManager: GameRoomManager
): void {

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
        // IMPORTANT: Sort by standard faction order (REPUBLICANS < CONSPIRATORS < NOBLES)
        const standardOrder = [FactionId.REPUBLICANS, FactionId.CONSPIRATORS, FactionId.NOBLES];
        const humanFactions: FactionId[] = startResult.lobby!.players
            .map(p => p.faction)
            .filter((f): f is FactionId => f !== null)
            .sort((a, b) => standardOrder.indexOf(a) - standardOrder.indexOf(b));

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

    // Rejoin game after disconnect/reconnect
    socket.on('rejoin_game', ({ lobbyCode, faction }: { lobbyCode: string; faction: FactionId }) => {
        console.log(`[Rejoin] Player ${socket.id} attempting to rejoin ${lobbyCode} as ${faction}`);

        // Find the game room
        const room = gameRoomManager.getRoom(lobbyCode);
        if (!room) {
            console.log(`[Rejoin] No room found for ${lobbyCode}`);
            socket.emit('rejoin_error', { message: 'Game not found or has ended' });
            return;
        }

        // Verify the faction was part of the game
        const validFactions = Array.from(room.playerFactions.values());
        if (!validFactions.includes(faction)) {
            console.log(`[Rejoin] Faction ${faction} not in room's factions:`, validFactions);
            socket.emit('rejoin_error', { message: 'Invalid faction for this game' });
            return;
        }

        // Update socket data
        socket.data.gameCode = lobbyCode;
        socket.data.faction = faction;

        // Rejoin the socket room
        socket.join(lobbyCode);

        // Update the lobby to mark player as connected again
        const lobby = lobbyManager.getLobby(lobbyCode);
        if (lobby) {
            const player = lobby.players.find(p => p.faction === faction);
            if (player) {
                player.odId = socket.id;
                player.isConnected = true;
            }
        }

        // CRITICAL: Update room.playerFactions with new socketId
        // This map is used by isPlayerTurn and getSocketForFaction
        room.playerFactions.set(socket.id, faction);

        // Send current game state to the rejoined player
        const currentState = getClientState(room.gameState);
        socket.emit('state_update', { gameState: currentState });

        // Notify successful rejoin
        socket.emit('game_rejoined', { lobbyCode, faction });

        console.log(`[Rejoin] Player ${socket.id} successfully rejoined ${lobbyCode} as ${faction}`);
    });

    // Restore game from client state (after server restart)
    socket.on('restore_game', ({ lobbyCode, faction, gameState, aiFaction }) => {
        console.log(`[Restore] Player ${socket.id} attempting to restore ${lobbyCode} as ${faction}`);

        // Double check if room exists (race condition)
        if (gameRoomManager.getRoom(lobbyCode)) {
            console.log(`[Restore] Room ${lobbyCode} already exists, treating as rejoin`);
            // Trigger rejoin logic manually or tell client to rejoin
            // Ideally we'd just call the rejoin logic, but for simplicity let's emit error and client will rejoin
            // Actually, client won't retry rejoin if restore fails with "exists".
            // Let's just tell client it's restored (which effectively joins them)
            // But we need to ensure they are joined to socket room
            socket.emit('rejoin_error', { message: 'Game already exists, please rejoin' });
            return;
        }

        // Reconstruct Lobby
        // We need to infer other players. 
        // If 3 player game (aiFaction is null), we have 3 humans.
        // If 2 player game (aiFaction not null), we have 2 humans.
        const allFactions = [FactionId.REPUBLICANS, FactionId.CONSPIRATORS, FactionId.NOBLES];
        const humanFactions = aiFaction
            ? allFactions.filter(f => f !== aiFaction)
            : allFactions;

        const players: PlayerInfo[] = humanFactions.map(f => ({
            odId: f === faction ? socket.id : `disconnected-${f}`, // Placeholder for others
            faction: f,
            isHost: f === faction, // Restorer becomes host effectively
            isReady: true,
            isConnected: f === faction,
            nickname: f === faction ? 'Restored Player' : 'Disconnected'
        }));

        const maxPlayers = aiFaction ? 2 : 3;

        // Restore Lobby
        const lobby = lobbyManager.restoreLobby(lobbyCode, players, maxPlayers);

        // Restore Game Room
        // Note: We use the gameState from client. Check security? (Ideally yes, but for now trust client)
        const room = gameRoomManager.createRoom(lobby, gameState);

        // Sync currentTurnIndex with gameState.currentTurnFaction (server field name)
        // Client might send as currentPlayerFaction or currentTurnFaction depending on source
        const currentFaction = gameState.currentTurnFaction || gameState.currentPlayerFaction;
        room.currentTurnIndex = room.turnOrder.indexOf(currentFaction);
        if (room.currentTurnIndex === -1) room.currentTurnIndex = 0; // Fallback

        // CRITICAL: Ensure server game state has all required multiplayer fields
        // advanceTurn uses state.currentTurnIndex, state.turnOrder, state.humanFactions, state.aiFaction
        room.gameState.currentTurnFaction = room.turnOrder[room.currentTurnIndex];
        room.gameState.currentTurnIndex = room.currentTurnIndex;
        room.gameState.turnOrder = room.turnOrder;
        room.gameState.humanFactions = humanFactions;
        room.gameState.aiFaction = aiFaction;

        console.log(`[Restore] Turn sync: currentFaction=${currentFaction}, turnIndex=${room.currentTurnIndex}, serverCurrentTurn=${room.gameState.currentTurnFaction}`);

        // Join socket
        socket.data.gameCode = lobbyCode;
        socket.data.faction = faction;
        socket.join(lobbyCode);

        // Notify client
        socket.emit('game_restored');
        socket.emit('state_update', { gameState: getClientState(room.gameState) });

        console.log(`[Restore] Successfully restored game ${lobbyCode} from player state`);
    });
}
