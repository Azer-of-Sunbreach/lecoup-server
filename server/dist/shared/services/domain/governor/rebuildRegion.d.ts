/**
 * rebuildRegion.ts - Domain service for "Rebuild the Region" governor policy
 *
 * Effect: Repairs sabotage damage (burnedFields for rural, burnedDistricts for cities)
 * Cost: 10g/turn
 * Availability: Only when there is damage to repair
 * Auto-disables: When faction revenue = 0 or no damage left
 */
import { Location, Character } from '../../../types';
/**
 * Check if Rebuild Region policy is currently active on a location
 */
export declare function isRebuildRegionActive(location: Location): boolean;
/**
 * Check if the location has any sabotage damage that can be repaired
 * Used by UI to determine button availability
 */
export declare function hasRebuildableDamage(location: Location): boolean;
/**
 * Get the current damage amount for display/logic
 */
export declare function getDamageAmount(location: Location): number;
/**
 * Check if the policy should be auto-disabled
 */
export declare function shouldDisableRebuildRegion(location: Location, factionRevenue: number): {
    shouldDisable: boolean;
    reason?: 'revenue_zero' | 'no_damage';
};
/**
 * Process the rebuild effect for one turn
 * Repairs random(1,5) * statesmanship damage, capped at 15
 */
export declare function processRebuildRegion(governor: Character, location: Location): Location;
