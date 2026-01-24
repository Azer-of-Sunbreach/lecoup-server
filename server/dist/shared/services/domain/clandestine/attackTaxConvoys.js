"use strict";
/**
 * Attack Tax Convoys - Clandestine Action
 *
 * Logic for attacking tax convoys to steal gold.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldDisableAttackTaxConvoys = shouldDisableAttackTaxConvoys;
exports.processAttackTaxConvoys = processAttackTaxConvoys;
const types_1 = require("../../../types");
/**
 * Check if the action should be disabled (e.g. no budget)
 */
function shouldDisableAttackTaxConvoys(leaderBudget) {
    return leaderBudget <= 0;
}
/**
 * Process the Attack Tax Convoys action
 */
function processAttackTaxConvoys(leader, location, locations, turn) {
    const clandestineLevel = leader.stats.clandestineOps || 1;
    // 1. Success Chance: 10% * Clandestine Level
    const chance = 0.10 * clandestineLevel;
    const roll = Math.random();
    if (roll >= chance) {
        return { stolenAmount: 0 };
    }
    // 2. Identify Target Income Source
    // If in Rural area, target is the attached City.
    // If in City, target is the City itself.
    let targetLocation = location;
    if (location.type === types_1.LocationType.RURAL && location.linkedLocationId) {
        const linkedCity = locations.find(l => l.id === location.linkedLocationId);
        if (linkedCity) {
            targetLocation = linkedCity;
        }
    }
    // 3. Calculate Stolen Amount
    // Random amount [1, 5] * Clandestine Level
    const randomBase = Math.floor(Math.random() * 5) + 1; // 1 to 5
    const potentialAmount = randomBase * clandestineLevel;
    // Cap at target location income
    const maxAmount = Math.max(0, targetLocation.goldIncome);
    const stolenAmount = Math.min(potentialAmount, maxAmount);
    if (stolenAmount <= 0) {
        return { stolenAmount: 0 };
    }
    const controllerFaction = location.faction;
    // 4. Generate Logs
    // GOOD Log for Leader
    const successLog = {
        id: `attack-tax-success-${turn}-${leader.id}`,
        type: types_1.LogType.ECONOMY, // Or LEADER/CRIME? Using ECONOMY fits "Stolen gold". Or CONVOY? User didn't specify category, but msg implies success.
        message: `${stolenAmount} gold stolen from the enemy in ${location.name} and added to ${leader.name}'s cell treasury.`,
        turn,
        visibleToFactions: [leader.faction],
        baseSeverity: types_1.LogSeverity.GOOD
    };
    // Warning Log for Victim (50% Chance)
    let warningLog;
    if (Math.random() < 0.5) {
        warningLog = {
            id: `attack-tax-warning-${turn}-${leader.id}`,
            // LogType.WARNING does not exist, using ECONOMY as it relates to tax convoys
            type: types_1.LogType.ECONOMY,
            message: `Enemy agents have attacked our tax convoys in ${location.name}!`,
            turn,
            visibleToFactions: [controllerFaction],
            baseSeverity: types_1.LogSeverity.WARNING,
            highlightTarget: {
                type: 'LOCATION',
                id: location.id
            }
        };
    }
    return {
        stolenAmount,
        log: successLog,
        warningLog
    };
}
