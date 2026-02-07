"use strict";
/**
 * Burn Operations - Clandestine Action
 *
 * Logic for "Burn crop fields" and "Start urban fire".
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldDisableBurnOperation = shouldDisableBurnOperation;
exports.processBurnOperation = processBurnOperation;
const types_1 = require("../../../types");
/**
 * Check if should disable based on budget or resource level
 */
function shouldDisableBurnOperation(leaderBudget, resourceLevel, // Net Food or Total Revenue
threshold = 15) {
    return leaderBudget <= 0 || resourceLevel <= threshold;
}
/**
 * Process Burn Operation
 */
function processBurnOperation(actionId, leader, location, characters, turn) {
    const isUrban = actionId === 'START_URBAN_FIRE';
    const clandestineLevel = leader.stats.clandestineOps || 1;
    const discretion = leader.stats.discretion || 1;
    const stability = location.stability;
    // 1. Success Chance Calculation
    // Formula: 20% * Discretion - Stability%
    let chancePercent = (20 * discretion) - stability;
    // Governor Modifiers (Counter-Espionage)
    // Only apply reduction if governor has Hunt Networks policy active
    const governor = characters.find(c => c.locationId === location.id &&
        c.faction === location.faction &&
        c.status === types_1.CharacterStatus.GOVERNING);
    // Check if Hunt Networks policy is active (not just governor presence)
    const isHuntNetworksActive = location.governorPolicies?.HUNT_NETWORKS === true;
    if (governor && isHuntNetworksActive) {
        // Reduction: -10 - (5 * Statesmanship) to success chance
        const statesmanship = governor.stats.statesmanship || 1;
        const reduction = 10 + (5 * statesmanship);
        chancePercent -= reduction;
    }
    // Clamp to 0
    chancePercent = Math.max(0, chancePercent);
    // Roll (0-100)
    const roll = Math.random() * 100;
    if (roll > chancePercent) {
        // FAILURE
        // 50% chance of identification -> Resentment +30
        const identified = Math.random() < 0.5;
        if (identified) {
            return {
                burnedAmount: 0,
                resentmentIncrease: 30,
                feedbackLog: {
                    id: `burn-fail-${turn}-${leader.id}`,
                    type: types_1.LogType.LEADER, // or SABOTAGE?
                    message: `Sabotage failed! Our agents were identified attempting to start fires in ${location.name}. Resentment has increased.`,
                    turn,
                    visibleToFactions: [leader.faction],
                    baseSeverity: types_1.LogSeverity.WARNING,
                    i18nKey: 'burnFailIdentified',
                    i18nParams: { location: location.id }
                }
            };
        }
        else {
            return {
                burnedAmount: 0,
                resentmentIncrease: 0,
                feedbackLog: {
                    id: `burn-fail-${turn}-${leader.id}`,
                    type: types_1.LogType.LEADER,
                    message: `Sabotage failed! Our agents failed to start the fires in ${location.name} but remained undetected.`,
                    turn,
                    visibleToFactions: [leader.faction],
                    baseSeverity: types_1.LogSeverity.INFO,
                    i18nKey: 'burnFailUnidentified',
                    i18nParams: { location: location.id }
                }
            };
        }
    }
    // SUCCESS
    // Calculate Burned Amount
    // Rand(1, 5) * Clandestine Level
    const randomBase = Math.floor(Math.random() * 5) + 1;
    let amount = randomBase * clandestineLevel;
    // Cap at 15
    amount = Math.min(amount, 15);
    // Cap at Production (Total Revenue or Net Food)
    const totalResource = isUrban ? location.goldIncome : location.foodIncome;
    amount = Math.min(amount, Math.max(0, totalResource));
    if (amount <= 0) {
        // Nothing burned (maybe 0 income?)
        return { burnedAmount: 0, resentmentIncrease: 0 };
    }
    // Generate Logs
    const targetName = isUrban ? "manufactures" : "crop fields";
    const consequence = isUrban ? "Tax revenue has been lowered!" : "Food production has been lowered!";
    // Choose appropriate LogType
    const logType = isUrban ? types_1.LogType.ECONOMY : types_1.LogType.FAMINE;
    const log = {
        id: `burn-warning-${turn}-${leader.id}`,
        // LogType.WARNING does not exist, using appropriate category
        type: logType,
        message: `Enemy agents have burned ${targetName} in ${location.name}! ${consequence}`,
        turn,
        visibleToFactions: [location.faction],
        baseSeverity: types_1.LogSeverity.WARNING,
        highlightTarget: {
            type: 'LOCATION',
            id: location.id
        },
        i18nKey: isUrban ? 'burnUrbanWarning' : 'burnRuralWarning',
        i18nParams: { location: location.id }
    };
    const feedbackLog = {
        id: `burn-success-${turn}-${leader.id}`,
        type: types_1.LogType.LEADER,
        message: `Sabotage successful! We burned ${targetName} in ${location.name}, destroying ${amount} worth of resources.`,
        turn,
        visibleToFactions: [leader.faction],
        baseSeverity: types_1.LogSeverity.GOOD,
        i18nKey: isUrban ? 'burnUrbanSuccess' : 'burnRuralSuccess',
        i18nParams: { location: location.id, amount }
    };
    return {
        burnedAmount: amount,
        resentmentIncrease: 0,
        log,
        feedbackLog
    };
}
