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

import { GameState, FactionId, Location, CharacterStatus } from '../../../../types';
import { CONSPIRATORS_RECRUITMENT_COST } from '../../../domain/leaders/conspiratorsRecruitment';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Target amount to save for leader recruitment */
export const RECRUITMENT_TARGET = CONSPIRATORS_RECRUITMENT_COST; // 150

/** Assumed remaining game duration for calculations */
export const ASSUMED_REMAINING_TURNS = 30;

/** Minimum stability for SEIZE_GOLD emergency action */
export const SEIZE_GOLD_MIN_STABILITY = 65;

/** Gold gained from SEIZE_GOLD action */
export const SEIZE_GOLD_AMOUNT = 50;

/** Stability penalty from SEIZE_GOLD action */
export const SEIZE_GOLD_STABILITY_PENALTY = 15;

/** Flag to enable/disable detailed recruitment logs */
export const ENABLE_RECRUITMENT_LOGS = true;

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// SAVINGS MATRIX
// ============================================================================

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
export function calculateSavingsAmount(
    revenues: number,
    territoriesCount: number,
    livingLeadersCount: number
): { maxSavings: number; reasoning: string } {
    // Pre-condition: Already at max leaders
    if (livingLeadersCount >= 5) {
        return { maxSavings: 0, reasoning: 'Max leaders (5) already alive' };
    }

    // Pre-condition: Enough leaders for territories
    if (territoriesCount > 0 && territoriesCount <= livingLeadersCount) {
        return { maxSavings: 0, reasoning: `Enough leaders (${livingLeadersCount}) for territories (${territoriesCount})` };
    }

    // Special case: 0 territories, 0 leaders - desperate save
    if (territoriesCount === 0 && livingLeadersCount === 0) {
        return { maxSavings: 150, reasoning: 'Emergency: 0 territories, 0 leaders - save max' };
    }

    // Revenue-based matrix
    if (revenues <= 100) {
        if (territoriesCount <= 2 && livingLeadersCount === 0) {
            return { maxSavings: 0, reasoning: 'Low revenues (<=100), few territories (1-2), no leaders' };
        }
        if (territoriesCount >= 3 && livingLeadersCount === 0) {
            return { maxSavings: 50, reasoning: 'Low revenues (<=100), 3+ territories, no leaders' };
        }
        if (livingLeadersCount >= 1) {
            return { maxSavings: 0, reasoning: 'Low revenues (<=100), has leaders - prioritize other spending' };
        }
    }

    if (revenues > 100 && revenues <= 200) {
        if (livingLeadersCount === 0) {
            return { maxSavings: 50, reasoning: 'Medium revenues (101-200), no leaders' };
        }
        return { maxSavings: 35, reasoning: 'Medium revenues (101-200), has leaders' };
    }

    if (revenues > 200) {
        if (livingLeadersCount === 0) {
            return { maxSavings: 150, reasoning: 'High revenues (>200), no leaders - save max' };
        }
        return { maxSavings: 50, reasoning: 'High revenues (>200), has leaders' };
    }

    return { maxSavings: 0, reasoning: 'No matching condition' };
}

// ============================================================================
// SEIZE GOLD LOGIC
// ============================================================================

/**
 * Find the best location to SEIZE_GOLD from when faction has 0 leaders.
 * Only considers locations with stability >= 65%.
 * Returns the location with highest stability (safest to seize from).
 */
export function findSeizeGoldTarget(
    controlledLocations: Location[]
): Location | null {
    const validTargets = controlledLocations.filter(loc => 
        loc.stability >= SEIZE_GOLD_MIN_STABILITY &&
        !loc.actionsTaken?.seizeGold // Not already seized this turn
    );

    if (validTargets.length === 0) return null;

    // Sort by stability descending (prefer most stable)
    return validTargets.sort((a, b) => b.stability - a.stability)[0];
}

/**
 * Calculate how much additional gold is needed to reach target.
 */
