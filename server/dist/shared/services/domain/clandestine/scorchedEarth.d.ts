/**
 * scorchedEarth.ts - Domain service for SCORCHED_EARTH character trait
 *
 * Leaders with this trait automatically execute burn and insurrection actions
 * when operating as clandestine agents in enemy territory.
 * These actions cannot be disabled by the player.
 */
import { Character, LocationType } from '../../../types';
import { ClandestineActionId } from '../../../types/clandestineTypes';
/**
 * Check if a character has the SCORCHED_EARTH trait
 */
export declare function hasScorchedEarth(character: Character): boolean;
/**
 * Get the clandestine actions forced by SCORCHED_EARTH based on location type
 * - City: START_URBAN_FIRE + INCITE_NEUTRAL_INSURRECTIONS
 * - Rural: BURN_CROP_FIELDS + INCITE_NEUTRAL_INSURRECTIONS
 */
export declare function getScorchedEarthActions(locationType: 'CITY' | 'RURAL' | LocationType): ClandestineActionId[];
/**
 * Check if a specific action is forced by SCORCHED_EARTH trait
 */
export declare function isActionForcedByScorchedEarth(character: Character, actionId: ClandestineActionId | string, locationType: 'CITY' | 'RURAL' | LocationType): boolean;
/**
 * Calculate the total cost per turn for scorched earth actions
 * Used to check if leader has enough budget
 */
export declare function getScorchedEarthCostPerTurn(locationType: 'CITY' | 'RURAL' | LocationType): number;
