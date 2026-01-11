/**
 * appeaseMinds.ts - Domain service for "Appease the Minds" governor policy
 *
 * Effect: Reduce resentment against player faction by 2 × Statesmanship per turn
 * Cost: Food (population-based tiers) - handled by processor
 * Auto-disable:
 * - Rural: If net production - food cost <= 0
 * - City: If food stock <= 0
 */

import { Location, Character, GovernorPolicy, FactionId, LocationType } from '../../../types';
import { modifyResentment } from '../politics/resentment';
import { getAppeaseFoodCost } from '../../../data/gameConstants';

/**
 * Check if Appease the Minds policy is active for a location
 */
export function isAppeaseMindsActive(location: Location): boolean {
    return location.governorPolicies?.[GovernorPolicy.APPEASE_MINDS] === true;
}

/**
 * Calculate the food cost for Appease the Minds based on population
 * Returns 0 if governor has MAN_OF_CHURCH ability
 */
export function getAppeaseMindsEffectiveCost(
    location: Location,
    governor: Character | undefined
): number {
    // Man of the Church ability makes this policy free
    if (governor?.stats.ability.includes('MAN_OF_CHURCH')) {
        return 0;
    }
    return getAppeaseFoodCost(location.population);
}

/**
 * Check if Appease the Minds should be disabled
 * 
 * Conditions:
 * - Rural: Net food production - food cost would be <= 0
 * - City: Food stock is <= 0
 * - Resentment against faction is already 0
 */
export function shouldDisableAppeaseMinds(
    location: Location,
    ruralNetProduction: number,
    foodCost: number,
    resentmentAgainstFaction: number
): { shouldDisable: boolean; reason?: 'negative_production' | 'no_stock' | 'no_resentment' } {
    // For rural areas: disable if net production after food cost would be <= 0
    if (location.type === LocationType.RURAL) {
        if (ruralNetProduction - foodCost <= 0) {
            return { shouldDisable: true, reason: 'negative_production' };
        }
    } else {
        // For cities: disable if food stock is <= 0
        const foodStock = location.foodStock || 0;
        if (foodStock <= 0) {
            return { shouldDisable: true, reason: 'no_stock' };
        }
    }

    // Disable if resentment is already 0
    if (resentmentAgainstFaction <= 0) {
        return { shouldDisable: true, reason: 'no_resentment' };
    }

    return { shouldDisable: false };
}

/**
 * Process Appease the Minds policy effect
 * Reduces resentment against the governor's faction by 2 × Statesmanship
 * 
 * @param governor - The governing character
 * @param location - The location being governed
 * @returns Updated location with reduced resentment
 */
export function processAppeaseMinds(
    governor: Character,
    location: Location
): Location {
    const statesmanship = governor.stats.statesmanship || 1;
    const resentmentReduction = 2 * statesmanship;

    // Reduce resentment against the governor's faction
    return modifyResentment(location, governor.faction, -resentmentReduction);
}
