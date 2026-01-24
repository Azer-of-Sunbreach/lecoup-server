"use strict";
/**
 * denounceEnemies.ts - Domain service for "Denounce your enemies" governor policy
 *
 * Effect: Increase resentment against BOTH enemy factions by 1 × Statesmanship per turn
 * Cost: 10 gold/turn (free with Man of the Church)
 * Auto-disable: Revenue = 0 OR enemy resentment reaches 100
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDenounceEnemiesActive = isDenounceEnemiesActive;
exports.getEffectiveGoldCost = getEffectiveGoldCost;
exports.getEnemyFactions = getEnemyFactions;
exports.shouldDisableDenounceEnemies = shouldDisableDenounceEnemies;
exports.processDenounceEnemies = processDenounceEnemies;
const types_1 = require("../../../types");
const resentment_1 = require("../politics/resentment");
/**
 * Check if Denounce Enemies policy is active for a location
 */
function isDenounceEnemiesActive(location) {
    return location.governorPolicies?.[types_1.GovernorPolicy.DENOUNCE_ENEMIES] === true;
}
/**
 * Get the effective gold cost for a policy, accounting for Man of the Church ability.
 * Man of the Church makes gold-based policies free.
 */
function getEffectiveGoldCost(baseCost, governor) {
    if (governor?.stats.ability.includes('MAN_OF_CHURCH')) {
        return 0;
    }
    return baseCost;
}
/**
 * Get the two enemy factions (not controlling the location)
 */
function getEnemyFactions(controllingFaction) {
    const allFactions = [types_1.FactionId.NOBLES, types_1.FactionId.REPUBLICANS, types_1.FactionId.CONSPIRATORS];
    return allFactions.filter(f => f !== controllingFaction);
}
/**
 * Check if Denounce Enemies should be disabled
 *
 * Conditions:
 * - Faction revenue reaches 0
 * - Enemy resentment reaches 100 for BOTH enemies
 */
function shouldDisableDenounceEnemies(location, factionRevenue, controllingFaction) {
    // Disable if faction revenue is 0
    if (factionRevenue <= 0) {
        return { shouldDisable: true, reason: 'revenue_zero' };
    }
    // Check enemy resentment - disable if BOTH enemies are at 100
    const enemyFactions = getEnemyFactions(controllingFaction);
    const allAtMax = enemyFactions.every(faction => (0, resentment_1.getResentment)(location, faction) >= 100);
    if (allAtMax) {
        return { shouldDisable: true, reason: 'resentment_max' };
    }
    return { shouldDisable: false };
}
/**
 * Process Denounce Enemies policy effect
 * Increases resentment against both enemy factions by 1 × Statesmanship
 *
 * @param governor - The governing character
 * @param location - The location being governed
 * @returns Updated location with increased resentment
 */
function processDenounceEnemies(governor, location) {
    const statesmanship = governor.stats.statesmanship || 1;
    const resentmentIncrease = statesmanship; // 1 × Statesmanship per enemy faction
    // Get enemy factions
    const enemyFactions = getEnemyFactions(location.faction);
    // Increase resentment against both enemy factions
    let updatedLocation = location;
    for (const faction of enemyFactions) {
        updatedLocation = (0, resentment_1.modifyResentment)(updatedLocation, faction, resentmentIncrease);
    }
    return updatedLocation;
}
