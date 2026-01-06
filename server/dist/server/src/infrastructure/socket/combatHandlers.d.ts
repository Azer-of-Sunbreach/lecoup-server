/**
 * Combat Socket Handlers
 * Handles all combat-related socket events: combat_choice
 */
import { Server, Socket } from 'socket.io';
import { GameRoomManager } from '../../gameRoom';
export declare function registerCombatHandlers(io: Server, socket: Socket, gameRoomManager: GameRoomManager): void;
