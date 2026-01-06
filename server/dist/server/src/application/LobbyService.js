"use strict";
/**
 * Lobby Service - Application Layer
 * Encapsulates lobby-related use cases: create, join, leave, start game
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LobbyService = void 0;
const gameLogic_1 = require("../gameLogic");
const types_1 = require("../types");
/**
 * LobbyService handles all lobby-related use cases
 */
class LobbyService {
    constructor(lobbyManager, gameRoomManager) {
        this.lobbyManager = lobbyManager;
        this.gameRoomManager = gameRoomManager;
    }
    /**
     * Create a new game lobby
     */
    createGame(hostSocketId, maxPlayers, nickname) {
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
    joinGame(code, socketId, nickname) {
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
    leaveGame(socketId) {
        const result = this.lobbyManager.leaveLobby(socketId);
        return { lobby: result.lobby || null, wasHost: result.wasHost };
    }
    /**
     * Select a faction
     */
    selectFaction(socketId, faction) {
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
    setReady(socketId, isReady) {
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
    startGame(hostSocketId) {
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
        const humanFactions = startResult.lobby.players
            .map(p => p.faction)
            .filter((f) => f !== null);
        let aiFaction = null;
        if (startResult.lobby.maxPlayers === 2) {
            const allFactions = [types_1.FactionId.REPUBLICANS, types_1.FactionId.CONSPIRATORS, types_1.FactionId.NOBLES];
            aiFaction = allFactions.find(f => !humanFactions.includes(f)) || null;
        }
        // Create server-side game state
        const serverGameState = (0, gameLogic_1.createMultiplayerGameState)(humanFactions, aiFaction);
        // Create game room
        const room = this.gameRoomManager.createRoom(startResult.lobby, serverGameState);
        this.lobbyManager.setGameInProgress(lobby.code);
        return {
            success: true,
            lobby: startResult.lobby,
            gameState: (0, gameLogic_1.getClientState)(serverGameState),
            turnOrder: room.turnOrder,
            humanFactions,
            aiFaction
        };
    }
    /**
     * Get player's current lobby
     */
    getPlayerLobby(socketId) {
        return this.lobbyManager.getPlayerLobby(socketId);
    }
    /**
     * Mark player as disconnected
     */
    markDisconnected(socketId) {
        return this.lobbyManager.markPlayerDisconnected(socketId);
    }
}
exports.LobbyService = LobbyService;
