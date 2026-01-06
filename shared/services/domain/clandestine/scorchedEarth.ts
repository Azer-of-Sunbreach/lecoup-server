/**
 * scorchedEarth.ts - Domain service for SCORCHED_EARTH character trait
 *
 * Leaders with this trait automatically execute burn and insurrection actions
 * when operating as clandestine agents in enemy territory.
 * These actions cannot be disabled by the player.
 */

import { Character, Location, LocationType } from '../../../types';
import { ClandestineActionId } from '../../../types/clandestineTypes';

/**
 * Check if a character has the SCORCHED_EARTH trait
 */
export function hasScorchedEarth(character: Character): boolean {
    return character.stats.traits?.includes('SCORCHED_EARTH') ?? false;
}

/**
 * Get the clandestine actions forced by SCORCHED_EARTH based on location type
 * - City: START_URBAN_FIRE + INCITE_NEUTRAL_INSURRECTIONS
 * - Rural: BURN_CROP_FIELDS + INCITE_NEUTRAL_INSURRECTIONS
 */
export function getScorchedEarthActions(locationType: 'CITY' | 'RURAL' | LocationType): ClandestineActionId[] {
    if (locationType === 'CITY') {
        return [
            ClandestineActionId.START_URBAN_FIRE,
            ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS
        ];
    } else {
        // Rural area
        return [
            ClandestineActionId.BURN_CROP_FIELDS,
            ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS
        ];
    }
}

/**
 * Check if a specific action is forced by SCORCHED_EARTH trait
 */
export function isActionForcedByScorchedEarth(
    character: Character,
    actionId: ClandestineActionId | string,
    locationType: 'CITY' | 'RURAL' | LocationType
): boolean {
    if (!hasScorchedEarth(character)) {
        return false;
    }

    const forcedActions = getScorchedEarthActions(locationType);
    return forcedActions.includes(actionId as ClandestineActionId);
}

/**
 * Calculate the total cost per turn for scorched earth actions
 * Used to check if leader has enough budget
 */
export function getScorchedEarthCostPerTurn(locationType: 'CITY' | 'RURAL' | LocationType): number {
    // Based on CLANDESTINE_ACTION_COSTS:
    // START_URBAN_FIRE: 25, BURN_CROP_FIELDS: 25
    // INCITE_NEUTRAL_INSURRECTIONS: 50
    return 25 + 50; // 75 gold per turn
}
