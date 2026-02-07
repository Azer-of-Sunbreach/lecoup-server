"use strict";
/**
 * Recruitment Module - AI troop recruitment logic (Server wrapper)
 *
 * This file re-exports the shared recruitment logic for Server use.
 * The actual implementation is in shared/services/ai/economy/recruitment.ts.
 *
 * Now includes:
 * - CONSCRIPTION support (15g instead of 50g with CONSCRIPTION leaders)
 * - Insurrection defense prioritization
 * - Immediate dispatch to threatened locations
 *
 * @see shared/services/ai/economy/recruitment.ts - Shared implementation
 * @module recruitment
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRecruitment = handleRecruitment;
exports.handleRecruitmentLegacy = handleRecruitmentLegacy;
const economy_1 = require("../../../../shared/services/ai/economy");
/**
 * Handle troop recruitment for AI faction.
 *
 * Priority: Insurrection defense > Massing points > Low stability zones > High income
 * Supports CONSCRIPTION ability for discounted recruitment (15g instead of 50g).
 *
 * @param faction - Faction recruiting
 * @param locations - Locations array (modified in place)
 * @param armies - Armies array (modified in place)
 * @param roads - Roads array (for immediate dispatch)
 * @param budget - AI budget
 * @param profile - Faction personality
 * @param turn - Current game turn
 * @param currentGold - Available gold for spending
 * @param insurrectionAlerts - Optional alerts from insurrection defense module
 * @param characters - Optional leaders array for CONSCRIPTION discount check
 * @returns Object with remaining gold and updated characters
 */
function handleRecruitment(faction, locations, armies, roads, budget, profile, turn, currentGold, insurrectionAlerts = [], characters = []) {
    // Call shared implementation with minimal interface adapters
    const result = (0, economy_1.handleRecruitment)(faction, locations, armies, roads, { total: budget.total }, // RecruitmentBudgetInfo
    { aggressiveness: profile.aggressiveness }, // RecruitmentPersonalityInfo
    turn, currentGold, insurrectionAlerts, characters);
    return {
        remainingGold: result.remainingGold,
        updatedCharacters: result.updatedCharacters
    };
}
/**
 * Legacy function signature for backwards compatibility.
 * Use the full handleRecruitment with roads and characters for new code.
 *
 * @deprecated Use handleRecruitment with all parameters instead
 */
function handleRecruitmentLegacy(faction, locations, armies, budget, profile, turn, currentGold) {
    // Call with empty arrays for missing parameters
    const result = handleRecruitment(faction, locations, armies, [], // No roads
    budget, profile, turn, currentGold, [], // No insurrection alerts
    [] // No characters
    );
    return result.remainingGold;
}
