import { FactionId, Character, Location } from '../../../types';
/**
 * Calculate minimum garrison based on stability, population, and LEGENDARY leader presence.
 *
 * Formula: (10 * (Population/100000)) * (120 - Stability) + 100
 * - Minimum 500, Maximum 4000
 * - Strategic locations have minimum 1000
 * - LEGENDARY leaders can substitute for garrison (returns 0)
 *
 * @param location - The location to calculate garrison for
 * @param characters - All characters (to check for LEGENDARY ability)
 * @param faction - The faction we're calculating for
 * @returns Minimum garrison requirement (0-4000)
 */
export declare function getMinGarrison(location: Location | undefined, characters: Character[], faction: FactionId): number;
