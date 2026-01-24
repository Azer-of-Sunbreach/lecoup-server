/**
 * appeaseMinds.ts - Domain service for "Appease the Minds" governor policy
 *
 * Effect: Reduce resentment against player faction by 2 × Statesmanship per turn
 * Cost: Food (population-based tiers) - handled by processor
 * Auto-disable:
 * - Rural: If net production - food cost <= 0
 * - City: If food stock <= 0
 */
import { Location, Character } from '../../../types';
/**
 * Check if Appease the Minds policy is active for a location
 */
export declare function isAppeaseMindsActive(location: Location): boolean;
/**
 * Calculate the food cost for Appease the Minds based on population
 * Returns 0 if governor has MAN_OF_CHURCH ability
 */
export declare function getAppeaseMindsEffectiveCost(location: Location, governor: Character | undefined): number;
/**
 * Check if Appease the Minds should be disabled
 *
 * Conditions:
 * - Rural: Net food production - food cost would be <= 0
 * - City: Food stock is <= 0
 * - Resentment against faction is already 0
 */
export declare function shouldDisableAppeaseMinds(location: Location, ruralNetProduction: number, foodCost: number, resentmentAgainstFaction: number): {
    shouldDisable: boolean;
    reason?: 'negative_production' | 'no_stock' | 'no_resentment';
};
/**
 * Process Appease the Minds policy effect
 * Reduces resentment against the governor's faction by 2 × Statesmanship
 *
 * @param governor - The governing character
 * @param location - The location being governed
 * @returns Updated location with reduced resentment
 */
export declare function processAppeaseMinds(governor: Character, location: Location): Location;
