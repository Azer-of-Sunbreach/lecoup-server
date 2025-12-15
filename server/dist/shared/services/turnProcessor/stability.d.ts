import { Location, Character } from '../../types';
import { StabilityProcessingResult } from './types';
/**
 * Apply leader stability modifiers to locations.
 * Leaders with AVAILABLE status apply their stabilityPerTurn bonus to their current location,
 * BUT ONLY if the location is controlled by the leader's faction.
 *
 * @param locations - All locations
 * @param characters - All characters
 * @returns Updated locations with stability changes
 */
export declare function applyLeaderStabilityModifiers(locations: Location[], characters: Character[]): StabilityProcessingResult;
/**
 * Apply passive stability recovery for locations with very low taxes.
 *
 * Spec 5.1.2:
 * - Cities with VERY_LOW personal taxes: +5/turn if stability < 25%, +3/turn if 25-51%
 * - Rural with VERY_LOW food collection: +4/turn if stability < 25%, +3/turn if 25-51%
 *
 * @param locations - All locations
 * @returns Updated locations with stability recovery
 */
export declare function applyLowTaxStabilityRecovery(locations: Location[]): StabilityProcessingResult;
/**
 * Process all stability changes for a turn.
 * Combines leader modifiers and low tax recovery.
 *
 * @param locations - All locations
 * @param characters - All characters
 * @returns Updated locations
 */
export declare function processStability(locations: Location[], characters: Character[]): StabilityProcessingResult;
