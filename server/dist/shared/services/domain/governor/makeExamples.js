"use strict";
/**
 * makeExamples.ts - Domain service for "Make Examples" governor policy
 *
 * When MAKE_EXAMPLES is active, after successfully repressing an insurrection:
 * 1. Civilian casualties = insurgent strength / 20
 * 2. Subtract casualties from location population
 * 3. Add casualties to global death toll
 * 4. Increase resentment based on casualties:
 *    - <500: +10
 *    - 500-999: +20
 *    - 1000+: +30
 * 5. Block neutral insurrections for 2 turns
 *
 * Supports all 4 insurrection types:
 * - Spontaneous neutral (low stability)
 * - Incited neutral (clandestine action)
 * - Grand insurrection (claimed by faction)
 * - Player incite (direct player action)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMakeExamplesActive = isMakeExamplesActive;
exports.calculateResentmentIncrease = calculateResentmentIncrease;
exports.processMakeExamples = processMakeExamples;
exports.isNeutralInsurrectionBlocked = isNeutralInsurrectionBlocked;
exports.createBlockedInsurrectionLog = createBlockedInsurrectionLog;
exports.hasIronFistTrait = hasIronFistTrait;
exports.applyIronFistPolicy = applyIronFistPolicy;
const types_1 = require("../../../types");
// ============================================================================
// CORE FUNCTIONS
// ============================================================================
/**
 * Check if Make Examples policy is active for a location
 */
function isMakeExamplesActive(location) {
    return location.governorPolicies?.[types_1.GovernorPolicy.MAKE_EXAMPLES] === true;
}
/**
 * Calculate resentment increase based on casualty count
 */
function calculateResentmentIncrease(casualties) {
    if (casualties >= 1000)
        return 30;
    if (casualties >= 500)
        return 20;
    return 10;
}
/**
 * Process "Make Examples" after an insurrection is repressed
 *
 * @param context - Information about the repression
 * @returns Results including updated location, casualties, and log
 */
function processMakeExamples(context) {
    const { location, controllerFaction, insurgentStrength, turn, governorName } = context;
    // Calculate civilian casualties (insurgents / 20)
    const casualties = Math.floor(insurgentStrength / 20);
    // Calculate resentment increase
    const resentmentIncrease = calculateResentmentIncrease(casualties);
    // Create updated location
    const updatedLocation = {
        ...location,
        // Reduce population
        population: Math.max(0, location.population - casualties),
        // Block neutral insurrections for 2 turns (current turn + 2)
        neutralInsurrectionBlockedUntil: turn + 2,
        // Store who did it
        neutralInsurrectionBlockedBy: governorName,
        // Update resentment against controller
        resentment: {
            ...location.resentment,
            [controllerFaction]: Math.min(100, (location.resentment?.[controllerFaction] || 0) + resentmentIncrease)
        }
    };
    // Create log entry
    const log = {
        id: `make-examples-${turn}-${location.id}`,
        type: types_1.LogType.INSURRECTION,
        message: `After crushing the insurrection in ${location.name}, the governor made brutal examples. ${casualties} civilians were executed, resentment increased.`,
        turn,
        visibleToFactions: [], // Visible to all
        baseSeverity: types_1.LogSeverity.WARNING,
        highlightTarget: { type: 'LOCATION', id: location.id }
    };
    return {
        location: updatedLocation,
        casualties,
        resentmentIncrease,
        log
    };
}
/**
 * Check if neutral insurrections are currently blocked in a location
 *
 * @param location - Location to check
 * @param currentTurn - Current game turn
 * @returns true if neutral insurrections are blocked
 */
function isNeutralInsurrectionBlocked(location, currentTurn) {
    const blockedUntil = location.neutralInsurrectionBlockedUntil;
    return blockedUntil !== undefined && currentTurn <= blockedUntil;
}
/**
 * Create a warning log when an incited neutral insurrection is blocked
 *
 * @param location - Location where insurrection was blocked
 * @param instigatorFaction - Faction that tried to incite
 * @param turn - Current turn
 * @returns Log entry for the instigator
 */
function createBlockedInsurrectionLog(location, instigatorFaction, turn) {
    return {
        id: `blocked-insurrection-${turn}-${location.id}`,
        type: types_1.LogType.INSURRECTION,
        message: `Neutral insurrection in ${location.name} failed due to the enemy's recent brutal repression!`,
        turn,
        visibleToFactions: [instigatorFaction],
        baseSeverity: types_1.LogSeverity.WARNING,
        highlightTarget: { type: 'LOCATION', id: location.id }
    };
}
// ============================================================================
// IRON FIST TRAIT FUNCTIONS
// ============================================================================
/**
 * Check if a character has the Iron Fist trait
 */
function hasIronFistTrait(character) {
    return character.stats.traits?.includes('IRON_FIST') ?? false;
}
/**
 * Apply Iron Fist policy to a location when governor with this trait takes office.
 * MAKE_EXAMPLES is automatically enabled and cannot be disabled.
 *
 * @param location - Location to update
 * @returns Updated location with MAKE_EXAMPLES enabled
 */
function applyIronFistPolicy(location) {
    return {
        ...location,
        governorPolicies: {
            ...location.governorPolicies,
            [types_1.GovernorPolicy.MAKE_EXAMPLES]: true
        }
    };
}
