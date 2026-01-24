"use strict";
/**
 * rebuildRegion.ts - Domain service for "Rebuild the Region" governor policy
 *
 * Effect: Repairs sabotage damage (burnedFields for rural, burnedDistricts for cities)
 * Cost: 10g/turn
 * Availability: Only when there is damage to repair
 * Auto-disables: When faction revenue = 0 or no damage left
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRebuildRegionActive = isRebuildRegionActive;
exports.hasRebuildableDamage = hasRebuildableDamage;
exports.getDamageAmount = getDamageAmount;
exports.shouldDisableRebuildRegion = shouldDisableRebuildRegion;
exports.processRebuildRegion = processRebuildRegion;
const types_1 = require("../../../types");
/**
 * Check if Rebuild Region policy is currently active on a location
 */
function isRebuildRegionActive(location) {
    return location.governorPolicies?.[types_1.GovernorPolicy.REBUILD_REGION] === true;
}
/**
 * Check if the location has any sabotage damage that can be repaired
 * Used by UI to determine button availability
 */
function hasRebuildableDamage(location) {
    if (location.type === types_1.LocationType.RURAL) {
        return (location.burnedFields || 0) > 0;
    }
    else {
        // City
        return (location.burnedDistricts || 0) > 0;
    }
}
/**
 * Get the current damage amount for display/logic
 */
function getDamageAmount(location) {
    if (location.type === types_1.LocationType.RURAL) {
        return location.burnedFields || 0;
    }
    else {
        return location.burnedDistricts || 0;
    }
}
/**
 * Check if the policy should be auto-disabled
 */
function shouldDisableRebuildRegion(location, factionRevenue) {
    // Check faction revenue
    if (factionRevenue <= 0) {
        return { shouldDisable: true, reason: 'revenue_zero' };
    }
    // Check if there's still damage to repair
    if (!hasRebuildableDamage(location)) {
        return { shouldDisable: true, reason: 'no_damage' };
    }
    return { shouldDisable: false };
}
/**
 * Process the rebuild effect for one turn
 * Repairs random(1,5) * statesmanship damage, capped at 15
 */
function processRebuildRegion(governor, location) {
    const statesmanship = governor.stats.statesmanship || 1;
    // Random amount between 1 and 5
    const randomRoll = Math.floor(Math.random() * 5) + 1;
    // Calculate repair amount: random * statesmanship, capped at 15
    const repairAmount = Math.min(randomRoll * statesmanship, 15);
    if (location.type === types_1.LocationType.RURAL) {
        const currentDamage = location.burnedFields || 0;
        const newDamage = Math.max(0, currentDamage - repairAmount);
        return {
            ...location,
            burnedFields: newDamage
        };
    }
    else {
        // City
        const currentDamage = location.burnedDistricts || 0;
        const newDamage = Math.max(0, currentDamage - repairAmount);
        return {
            ...location,
            burnedDistricts: newDamage
        };
    }
}
