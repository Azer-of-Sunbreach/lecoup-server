/**
 * Lobby Service - Application Layer
 * Encapsulates lobby-related use cases: create, join, leave, start game
 */
import { LobbyManager } from '../lobbyManager';
import { GameRoomManager } from '../gameRoom';
import { FactionId, GameLobby } from '../types';
export interface CreateGameResult {
    success: boolean;
    lobby: GameLobby;
    code: string;
}
export interface JoinGameResult {
    success: boolean;
    error?: string;
    lobby?: GameLobby;
}
export interface StartGameResult {
    success: boolean;
    error?: string;
    lobby?: GameLobby;
    gameState?: any;
    turnOrder?: FactionId[];
    humanFactions?: FactionId[];
    aiFaction?: FactionId | null;
}
/**
 * LobbyService handles all lobby-related use cases
 */
export declare class LobbyService {
    private lobbyManager;
    private gameRoomManager;
    constructor(lobbyManager: LobbyManager, gameRoomManager: GameRoomManager);
    /**
     * Create a new game lobby
     */
    createGame(hostSocketId: string, maxPlayers: 2 | 3, nickname: string): CreateGameResult;
    /**
     * Join an existing lobby
     */
    joinGame(code: string, socketId: string, nickname: string): JoinGameResult;
    /**
     * Leave a lobby
     */
    leaveGame(socketId: string): {
        lobby: GameLobby | null;
        wasHost: boolean;
    };
    /**
     * Select a faction
     */
    selectFaction(socketId: string, faction: FactionId): JoinGameResult;
    /**
     * Set player ready status
     */
    setReady(socketId: string, isReady: boolean): JoinGameResult;
    /**
     * Start the game
     */
    startGame(hostSocketId: string): StartGameResult;
    /**
     * Get player's current lobby
     */
    getPlayerLobby(socketId: string): GameLobby | null;
    /**
     * Mark player as disconnected
     */
    markDisconnected(socketId: string): GameLobby | null;
}
