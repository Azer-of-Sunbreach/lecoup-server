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

// Resentment bounds
const MIN_RESENTMENT = 0;
const MAX_RESENTMENT = 100;

/**
 * Clamp resentment value to valid range [0, 100]
 */
export function clampResentment(value: number): number {
    return Math.max(MIN_RESENTMENT, Math.min(MAX_RESENTMENT, Math.round(value)));
}

/**
 * Get resentment level towards a faction in a location
 * Returns 0 for neutral faction (neutrals are never resented)
 */
export function getResentment(location: Location, faction: FactionId): number {
    // Neutrals are never resented
    if (faction === FactionId.NEUTRAL) {
        return 0;
    }

    // If resentment object doesn't exist, return 0
    if (!location.resentment) {
        return 0;
    }

    return location.resentment[faction] ?? 0;
}

/**
 * Create a new location with modified resentment towards a faction
 * Returns unchanged location if faction is NEUTRAL
 */
export function modifyResentment(
    location: Location,
    faction: FactionId,
    delta: number
): Location {
    // Never modify resentment against neutrals
    if (faction === FactionId.NEUTRAL) {
        return location;
    }

    // No change
    if (delta === 0) {
        return location;
    }

    // Get current resentment values, defaulting to 0
    const currentResentment = location.resentment ?? {
        [FactionId.NOBLES]: 0,
        [FactionId.CONSPIRATORS]: 0,
        [FactionId.REPUBLICANS]: 0,
    };

    const currentValue = currentResentment[faction] ?? 0;
    const newValue = clampResentment(currentValue + delta);

    return {
        ...location,
        resentment: {
            ...currentResentment,
            [faction]: newValue,
        },
    };
}

/**
 * Check if a location recently changed ownership (this turn)
 * Used to skip resentment modifications for new owners
 */
export function hasRecentlyChangedOwner(location: Location): boolean {
    // If previousFaction is undefined, this is the first turn or data is missing
    // Treat as no recent change
    if (location.previousFaction === undefined) {
        return false;
    }

    return location.faction !== location.previousFaction;
}

/**
 * Ensure a location has a properly initialized resentment object
 * This is useful for locations that were created before resentment was added
 */
export function initializeResentment(location: Location): Location {
    if (location.resentment) {
        return location;
    }

    return {
        ...location,
        resentment: {
            [FactionId.NOBLES]: 0,
            [FactionId.CONSPIRATORS]: 0,
            [FactionId.REPUBLICANS]: 0,
        },
    };
}
