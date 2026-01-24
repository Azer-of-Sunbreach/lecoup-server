"use strict";
/**
 * Incite Neutral Insurrections - Clandestine Action Processor
 *
 * Generates neutral insurgent armies in enemy-controlled territories.
 *
 * @see ./insurrectionFormulas.ts - Centralized formulas for insurgent estimation
 * @module inciteNeutralInsurrections
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldDisableInciteNeutralInsurrections = shouldDisableInciteNeutralInsurrections;
exports.calculateInsurgentStrength = calculateInsurgentStrength;
exports.processInciteNeutralInsurrections = processInciteNeutralInsurrections;
const types_1 = require("../../../types");
const makeExamples_1 = require("../governor/makeExamples");
/**
 * Check if the action should be disabled (e.g. not enough budget)
 */
function shouldDisableInciteNeutralInsurrections(leaderBudget) {
    return leaderBudget <= 0;
}
/**
 * Calculate the number of insurgents to spawn
 */
function calculateInsurgentStrength(leader, location) {
    const population = location.population || 0;
    // Clandestine ops level (1-5), default to 1 if missing
    // Use safe access just in case
    const stats = leader.stats || {};
    const clandestineLevel = stats.clandestineOps || 1;
    // Resentment against the CONTROLLING faction
    // Default to 0 if no resentment entry exists
    const controllerFaction = location.faction;
    const resentmentObj = location.resentment;
    const resentment = resentmentObj?.[controllerFaction] || 0;
    const stability = location.stability || 0;
    // Formula:
    // City: (Pop * ClandestineOps * (Resentment + 1)) / (10000 * (1 + Stability/100))
    // Rural: (Pop * ClandestineOps * (Resentment + 1)) / (100000 * (1 + Stability/100))
    // Use string literal instead of Enum to avoid circular dependency runtime crashes
    const isCity = location.type === 'CITY';
    const divisorBase = isCity ? 10000 : 100000;
    const stabilityFactor = 1 + (stability / 100);
    const denominator = divisorBase * stabilityFactor;
    const numerator = population * clandestineLevel * (resentment + 1);
    // Use Math.ceil to ensure at least 1 insurgent if the result is positive but small
    const rawStrength = Math.ceil(numerator / denominator);
    // Cap at 1500
    return Math.min(1500, rawStrength);
}
/**
 * Process the Incite Neutral Insurrections action
 */
function processInciteNeutralInsurrections(leader, location, activeAction, turn) {
    const turnStarted = activeAction.turnStarted;
    // Should not happen if initialized correctly in processor, but safe fallback
    if (turnStarted === undefined)
        return {};
    const duration = turn - turnStarted;
    const uniqueId = Math.random().toString(36).substring(2, 9);
    // T1 (duration 1): Send Warning Log
    if (duration === 1) {
        const warningLog = {
            id: `incite-insurrection-warn-${turn}-${location.id}-${uniqueId}`,
            type: types_1.LogType.INSURRECTION,
            message: `Enemy agents have been reported stirring imminent neutral insurrections against us in ${location.name}!`,
            turn,
            visibleToFactions: [location.faction],
            baseSeverity: types_1.LogSeverity.CRITICAL,
            criticalForFactions: [location.faction],
            highlightTarget: { type: 'LOCATION', id: location.id }
        };
        return { log: warningLog };
    }
    // T2+ (duration >= 2): Generate Insurgents
    if (duration >= 2) {
        // === MAKE EXAMPLES BLOCKING CHECK ===
        // If neutral insurrections are blocked due to recent brutal repression
        if ((0, makeExamples_1.isNeutralInsurrectionBlocked)(location, turn)) {
            const governorName = location.neutralInsurrectionBlockedBy || "The Governor";
            const message = `${leader.name} failed to mobilize a civilian insurrection in ${location.name}. ${governorName}'s hanging are still lingering in the people's mind.`;
            // Log for the INSTIGATOR (Warning level)
            const feedbackLog = {
                id: `blocked-insurrection-${turn}-${location.id}`,
                type: types_1.LogType.INSURRECTION,
                message: message,
                turn,
                visibleToFactions: [leader.faction],
                baseSeverity: types_1.LogSeverity.WARNING,
                highlightTarget: { type: 'LOCATION', id: location.id }
            };
            // Refund the cost (50 gold)
            return { feedbackLog, refund: 50 };
        }
        const strength = calculateInsurgentStrength(leader, location);
        // If strength is 0 (e.g. 0 population), don't spawn
        if (strength <= 0)
            return {};
        const popDeduction = strength;
        const newArmy = {
            id: `neutral-insurgents-${turn}-${location.id}-${uniqueId}`,
            faction: types_1.FactionId.NEUTRAL,
            locationId: location.id,
            locationType: 'LOCATION',
            tripOriginId: location.id,
            stageIndex: 0,
            direction: 'FORWARD',
            roadId: null,
            strength: strength,
            isInsurgent: true,
            isSieging: false,
            isSpent: false,
            foodSourceId: 'forage',
            turnsUntilArrival: 0,
            lastSafePosition: { type: 'LOCATION', id: location.id },
            originLocationId: location.id, // Legacy field
            destinationId: null // Legacy field
        };
        const feedbackLog = {
            id: `incite-insurrection-spawn-${turn}-${location.id}-${uniqueId}`,
            type: types_1.LogType.INSURRECTION,
            message: `Our agents in ${location.name} have successfully incited ${strength} commoners to take up arms against the ${location.faction}!`,
            turn,
            visibleToFactions: [leader.faction],
            baseSeverity: types_1.LogSeverity.GOOD
        };
        return {
            newArmy,
            popDeduction,
            feedbackLog
        };
    }
    return {};
}
