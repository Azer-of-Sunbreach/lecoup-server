/**
 * Game Socket Handlers
 * Handles all game-related socket events: player_action, end_turn
 */
import { Server, Socket } from 'socket.io';
import { GameRoomManager } from '../../gameRoom';
export declare function registerGameHandlers(io: Server, socket: Socket, gameRoomManager: GameRoomManager): void;
