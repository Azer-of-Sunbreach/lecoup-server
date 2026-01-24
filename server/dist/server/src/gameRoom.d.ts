import { FactionId, GameLobby } from './types';
export interface GameRoom {
    code: string;
    gameState: any;
    turnOrder: FactionId[];
    currentTurnIndex: number;
    playerFactions: Map<string, FactionId>;
    aiFaction: FactionId | null;
    pendingCombat: PendingCombat | null;
    battlePhaseActive: boolean;
    battlePhaseTotal: number;
    battlePhaseResolved: number;
}
export interface PendingCombat {
    combatState: any;
    attackerSocketId: string;
    defenderSocketId: string | null;
    attackerChoice: 'FIGHT' | 'RETREAT' | 'SIEGE' | null;
    defenderChoice: 'FIGHT' | 'RETREAT_CITY' | null;
    siegeCost?: number;
}
export declare class GameRoomManager {
    private rooms;
    createRoom(lobby: GameLobby, initialGameState: any): GameRoom;
    getRoom(code: string): GameRoom | undefined;
    /**
     * Find gameCode for a socket ID by searching all rooms' playerFactions
     * This handles socket reconnection where socket.data.gameCode might be lost
     */
    getGameCodeForSocket(socketId: string): string | null;
    getCurrentFaction(code: string): FactionId | undefined;
    isPlayerTurn(code: string, socketId: string): boolean;
    getSocketForFaction(code: string, faction: FactionId): string | null;
    updateGameState(code: string, newState: any): void;
    advanceTurn(code: string): {
        newFaction: FactionId;
        newTurnNumber: number;
        isAITurn: boolean;
    } | null;
    initiateCombat(code: string, combatState: any, attackerSocketId: string, defenderFaction: FactionId): PendingCombat | null;
    setAttackerChoice(code: string, choice: 'FIGHT' | 'RETREAT' | 'SIEGE', siegeCost?: number): boolean;
    setDefenderChoice(code: string, choice: 'FIGHT' | 'RETREAT_CITY'): boolean;
    isCombatReady(code: string): boolean;
    clearCombat(code: string): void;
    startBattlePhase(code: string, totalBattles: number): void;
    incrementBattleResolved(code: string): number;
    endBattlePhase(code: string): void;
    getBattlePhaseInfo(code: string): {
        active: boolean;
        total: number;
        resolved: number;
    };
    deleteRoom(code: string): void;
}
