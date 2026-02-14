/**
 * Lobby Service - Application Layer
 * Encapsulates lobby-related use cases: create, join, leave, start game
 */

import { LobbyManager } from '../lobbyManager';
import { GameRoomManager } from '../gameRoom';
import { createMultiplayerGameState, getClientState } from '../gameLogic';
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
export class LobbyService {
    constructor(
        private lobbyManager: LobbyManager,
        private gameRoomManager: GameRoomManager
    ) { }

    /**
     * Create a new game lobby
     */
    createGame(hostSocketId: string, maxPlayers: 2 | 3, nickname: string): CreateGameResult {
        const lobby = this.lobbyManager.createLobby(hostSocketId, maxPlayers, nickname);
        return {
            success: true,
            lobby,
            code: lobby.code
        };
    }

    /**
     * Join an existing lobby
     */
    joinGame(code: string, socketId: string, nickname: string): JoinGameResult {
        const result = this.lobbyManager.joinLobby(code, socketId, nickname);
        return {
            success: result.success,
            error: result.error,
            lobby: result.lobby
        };
    }

    /**
     * Leave a lobby
     */
    leaveGame(socketId: string): { lobby: GameLobby | null; wasHost: boolean } {
        const result = this.lobbyManager.leaveLobby(socketId);
        return { lobby: result.lobby || null, wasHost: result.wasHost };
    }

    /**
     * Select a faction
     */
    selectFaction(socketId: string, faction: FactionId): JoinGameResult {
        const result = this.lobbyManager.selectFaction(socketId, faction);
        return {
            success: result.success,
            error: result.error,
            lobby: result.lobby
        };
    }

    /**
     * Set player ready status
     */
    setReady(socketId: string, isReady: boolean): JoinGameResult {
        const result = this.lobbyManager.setPlayerReady(socketId, isReady);
        return {
            success: result.success,
            error: result.error,
            lobby: result.lobby
        };
    }

    /**
     * Start the game
     */
    startGame(hostSocketId: string): StartGameResult {
        const lobby = this.lobbyManager.getPlayerLobby(hostSocketId);
        if (!lobby) {
            return { success: false, error: 'Not in a game' };
        }

        if (lobby.hostSocketId !== hostSocketId) {
            return { success: false, error: 'Only the host can start the game' };
        }

        const startResult = this.lobbyManager.startGame(lobby.code);
        if (!startResult.success) {
            return { success: false, error: startResult.error };
        }

        // Determine human and AI factions
        const humanFactions: FactionId[] = startResult.lobby!.players
            .map(p => p.faction)
            .filter((f): f is FactionId => f !== null);

        let aiFaction: FactionId | null = null;
        if (startResult.lobby!.maxPlayers === 2) {
            const allFactions = [FactionId.REPUBLICANS, FactionId.CONSPIRATORS, FactionId.NOBLES];
            aiFaction = allFactions.find(f => !humanFactions.includes(f)) || null;
        }

        // Create server-side game state
        const serverGameState = createMultiplayerGameState(humanFactions, aiFaction);

        // Create game room
        const room = this.gameRoomManager.createRoom(startResult.lobby!, serverGameState);

        this.lobbyManager.setGameInProgress(lobby.code);

        return {
            success: true,
            lobby: startResult.lobby!,
            gameState: getClientState(serverGameState),
            turnOrder: room.turnOrder,
            humanFactions,
            aiFaction
        };
    }

    /**
     * Get player's current lobby
     */
    getPlayerLobby(socketId: string): GameLobby | null {
        return this.lobbyManager.getPlayerLobby(socketId);
    }

    /**
     * Mark player as disconnected
     */
    markDisconnected(socketId: string): GameLobby | null {
        return this.lobbyManager.markPlayerDisconnected(socketId);
    }
}
