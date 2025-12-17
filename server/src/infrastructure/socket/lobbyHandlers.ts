/**
 * Lobby Socket Handlers
 * Handles all lobby-related socket events: create, join, leave, faction selection, ready, start
 */

import { Server, Socket } from 'socket.io';
import { FactionId } from '../../types';
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
}
