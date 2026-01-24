"use strict";
/**
 * rationing.ts - Domain service for "Rationing" governor policy
 *
 * Effect: Reduces food consumption by 50% (implemented as supply bonus in territorialStats)
 * Downside: Reduces stability and increases resentment per turn
 * Not available: Rural areas
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRationingActive = isRationingActive;
exports.shouldDisableRationing = shouldDisableRationing;
exports.processRationing = processRationing;
const types_1 = require("../../../types");
const resentment_1 = require("../politics/resentment");
function isRationingActive(location) {
    return location.governorPolicies?.[types_1.GovernorPolicy.RATIONING] === true;
}
function shouldDisableRationing(location) {
    if (location.type === types_1.LocationType.RURAL) {
        return { shouldDisable: true, reason: 'rural_area' };
    }
    return { shouldDisable: false };
}
function processRationing(governor, location) {
    const statesmanship = governor.stats.statesmanship || 1;
    // Stability loss: 25 * (1 - statesmanship/10)
    const stabilityLoss = Math.floor(25 * (1 - (statesmanship / 10)));
    // Resentment gain: 20 * (1 - statesmanship/10)
    const resentmentGain = Math.floor(20 * (1 - (statesmanship / 10)));
    // Reduce stability
    let newStability = location.stability - stabilityLoss;
    newStability = Math.max(0, newStability); // Clamp to 0
    const locWithStability = {
        ...location,
        stability: newStability
    };
    // Increase resentment against governor's faction
    return (0, resentment_1.modifyResentment)(locWithStability, governor.faction, resentmentGain);
}
