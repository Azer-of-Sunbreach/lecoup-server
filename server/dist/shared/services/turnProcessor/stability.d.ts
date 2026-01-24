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
 * Apply stability penalties for locations with very high taxes/food collection.
 * Only applies if NO leader of the controlling faction is present.
 *
 * Spec:
 * - Cities with VERY_HIGH personal taxes + no leader: -5/turn
 * - Cities with VERY_HIGH commercial taxes + no leader: -2/turn
 * - Rural with VERY_HIGH food collection + no leader: -4/turn
 *
 * @param locations - All locations
 * @param characters - All characters
 * @param turn - Current turn number
 * @returns Updated locations and warning logs
 */
export declare function applyHighTaxStabilityPenalty(locations: Location[], characters: Character[], turn: number): StabilityProcessingResult;
/**
 * Process all stability changes for a turn.
 * Combines leader modifiers, low tax recovery, and high tax penalties.
 *
 * @param locations - All locations
 * @param characters - All characters
 * @param turn - Current turn number
 * @returns Updated locations and logs
 */
export declare function processStability(locations: Location[], characters: Character[], turn?: number): StabilityProcessingResult;
