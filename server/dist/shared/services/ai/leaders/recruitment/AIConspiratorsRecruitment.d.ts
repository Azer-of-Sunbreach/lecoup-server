/**
 * AI Conspirators Recruitment Service
 *
 * Orchestrates the full AI recruitment decision for CONSPIRATORS faction:
 * 1. Check if recruitment is needed (< 5 leaders, territories > leaders)
 * 2. Manage savings fund based on revenue matrix
 * 3. Evaluate available leaders when fund is ready
 * 4. Execute recruitment of best leader
 *
 * @module shared/services/ai/leaders/recruitment
 */
import { GameState, FactionId } from '../../../../types';
export interface AIRecruitmentResult {
    /** Updated game state after recruitment processing */
    updatedState: Partial<GameState>;
    /** Whether a leader was recruited this turn */
    leaderRecruited: boolean;
    /** ID of recruited leader (if any) */
    recruitedLeaderId?: string;
    /** Amount saved to fund this turn */
    amountSaved: number;
    /** Whether SEIZE_GOLD was used */
    usedSeizeGold: boolean;
    /** Log messages for debugging */
    logs: string[];
}
export interface RecruitmentBudgetAllocation {
    /** Amount to reserve from faction gold for recruitment fund */
    amountToReserve: number;
    /** Remaining gold after reservation */
    remainingGold: number;
    /** Whether SEIZE_GOLD should be executed */
    shouldSeizeGold: boolean;
    /** Location to seize gold from */
    seizeGoldLocationId?: string;
    /** Explanation for the allocation decision */
    reasoning: string;
}
/**
 * Calculate how much budget to reserve for leader recruitment.
 * Call this BEFORE other budget allocations (after siege budget).
 *
 * Returns the amount to deduct from available budget for the recruitment fund.
 */
export declare function calculateRecruitmentBudgetReservation(state: GameState, faction: FactionId): RecruitmentBudgetAllocation;
/**
 * Process AI recruitment for CONSPIRATORS faction.
 * Call this after budget allocation to:
 * 1. Execute SEIZE_GOLD if needed
 * 2. Update recruitment fund
 * 3. Recruit best leader if fund is ready
 */
export declare function processAIRecruitment(state: GameState, faction: FactionId, amountToSave: number, seizeGoldLocationId?: string): AIRecruitmentResult;
/**
 * Full recruitment processing for a turn.
 * Combines budget reservation calculation and execution.
 */
export declare function processConspiratorRecruitmentTurn(state: GameState): AIRecruitmentResult;
