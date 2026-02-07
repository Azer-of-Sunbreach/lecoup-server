/**
 * Free Trader Domain Service
 *
 * Implements the FREE_TRADER character trait logic.
 * Each FREE_TRADER leader in a region lowers the maximum tax and food collection levels by one.
 *
 * Pattern: Reactive/polling approach (same as MANAGER/SMUGGLER)
 * - Effects are computed at calculation time by querying current character state
 * - No event-driven triggers on leader movement needed
 */
import { Location, Character, FactionId, ManagementLevel } from '../../../types';
/**
 * Count FREE_TRADER leaders from a given faction present at a location.
 * Mirrors MANAGER/SMUGGLER detection pattern from territorialStats.ts.
 *
 * Only counts leaders who are:
 * - At the specified location
 * - Of the specified faction
 * - Not DEAD or MOVING (in transit)
 * - Have the FREE_TRADER trait
 */
export declare function countFreeTradersAtLocation(locationId: string, faction: FactionId, characters: Character[]): number;
/**
 * Get the maximum ManagementLevel allowed based on FREE_TRADER count.
 *
 * 0 FREE_TRADERS: VERY_HIGH (index 4)
 * 1 FREE_TRADER: HIGH (index 3)
 * 2 FREE_TRADERS: NORMAL (index 2)
 * 3 FREE_TRADERS: LOW (index 1)
 * 4+ FREE_TRADERS: VERY_LOW (index 0, floor)
 */
export declare function getMaxManagementLevel(freeTraderCount: number): ManagementLevel;
/**
 * Clamp a given level to the max allowed by FREE_TRADER count.
 * If the current level exceeds the cap, returns the capped level.
 * Otherwise, returns the current level unchanged.
 */
export declare function clampToMaxLevel(currentLevel: ManagementLevel, freeTraderCount: number): ManagementLevel;
/**
 * Get the effective tax level for a location, considering FREE_TRADER caps.
 * This is a convenience function for use in revenue calculations.
 */
export declare function getEffectiveTaxLevel(location: Location, characters: Character[]): ManagementLevel;
/**
 * Get the effective trade tax level for a location, considering FREE_TRADER caps.
 */
export declare function getEffectiveTradeTaxLevel(location: Location, characters: Character[]): ManagementLevel;
/**
 * Get the effective food collection level for a location, considering FREE_TRADER caps.
 */
export declare function getEffectiveFoodCollectionLevel(location: Location, characters: Character[]): ManagementLevel;
/**
 * Result of enforcing Free Trader limits
 */
export interface FreeTraderEnforcementResult {
    location: Location;
    modified: boolean;
    modifications: string[];
}
/**
 * Enforce Free Trader limits on a location.
 * If current levels exceed the max allowed by present Free Traders, clamp them down.
 *
 * Used:
 * 1. After movement phase in turn processing (for arriving leaders)
 * 2. After immediate leader move
 */
export declare function enforceFreeTraderLimits(location: Location, characters: Character[]): FreeTraderEnforcementResult;
