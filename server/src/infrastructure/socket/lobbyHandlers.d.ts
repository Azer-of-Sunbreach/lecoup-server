/**
* Lobby Socket Handlers
* Handles all lobby-related socket events: create, join, leave, faction selection, ready, start
*/
import { Server, Socket } from 'socket.io';
import { LobbyManager } from '../../lobbyManager';
import { GameRoomManager } from '../../gameRoom';
export declare function registerLobbyHandlers(io: Server, socket: Socket, lobbyManager: LobbyManager, gameRoomManager: GameRoomManager): void;
