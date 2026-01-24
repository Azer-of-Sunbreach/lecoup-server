/**
 * Resentment Domain Service - Core functions for resentment manipulation
 *
 * Resentment is a per-faction value (0-100) tracking how much a location's
 * population resents each faction. Higher resentment makes insurrections
 * more likely and governance harder.
 *
 * Rules:
 * - Resentment against NEUTRAL faction is always 0
 * - Resentment is clamped between 0 and 100
 */
import { Location, FactionId } from '../../../types';
/**
 * Clamp resentment value to valid range [0, 100]
 */
export declare function clampResentment(value: number): number;
/**
 * Get resentment level towards a faction in a location
 * Returns 0 for neutral faction (neutrals are never resented)
 */
export declare function getResentment(location: Location, faction: FactionId): number;
/**
 * Create a new location with modified resentment towards a faction
 * Returns unchanged location if faction is NEUTRAL
 */
export declare function modifyResentment(location: Location, faction: FactionId, delta: number): Location;
/**
 * Check if a location recently changed ownership (this turn)
 * Used to skip resentment modifications for new owners
 */
export declare function hasRecentlyChangedOwner(location: Location): boolean;
/**
 * Ensure a location has a properly initialized resentment object
 * This is useful for locations that were created before resentment was added
 */
export declare function initializeResentment(location: Location): Location;
