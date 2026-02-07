"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConscriptionPrioritizedLocations = getConscriptionPrioritizedLocations;
const conscription_1 = require("../../../domain/military/conscription");
const constants_1 = require("../../../../constants");
// ============================================================================
// CONSTANTS
// ============================================================================
const AI_MIN_STABILITY_FOR_CONSCRIPTION = 50;
const SAVINGS_PER_ACTION = constants_1.RECRUIT_COST - conscription_1.CONSCRIPTION_GOLD_COST; // 50 - 15 = 35
// ============================================================================
// MAIN FUNCTIONS
// ============================================================================
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
function getConscriptionPrioritizedLocations(faction, state) {
    const prioritizedLocations = [];
    // Filter locations where conscription is logically possible and meets AI safety rules
    const potentialLocations = state.locations.filter(l => l.faction === faction &&
        l.type === 'CITY' && // Optimization: usually cities, but consistency check
        l.population >= 2000 && // Basic constraint
        l.stability > AI_MIN_STABILITY_FOR_CONSCRIPTION && // AI Constraint: High Stability
        l.foodStock > 0 // AI Constraint: No Famine
    );
    for (const location of potentialLocations) {
        // Check specific availability (leaders, turns, etc.)
        // Note: We don't call canConscript here because it requires full GameState with resources.
        // Budget validation is handled separately by the caller (handleRecruitment).
        const availableLeaders = (0, conscription_1.getAvailableConscriptionLeaders)(location.id, faction, state.characters);
        if (availableLeaders.length === 0)
            continue;
        // Additional check: population must meet minimum requirement
        if (location.population < conscription_1.CONSCRIPTION_MIN_POPULATION)
            continue;
        prioritizedLocations.push({
            locationId: location.id,
            locationName: location.name,
            leaderIds: availableLeaders.map(l => l.id),
            conscriptionCount: availableLeaders.length,
            potentialSavings: availableLeaders.length * SAVINGS_PER_ACTION,
            currentStability: location.stability
        });
    }
    // Sort by stability (highest first) - use excess stability rather than wasting gold?
    // Or maybe just by savings? 
    // Since gold is the bottleneck, sorting by potential savings (count) is better.
    // If savings equal, prefer higher stability buffer.
    prioritizedLocations.sort((a, b) => {
        if (b.potentialSavings !== a.potentialSavings) {
            return b.potentialSavings - a.potentialSavings;
        }
        return b.currentStability - a.currentStability;
    });
    const totalActions = prioritizedLocations.reduce((sum, loc) => sum + loc.conscriptionCount, 0);
    const totalSavings = totalActions * SAVINGS_PER_ACTION;
    return {
        prioritizedLocations,
        totalActionsAvailable: totalActions,
        totalPotentialSavings: totalSavings
    };
}
