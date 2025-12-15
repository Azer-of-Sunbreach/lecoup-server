"use strict";
// Lobby Manager - Handles game lobby creation and management
Object.defineProperty(exports, "__esModule", { value: true });
exports.LobbyManager = void 0;
// Generate a readable game code like "LARION-7X3K"
const generateGameCode = () => {
    const prefix = 'LARION';
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars (0/O, 1/I)
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}-${code}`;
};
class LobbyManager {
    constructor() {
        this.lobbies = new Map();
        this.playerToLobby = new Map(); // odId -> gameCode
        // Clean up stale lobbies every 5 minutes
        setInterval(() => this.cleanupStaleLobbies(), 5 * 60 * 1000);
    }
    createLobby(hostSocketId, maxPlayers, nickname) {
        let code;
        // Ensure unique code
        do {
            code = generateGameCode();
        } while (this.lobbies.has(code));
        const hostPlayer = {
            odId: hostSocketId,
            faction: null,
            isHost: true,
            isReady: false,
            isConnected: true,
            nickname: nickname || 'Host'
        };
        const lobby = {
            code,
            hostSocketId,
            maxPlayers,
            players: [hostPlayer],
            status: 'WAITING',
            createdAt: Date.now()
        };
        this.lobbies.set(code, lobby);
        this.playerToLobby.set(hostSocketId, code);
        console.log(`[Lobby] Created: ${code} by ${hostSocketId} (${maxPlayers} players)`);
        return lobby;
    }
    joinLobby(code, socketId, nickname) {
        const lobby = this.lobbies.get(code.toUpperCase());
        if (!lobby) {
            return { success: false, error: 'Game not found' };
        }
        if (lobby.status !== 'WAITING') {
            return { success: false, error: 'Game already in progress' };
        }
        if (lobby.players.length >= lobby.maxPlayers) {
            return { success: false, error: 'Game is full' };
        }
        // Check if player is already in lobby (reconnection)
        const existingPlayer = lobby.players.find(p => p.odId === socketId);
        if (existingPlayer) {
            existingPlayer.isConnected = true;
            return { success: true, lobby };
        }
        const newPlayer = {
            odId: socketId,
            faction: null,
            isHost: false,
            isReady: false,
            isConnected: true,
            nickname: nickname || `Player ${lobby.players.length + 1}`
        };
        lobby.players.push(newPlayer);
        this.playerToLobby.set(socketId, code);
        console.log(`[Lobby] ${socketId} joined ${code}`);
        return { success: true, lobby };
    }
    leaveLobby(socketId) {
        const code = this.playerToLobby.get(socketId);
        if (!code)
            return { wasHost: false };
        const lobby = this.lobbies.get(code);
        if (!lobby)
            return { wasHost: false };
        const wasHost = lobby.hostSocketId === socketId;
        lobby.players = lobby.players.filter(p => p.odId !== socketId);
        this.playerToLobby.delete(socketId);
        // If host left or no players, delete lobby
        if (wasHost || lobby.players.length === 0) {
            this.lobbies.delete(code);
            console.log(`[Lobby] Deleted: ${code} (host left or empty)`);
            return { wasHost: true };
        }
        console.log(`[Lobby] ${socketId} left ${code}`);
        return { lobby, wasHost: false };
    }
    selectFaction(socketId, faction) {
        const code = this.playerToLobby.get(socketId);
        if (!code)
            return { success: false, error: 'Not in a game' };
        const lobby = this.lobbies.get(code);
        if (!lobby)
            return { success: false, error: 'Game not found' };
        // Check if faction is already taken
        const factionTaken = lobby.players.some(p => p.faction === faction && p.odId !== socketId);
        if (factionTaken) {
            return { success: false, error: 'Faction already taken' };
        }
        const player = lobby.players.find(p => p.odId === socketId);
        if (player) {
            player.faction = faction;
            player.isReady = false; // Reset ready when changing faction
        }
        console.log(`[Lobby] ${socketId} selected ${faction} in ${code}`);
        return { success: true, lobby };
    }
    setPlayerReady(socketId, isReady) {
        const code = this.playerToLobby.get(socketId);
        if (!code)
            return { success: false, error: 'Not in a game' };
        const lobby = this.lobbies.get(code);
        if (!lobby)
            return { success: false, error: 'Game not found' };
        const player = lobby.players.find(p => p.odId === socketId);
        if (!player)
            return { success: false, error: 'Player not found' };
        if (!player.faction) {
            return { success: false, error: 'Must select a faction first' };
        }
        player.isReady = isReady;
        return { success: true, lobby };
    }
    canStartGame(code) {
        const lobby = this.lobbies.get(code);
        if (!lobby)
            return { canStart: false, reason: 'Game not found' };
        if (lobby.players.length < lobby.maxPlayers) {
            return { canStart: false, reason: `Waiting for ${lobby.maxPlayers - lobby.players.length} more player(s)` };
        }
        const allReady = lobby.players.every(p => p.isReady);
        if (!allReady) {
            return { canStart: false, reason: 'Not all players are ready' };
        }
        const allHaveFaction = lobby.players.every(p => p.faction !== null);
        if (!allHaveFaction) {
            return { canStart: false, reason: 'Not all players have selected a faction' };
        }
        return { canStart: true };
    }
    startGame(code) {
        const { canStart, reason } = this.canStartGame(code);
        if (!canStart) {
            return { success: false, error: reason };
        }
        const lobby = this.lobbies.get(code);
        if (!lobby)
            return { success: false, error: 'Game not found' };
        lobby.status = 'STARTING';
        return { success: true, lobby };
    }
    setGameInProgress(code) {
        const lobby = this.lobbies.get(code);
        if (lobby) {
            lobby.status = 'IN_PROGRESS';
        }
    }
    getLobby(code) {
        return this.lobbies.get(code.toUpperCase());
    }
    getPlayerLobby(socketId) {
        const code = this.playerToLobby.get(socketId);
        return code ? this.lobbies.get(code) : undefined;
    }
    markPlayerDisconnected(socketId) {
        const code = this.playerToLobby.get(socketId);
        if (!code)
            return undefined;
        const lobby = this.lobbies.get(code);
        if (!lobby)
            return undefined;
        const player = lobby.players.find(p => p.odId === socketId);
        if (player) {
            player.isConnected = false;
        }
        return lobby;
    }
    cleanupStaleLobbies() {
        const now = Date.now();
        const maxAge = 2 * 60 * 60 * 1000; // 2 hours
        for (const [code, lobby] of this.lobbies) {
            if (now - lobby.createdAt > maxAge && lobby.status === 'WAITING') {
                // Clean up player mappings
                for (const player of lobby.players) {
                    this.playerToLobby.delete(player.odId);
                }
                this.lobbies.delete(code);
                console.log(`[Lobby] Cleaned up stale lobby: ${code}`);
            }
        }
    }
}
exports.LobbyManager = LobbyManager;
