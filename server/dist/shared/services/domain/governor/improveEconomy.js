"use strict";
/**
 * improveEconomy.ts - Domain service for "Improve Economic Conditions" policy
 *
 * Effects:
 * - In cities: Increases goldIncome by 2 * statesmanship
 * - In rural areas: Increases foodIncome by 2 * statesmanship
 * - Full-time policy: Mutually exclusive with Hunt Networks
 * - No cost (free policy)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isImproveEconomyActive = isImproveEconomyActive;
exports.calculateImproveEconomyBonus = calculateImproveEconomyBonus;
exports.getImproveEconomyBonusType = getImproveEconomyBonusType;
exports.processImproveEconomy = processImproveEconomy;
exports.shouldDisableImproveEconomy = shouldDisableImproveEconomy;
const types_1 = require("../../../types");
// ============================================================================
// HELPERS
// ============================================================================
/**
 * Check if Improve Economy is active in a location
 */
function isImproveEconomyActive(location) {
    return !!location.governorPolicies?.[types_1.GovernorPolicy.IMPROVE_ECONOMY];
}
/**
 * Calculate the economic bonus from Improve Economy
 * Formula: 2 * statesmanship
 * @returns The bonus amount (applied to goldIncome for cities, foodIncome for rural)
 */
function calculateImproveEconomyBonus(governor) {
    const statesmanship = governor.stats.statesmanship || 1;
    return 2 * statesmanship;
}
/**
 * Get the type of bonus for display purposes
 * @returns 'gold' for cities, 'food' for rural areas
 */
function getImproveEconomyBonusType(location) {
    return location.type === 'CITY' ? 'gold' : 'food';
}
/**
 * Process Improve Economy effect for a location
 * Note: This is typically called during turn processing in territorialStats
 * to calculate the effective income values.
 */
function processImproveEconomy(governor, location, turn) {
    if (!isImproveEconomyActive(location)) {
        return { location, goldBonus: 0, foodBonus: 0 };
    }
    const bonus = calculateImproveEconomyBonus(governor);
    if (location.type === 'CITY') {
        // City: bonus to gold income (handled in economy calculation)
        return {
            location,
            goldBonus: bonus,
            foodBonus: 0
        };
    }
    else {
        // Rural: bonus to food production (handled in food calculation)
        return {
            location,
            goldBonus: 0,
            foodBonus: bonus
        };
    }
}
/**
 * Check if Improve Economy should be disabled
 * Only disables if another full-time policy is active
 */
function shouldDisableImproveEconomy(location) {
    // Check if Hunt Networks is active (the only other full-time policy)
    const huntNetworksActive = !!location.governorPolicies?.[types_1.GovernorPolicy.HUNT_NETWORKS];
    return {
        shouldDisable: huntNetworksActive,
        reason: huntNetworksActive ? 'other_fulltime' : 'none'
    };
}
