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
import { Location, FactionId, LogEntry } from '../../../types';
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
/**
 * Check if Make Examples policy is active for a location
 */
export declare function isMakeExamplesActive(location: Location): boolean;
/**
 * Calculate resentment increase based on casualty count
 */
export declare function calculateResentmentIncrease(casualties: number): number;
/**
 * Process "Make Examples" after an insurrection is repressed
 *
 * @param context - Information about the repression
 * @returns Results including updated location, casualties, and log
 */
export declare function processMakeExamples(context: RepressionContext): MakeExamplesResult;
/**
 * Check if neutral insurrections are currently blocked in a location
 *
 * @param location - Location to check
 * @param currentTurn - Current game turn
 * @returns true if neutral insurrections are blocked
 */
export declare function isNeutralInsurrectionBlocked(location: Location, currentTurn: number): boolean;
/**
 * Create a warning log when an incited neutral insurrection is blocked
 *
 * @param location - Location where insurrection was blocked
 * @param instigatorFaction - Faction that tried to incite
 * @param turn - Current turn
 * @returns Log entry for the instigator
 */
export declare function createBlockedInsurrectionLog(location: Location, instigatorFaction: FactionId, turn: number): LogEntry;
/**
 * Check if a character has the Iron Fist trait
 */
export declare function hasIronFistTrait(character: {
    stats: {
        traits?: string[];
    };
}): boolean;
/**
 * Apply Iron Fist policy to a location when governor with this trait takes office.
 * MAKE_EXAMPLES is automatically enabled and cannot be disabled.
 *
 * @param location - Location to update
 * @returns Updated location with MAKE_EXAMPLES enabled
 */
export declare function applyIronFistPolicy(location: Location): Location;
