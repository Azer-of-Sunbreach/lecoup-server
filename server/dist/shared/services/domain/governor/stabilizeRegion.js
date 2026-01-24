"use strict";
/**
 * stabilizeRegion.ts - Domain service for "Stabilize Region" governor policy
 *
 * Effect: Increase stability by Statesmanship level per turn.
 * Cost: Handled by processor (10g/turn)
 * Auto-disable: Revenue=0 OR Stability=100
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldDisableStabilizeRegion = shouldDisableStabilizeRegion;
exports.processStabilizeRegion = processStabilizeRegion;
exports.isStabilizeRegionActive = isStabilizeRegionActive;
const types_1 = require("../../../types");
/**
 * Check if Stabilize Region should be disabled.
 */
function shouldDisableStabilizeRegion(location, factionRevenue, factionGold) {
    if (location.stability >= 100) {
        return { shouldDisable: true, reason: 'stability_max' };
    }
    if (factionRevenue <= 0) {
        return { shouldDisable: true, reason: 'revenue_zero' };
    }
    // Optional: Check if faction ran out of gold? 
    // Processor usually handles budget checks. 
    // But "Revenue reaches zero" is specific.
    return { shouldDisable: false };
}
/**
 * Process Stabilize Region policy effect.
 * Assumes cost has been paid.
 */
function processStabilizeRegion(governor, location, turn) {
    const statesmanship = governor.stats.statesmanship || 1;
    const stabilityIncrease = statesmanship;
    // Apply stability increase
    const newStability = Math.min(100, location.stability + stabilityIncrease);
    // We don't log every turn for success, only when it disables or notable events occur?
    // Clandestine actions usually log notable events.
    // For passive buffs, usually NO log unless something special happens.
    // So we just return updated location.
    return {
        location: {
            ...location,
            stability: newStability
        }
    };
}
// Actually isStabilizeRegionActive was defined in the old file. I should re-define it here or import it.
// I'll re-define it here for completeness.
function isStabilizeRegionActive(location) {
    return location.governorPolicies?.[types_1.GovernorPolicy.STABILIZE_REGION] === true;
}
