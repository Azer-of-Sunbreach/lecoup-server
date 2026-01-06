/**
 * Socket Infrastructure - Main Export
 * Registers all socket event handlers from specialized modules
 */
import { Server, Socket } from 'socket.io';
import { LobbyManager } from '../../lobbyManager';
import { GameRoomManager } from '../../gameRoom';
import { LobbyService, GameService, CombatService } from '../../application';
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
export declare function registerSocketHandlers(io: Server, socket: Socket, deps: SocketDependencies): void;
export { registerLobbyHandlers } from './lobbyHandlers';
export { registerGameHandlers } from './gameHandlers';
export { registerCombatHandlers } from './combatHandlers';
