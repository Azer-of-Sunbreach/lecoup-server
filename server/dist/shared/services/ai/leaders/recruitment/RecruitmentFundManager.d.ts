/**
 * Recruitment Fund Manager
 *
 * Manages the dedicated fund for leader recruitment for CONSPIRATORS faction.
 * Implements the savings matrix based on revenues, territories, and living leaders.
 *
 * The fund is stored in aiState[faction].leaderRecruitmentFund to avoid
 * modifying the shared resources structure.
 *
 * @module shared/services/ai/leaders/recruitment
 */
import { GameState, FactionId, Location } from '../../../../types';
/** Target amount to save for leader recruitment */
export declare const RECRUITMENT_TARGET = 150;
/** Assumed remaining game duration for calculations */
export declare const ASSUMED_REMAINING_TURNS = 30;
/** Minimum stability for SEIZE_GOLD emergency action */
export declare const SEIZE_GOLD_MIN_STABILITY = 65;
/** Gold gained from SEIZE_GOLD action */
export declare const SEIZE_GOLD_AMOUNT = 50;
/** Stability penalty from SEIZE_GOLD action */
export declare const SEIZE_GOLD_STABILITY_PENALTY = 15;
/** Flag to enable/disable detailed recruitment logs */
export declare const ENABLE_RECRUITMENT_LOGS = true;
export interface RecruitmentFundState {
    /** Current amount saved in the recruitment fund */
    currentFund: number;
    /** Whether the fund has reached the target */
    isReady: boolean;
}
export interface SavingsCalculationResult {
    /** Amount to save this turn (0 if conditions not met) */
    amountToSave: number;
    /** Reason for the savings decision */
    reasoning: string;
    /** Whether SEIZE_GOLD should be used (0 leaders emergency) */
    shouldSeizeGold: boolean;
    /** Location ID to seize gold from (if applicable) */
    seizeGoldLocationId?: string;
}
export interface FundUpdateResult {
    /** Updated aiState with new fund value */
    updatedAiState: any;
    /** Amount actually saved */
    amountSaved: number;
    /** Whether recruitment is now possible */
    canRecruit: boolean;
    /** Log message for debugging */
    log: string;
}
/**
 * Calculate how much to save for leader recruitment based on the matrix.
 *
 * Matrix conditions:
 * - If living leaders >= 5: Save 0 (max leaders)
 * - If territories >= living leaders: Save 0 (enough leaders for territories)
 * - Otherwise, use revenue-based matrix
 *
 * Revenue Matrix:
 * | Revenues    | Territories | Leaders | Save Up To |
 * |-------------|-------------|---------|------------|
 * | >= 0        | 0           | 0       | 150        |
 * | <= 100      | 1-2         | 0       | 0          |
 * | <= 100      | 3+          | 0       | 50         |
 * | <= 100      | 1+          | 1+      | 0          |
 * | 101-200     | 1+          | 0       | 50         |
 * | 101-200     | 1+          | 1+      | 35         |
 * | > 200       | 1+          | 0       | 150        |
 * | > 200       | 1+          | 1+      | 50         |
 */
export declare function calculateSavingsAmount(revenues: number, territoriesCount: number, livingLeadersCount: number): {
    maxSavings: number;
    reasoning: string;
};
/**
 * Find the best location to SEIZE_GOLD from when faction has 0 leaders.
 * Only considers locations with stability >= 65%.
 * Returns the location with highest stability (safest to seize from).
 */
export declare function findSeizeGoldTarget(controlledLocations: Location[]): Location | null;
/**
 * Calculate how much additional gold is needed to reach target.
 */
export declare function calculateGoldNeeded(currentFund: number): number;
/**
 * Calculate the savings recommendation for this turn.
 */
export declare function calculateSavingsForTurn(state: GameState, faction: FactionId): SavingsCalculationResult;
/**
 * Update the recruitment fund with saved gold.
 * Call this after budget allocation to transfer gold to the fund.
 */
export declare function updateRecruitmentFund(state: GameState, faction: FactionId, amountToSave: number): FundUpdateResult;
/**
 * Consume the recruitment fund after successful recruitment.
 */
export declare function consumeRecruitmentFund(state: GameState, faction: FactionId): {
    updatedAiState: any;
    goldReturned: number;
};
/**
 * Get the current recruitment fund balance.
 */
export declare function getRecruitmentFund(state: GameState, faction: FactionId): RecruitmentFundState;
