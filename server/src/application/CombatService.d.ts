/**
 * Combat Service - Application Layer
 * Encapsulates combat-related use cases: initiate, handle choices, resolve
 */
import { GameRoomManager, PendingCombat } from '../gameRoom';
import { FactionId, CombatState } from '../../../shared/types';
export interface CombatInitResult {
    initiated: boolean;
    pendingCombat: PendingCombat | null;
    attackerSocketId: string | null;
    defenderSocketId: string | null;
}
export interface CombatChoiceResult {
    ready: boolean;
    resolved: boolean;
    finalChoice?: 'FIGHT' | 'RETREAT' | 'RETREAT_CITY' | 'SIEGE';
    updatedState?: any;
    waitingFor?: 'ATTACKER' | 'DEFENDER';
}
/**
 * CombatService handles all combat-related use cases
 */
export declare class CombatService {
    private gameRoomManager;
    constructor(gameRoomManager: GameRoomManager);
    /**
     * Initiate a combat between attacker and defender
     */
    initiateCombat(code: string, combat: CombatState, attackerSocketId: string, defenderFaction: FactionId): CombatInitResult;
    /**
     * Handle a combat choice from attacker or defender
     */
    handleChoice(code: string, socketId: string, choice: 'FIGHT' | 'RETREAT' | 'RETREAT_CITY' | 'SIEGE', siegeCost?: number): CombatChoiceResult;
    /**
     * Resolve combat when both choices are made
     */
    resolveCombat(code: string): CombatChoiceResult;
    /**
     * Set AI attacker choice (always FIGHT)
     */
    setAIAttackerChoice(code: string): void;
    /**
     * Get pending combat for a room
     */
    getPendingCombat(code: string): PendingCombat | null;
}
