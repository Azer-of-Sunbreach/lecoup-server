import { FactionId, Character, Location, Road } from '../../../../shared/types';
/**
 * Calculate minimum garrison based on stability, population, and LEGENDARY leader presence.
 *
 * Formula: (10 * (Population/100000)) * (120 - Stability) + 100
 * - Minimum 500, Maximum 4000
 * - Strategic locations have minimum 1000 garrison
 * - Frontier locations (adjacent to enemy) have minimum 1000 garrison
 * - LEGENDARY leaders can substitute for garrison (returns 0)
 *
 * @param location - The location to calculate garrison for
 * @param characters - All characters (to check for LEGENDARY ability)
 * @param faction - The faction we're calculating for
 * @param roads - Optional roads array for frontier detection
 * @param locations - Optional locations array for frontier detection
 * @returns Minimum garrison requirement (0-4000)
 */
export declare function getMinGarrison(location: Location | undefined, characters: Character[], faction: FactionId, roads?: Road[], locations?: Location[]): number;
