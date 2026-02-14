import { GameLobby, PlayerInfo, FactionId } from './types';
export declare class LobbyManager {
    private lobbies;
    private playerToLobby;
    constructor();
    createLobby(hostSocketId: string, maxPlayers: 2 | 3, nickname?: string): GameLobby;
    restoreLobby(code: string, players: PlayerInfo[], maxPlayers: 2 | 3): GameLobby;
    joinLobby(code: string, socketId: string, nickname?: string): {
        success: boolean;
        lobby?: GameLobby;
        error?: string;
    };
    leaveLobby(socketId: string): {
        lobby?: GameLobby;
        wasHost: boolean;
    };
    selectFaction(socketId: string, faction: FactionId): {
        success: boolean;
        lobby?: GameLobby;
        error?: string;
    };
    setPlayerReady(socketId: string, isReady: boolean): {
        success: boolean;
        lobby?: GameLobby;
        error?: string;
    };
    canStartGame(code: string): {
        canStart: boolean;
        reason?: string;
    };
    startGame(code: string): {
        success: boolean;
        lobby?: GameLobby;
        error?: string;
    };
    setGameInProgress(code: string): void;
    getLobby(code: string): GameLobby | undefined;
    getPlayerLobby(socketId: string): GameLobby | undefined;
    markPlayerDisconnected(socketId: string): GameLobby | undefined;
    private cleanupStaleLobbies;
}
