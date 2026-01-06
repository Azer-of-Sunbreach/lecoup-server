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

import { Location, FactionId, GovernorPolicy, LogEntry, LogType, LogSeverity } from '../../../types';

// ============================================================================
// TYPES
// ============================================================================

export interface MakeExamplesResult {
    /** Updated location with casualties and blocking */
    location: Location;
    /** Civilian casualties added to death toll */
    casualties: number;
    /** Resentment increase applied */
    resentmentIncrease: number;
    /** Log entry describing the repression */
    log?: LogEntry;
}

export interface RepressionContext {
    /** Location where insurrection was repressed */
    location: Location;
    /** Faction that controls the region (defender) */
    controllerFaction: FactionId;
    /** Number of insurgents at battle start */
    insurgentStrength: number;
    /** Current turn number */
    turn: number;
    /** Name of the governor/leader enforcing the policy */
    governorName: string;
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Check if Make Examples policy is active for a location
 */
export function isMakeExamplesActive(location: Location): boolean {
    return location.governorPolicies?.[GovernorPolicy.MAKE_EXAMPLES] === true;
}

/**
 * Calculate resentment increase based on casualty count
 */
export function calculateResentmentIncrease(casualties: number): number {
    if (casualties >= 1000) return 30;
    if (casualties >= 500) return 20;
    return 10;
}

/**
 * Process "Make Examples" after an insurrection is repressed
 *
 * @param context - Information about the repression
 * @returns Results including updated location, casualties, and log
 */
export function processMakeExamples(context: RepressionContext): MakeExamplesResult {
    const { location, controllerFaction, insurgentStrength, turn, governorName } = context;

    // Calculate civilian casualties (insurgents / 20)
    const casualties = Math.floor(insurgentStrength / 20);

    // Calculate resentment increase
    const resentmentIncrease = calculateResentmentIncrease(casualties);

    // Create updated location
    const updatedLocation: Location = {
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
            [controllerFaction]: Math.min(
                100,
                (location.resentment?.[controllerFaction as keyof typeof location.resentment] || 0) + resentmentIncrease
            )
        } as Location['resentment']
    };

    // Create log entry
    const log: LogEntry = {
        id: `make-examples-${turn}-${location.id}`,
        type: LogType.INSURRECTION,
        message: `After crushing the insurrection in ${location.name}, the governor made brutal examples. ${casualties} civilians were executed, resentment increased.`,
        turn,
        visibleToFactions: [], // Visible to all
        baseSeverity: LogSeverity.WARNING,
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
export function isNeutralInsurrectionBlocked(location: Location, currentTurn: number): boolean {
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
export function createBlockedInsurrectionLog(
    location: Location,
    instigatorFaction: FactionId,
    turn: number
): LogEntry {
    return {
        id: `blocked-insurrection-${turn}-${location.id}`,
        type: LogType.INSURRECTION,
        message: `Neutral insurrection in ${location.name} failed due to the enemy's recent brutal repression!`,
        turn,
        visibleToFactions: [instigatorFaction],
        baseSeverity: LogSeverity.WARNING,
        highlightTarget: { type: 'LOCATION', id: location.id }
    };
}

// ============================================================================
// IRON FIST TRAIT FUNCTIONS
// ============================================================================

/**
 * Check if a character has the Iron Fist trait
 */
export function hasIronFistTrait(character: { stats: { traits?: string[] } }): boolean {
    return character.stats.traits?.includes('IRON_FIST') ?? false;
}

/**
 * Apply Iron Fist policy to a location when governor with this trait takes office.
 * MAKE_EXAMPLES is automatically enabled and cannot be disabled.
 *
 * @param location - Location to update
 * @returns Updated location with MAKE_EXAMPLES enabled
 */
export function applyIronFistPolicy(location: Location): Location {
    return {
        ...location,
        governorPolicies: {
            ...location.governorPolicies,
            [GovernorPolicy.MAKE_EXAMPLES]: true
        }
    };
}

