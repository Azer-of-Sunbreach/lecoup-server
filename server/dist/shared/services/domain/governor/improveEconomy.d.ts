/**
 * improveEconomy.ts - Domain service for "Improve Economic Conditions" policy
 *
 * Effects:
 * - In cities: Increases goldIncome by 2 * statesmanship
 * - In rural areas: Increases foodIncome by 2 * statesmanship
 * - Full-time policy: Mutually exclusive with Hunt Networks
 * - No cost (free policy)
 */
import { Location, Character, LogEntry } from '../../../types';
/**
 * Check if Improve Economy is active in a location
 */
export declare function isImproveEconomyActive(location: Location): boolean;
/**
 * Calculate the economic bonus from Improve Economy
 * Formula: 2 * statesmanship
 * @returns The bonus amount (applied to goldIncome for cities, foodIncome for rural)
 */
export declare function calculateImproveEconomyBonus(governor: Character): number;
/**
 * Get the type of bonus for display purposes
 * @returns 'gold' for cities, 'food' for rural areas
 */
export declare function getImproveEconomyBonusType(location: Location): 'gold' | 'food';
export interface ImproveEconomyResult {
    location: Location;
    goldBonus: number;
    foodBonus: number;
    log?: LogEntry;
}
/**
 * Process Improve Economy effect for a location
 * Note: This is typically called during turn processing in territorialStats
 * to calculate the effective income values.
 */
export declare function processImproveEconomy(governor: Character, location: Location, turn: number): ImproveEconomyResult;
export interface DisableCheckResult {
    shouldDisable: boolean;
    reason: 'none' | 'other_fulltime';
}
/**
 * Check if Improve Economy should be disabled
 * Only disables if another full-time policy is active
 */
export declare function shouldDisableImproveEconomy(location: Location): DisableCheckResult;
