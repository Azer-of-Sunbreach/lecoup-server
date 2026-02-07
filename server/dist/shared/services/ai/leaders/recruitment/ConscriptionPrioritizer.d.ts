/**
 * ConscriptionPrioritizer - AI Optimization for CONSCRIPTION Ability
 *
 * This utility helps the AI prioritize conscription actions.
 *
 * CONSCRIPTION ability: Separate action to recruit 500 men for 15g + 3 stability.
 *
 * The AI should:
 * 1. Identify locations where CONSCRIPTION is possible and safe.
 * 2. Priotize these locations to save gold (35g savings per regiment).
 * 3. AI Constraints:
 *    - Stability > 50% (to absorb the -3 hit safely)
 *    - No Famine (foodStock > 0)
 *
 * @module shared/services/ai/leaders/recruitment
 */
import { FactionId, GameState } from '../../../../types';
export interface ConscriptionLocation {
    locationId: string;
    locationName: string;
    leaderIds: string[];
    conscriptionCount: number;
    potentialSavings: number;
    currentStability: number;
}
export interface ConscriptionPrioritizationResult {
    prioritizedLocations: ConscriptionLocation[];
    totalActionsAvailable: number;
    totalPotentialSavings: number;
}
/**
 * Get a prioritized list of locations for CONSCRIPTION actions.
 *
 * The AI should verify these locations meet its safety standards (Stability > 50, No Famine)
 * before attempting to conscript.
 *
 * @param faction - The faction recruiting
 * @param state - Current game state
 * @returns Prioritized locations for conscription
 */
export declare function getConscriptionPrioritizedLocations(faction: FactionId, state: GameState): ConscriptionPrioritizationResult;
