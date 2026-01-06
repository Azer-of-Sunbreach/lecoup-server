import { FactionId, GameLobby } from './types';
export interface GameRoom {
    code: string;
    gameState: any;
    turnOrder: FactionId[];
    currentTurnIndex: number;
    playerFactions: Map<string, FactionId>;
    aiFaction: FactionId | null;
    pendingCombat: PendingCombat | null;
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
    deleteRoom(code: string): void;
}
