/**
 * Socket Infrastructure - Main Export
 * Registers all socket event handlers from specialized modules
 */

import { Server, Socket } from 'socket.io';
import { LobbyManager } from '../../lobbyManager';
import { GameRoomManager } from '../../gameRoom';
import { LobbyService, GameService, CombatService } from '../../application';
import { registerLobbyHandlers } from './lobbyHandlers';
import { registerGameHandlers } from './gameHandlers';
import { registerCombatHandlers } from './combatHandlers';

/**
 * Services and managers container for dependency injection
 */
export interface SocketDependencies {
    lobbyManager: LobbyManager;
    gameRoomManager: GameRoomManager;
    lobbyService: LobbyService;
    gameService: GameService;
    combatService: CombatService;
}

/**
 * Register all socket handlers for a new connection
 */
export function registerSocketHandlers(
    io: Server,
    socket: Socket,
    deps: SocketDependencies
): void {
    // Initialize socket data
    socket.data.odId = socket.id;
    socket.data.gameCode = null;
    socket.data.faction = null;

    // Register handlers from each domain (still using managers for now, can migrate to services incrementally)
    registerLobbyHandlers(io, socket, deps.lobbyManager, deps.gameRoomManager);
    registerGameHandlers(io, socket, deps.gameRoomManager);
    registerCombatHandlers(io, socket, deps.gameRoomManager);

    // Disconnect handler
    socket.on('disconnect', (reason) => {
        console.log(`[Connection] Client disconnected: ${socket.id} (${reason})`);

        const lobby = deps.lobbyService.markDisconnected(socket.id);
        if (lobby) {
            io.to(lobby.code).emit('player_left', { odId: socket.id, lobby });
        }
    });
}

// Re-export individual handlers for testing
export { registerLobbyHandlers } from './lobbyHandlers';
export { registerGameHandlers } from './gameHandlers';
export { registerCombatHandlers } from './combatHandlers';