export function calculateGoldNeeded(currentFund: number): number {
    return Math.max(0, RECRUITMENT_TARGET - currentFund);
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Calculate the savings recommendation for this turn.
 */
export function calculateSavingsForTurn(
    state: GameState,
    faction: FactionId
): SavingsCalculationResult {
    // Get faction data
    const factionLocations = state.locations.filter(l => l.faction === faction);
    const territoriesCount = factionLocations.length;
    
    const livingLeaders = state.characters.filter(
        c => c.faction === faction && c.status !== CharacterStatus.DEAD
    );
    const livingLeadersCount = livingLeaders.length;

    // Calculate revenues (sum of gold income from all controlled locations)
    const revenues = factionLocations.reduce((sum, loc) => sum + (loc.goldIncome || 0), 0);

    // Get current fund
    const currentFund = state.aiState?.[faction]?.leaderRecruitmentFund || 0;
    const goldNeeded = calculateGoldNeeded(currentFund);

    // If fund is already at target, no savings needed
    if (goldNeeded <= 0) {
        return {
            amountToSave: 0,
            reasoning: 'Fund already at target (150g)',
            shouldSeizeGold: false
        };
    }

    // Calculate matrix-based savings
    const { maxSavings, reasoning } = calculateSavingsAmount(revenues, territoriesCount, livingLeadersCount);

    // Cap savings at what's still needed
    const amountToSave = Math.min(maxSavings, goldNeeded);

    // Check for SEIZE_GOLD emergency (0 leaders)
    let shouldSeizeGold = false;
    let seizeGoldLocationId: string | undefined;

    if (livingLeadersCount === 0 && amountToSave > 0) {
        // Check if we can reach 150 faster with SEIZE_GOLD
        const seizeTarget = findSeizeGoldTarget(factionLocations);
        if (seizeTarget && currentFund + amountToSave + SEIZE_GOLD_AMOUNT >= RECRUITMENT_TARGET) {
            // SEIZE_GOLD would help reach target this turn
            shouldSeizeGold = true;
            seizeGoldLocationId = seizeTarget.id;
        }
    }

    return {
        amountToSave,
        reasoning: `${reasoning} (fund: ${currentFund}/${RECRUITMENT_TARGET})`,
        shouldSeizeGold,
        seizeGoldLocationId
    };
}

/**
 * Update the recruitment fund with saved gold.
 * Call this after budget allocation to transfer gold to the fund.
 */
export function updateRecruitmentFund(
    state: GameState,
    faction: FactionId,
    amountToSave: number
): FundUpdateResult {
    const currentFund = state.aiState?.[faction]?.leaderRecruitmentFund || 0;
    const factionGold = state.resources[faction]?.gold || 0;

    // Don't save more than available
    const actualSavings = Math.min(amountToSave, factionGold);
    const newFund = currentFund + actualSavings;
    const canRecruit = newFund >= RECRUITMENT_TARGET;

    const updatedAiState = {
        ...state.aiState,
        [faction]: {
            ...state.aiState?.[faction],
            leaderRecruitmentFund: newFund
        }
    };

    const logMessage = `[AI RECRUIT FUND ${faction}] Saved ${actualSavings}g (total: ${newFund}/${RECRUITMENT_TARGET}). Can recruit: ${canRecruit}`;
    
    if (ENABLE_RECRUITMENT_LOGS && actualSavings > 0) {
        console.log(logMessage);
    }

    return {
        updatedAiState,
        amountSaved: actualSavings,
        canRecruit,
        log: logMessage
    };
}

/**
 * Consume the recruitment fund after successful recruitment.
 */
export function consumeRecruitmentFund(
    state: GameState,
    faction: FactionId
): { updatedAiState: any; goldReturned: number } {
    const currentFund = state.aiState?.[faction]?.leaderRecruitmentFund || 0;
    
    // Return any excess gold beyond the recruitment cost
    const goldReturned = Math.max(0, currentFund - RECRUITMENT_TARGET);

    const updatedAiState = {
        ...state.aiState,
        [faction]: {
            ...state.aiState?.[faction],
            leaderRecruitmentFund: 0 // Reset fund after recruitment
        }
    };

    return {
        updatedAiState,
        goldReturned
    };
}

/**
 * Get the current recruitment fund balance.
 */
export function getRecruitmentFund(state: GameState, faction: FactionId): RecruitmentFundState {
    const currentFund = state.aiState?.[faction]?.leaderRecruitmentFund || 0;
    return {
        currentFund,
        isReady: currentFund >= RECRUITMENT_TARGET
    };
}
