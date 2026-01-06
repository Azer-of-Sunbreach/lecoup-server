/**
 * appeaseMinds.ts - Domain service for "Appease the Minds" governor policy
 *
 * Effect: Reduce resentment against player faction by 2 × Statesmanship per turn
 * Cost: Food (population-based tiers) - handled by processor
 * Auto-disable: If rural net production - food cost < 0
 * Not available: Rural areas
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
 * - Location is rural (not available)
 * - Rural net production - food cost would be negative
 * - Resentment against faction is already 0
 */
export function shouldDisableAppeaseMinds(
    location: Location,
    ruralNetProduction: number,
    foodCost: number,
    resentmentAgainstFaction: number
): { shouldDisable: boolean; reason?: 'rural_area' | 'negative_production' | 'no_resentment' } {
    // Not available in rural areas
    if (location.type === LocationType.RURAL) {
        return { shouldDisable: true, reason: 'rural_area' };
    }

    // Check if enabling would cause negative production
    if (ruralNetProduction - foodCost < 0) {
        return { shouldDisable: true, reason: 'negative_production' };
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
