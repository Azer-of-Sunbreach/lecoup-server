/**
 * improveEconomy.ts - Domain service for "Improve Economic Conditions" policy
 * 
 * Effects:
 * - In cities: Increases goldIncome by 2 * statesmanship
 * - In rural areas: Increases foodIncome by 2 * statesmanship
 * - Full-time policy: Mutually exclusive with Hunt Networks
 * - No cost (free policy)
 */

import { Location, Character, GovernorPolicy, LogEntry, LogType, LogSeverity } from '../../../types';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Check if Improve Economy is active in a location
 */
export function isImproveEconomyActive(location: Location): boolean {
    return !!location.governorPolicies?.[GovernorPolicy.IMPROVE_ECONOMY];
}

/**
 * Calculate the economic bonus from Improve Economy
 * Formula: 2 * statesmanship
 * @returns The bonus amount (applied to goldIncome for cities, foodIncome for rural)
 */
export function calculateImproveEconomyBonus(governor: Character): number {
    const statesmanship = governor.stats.statesmanship || 1;
    return 2 * statesmanship;
}

/**
 * Get the type of bonus for display purposes
 * @returns 'gold' for cities, 'food' for rural areas
 */
export function getImproveEconomyBonusType(location: Location): 'gold' | 'food' {
    return location.type === 'CITY' ? 'gold' : 'food';
}

// ============================================================================
// PROCESSING
// ============================================================================

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
export function processImproveEconomy(
    governor: Character,
    location: Location,
    turn: number
): ImproveEconomyResult {
    if (!isImproveEconomyActive(location)) {
        return { location, goldBonus: 0, foodBonus: 0 };
    }

    const bonus = calculateImproveEconomyBonus(governor);

    if (location.type === 'CITY') {
        // City: bonus to gold income (handled in economy calculation)
        return {
            location,
            goldBonus: bonus,
            foodBonus: 0
        };
    } else {
        // Rural: bonus to food production (handled in food calculation)
        return {
            location,
            goldBonus: 0,
            foodBonus: bonus
        };
    }
}

// ============================================================================
// DISABLE CONDITIONS
// ============================================================================

export interface DisableCheckResult {
    shouldDisable: boolean;
    reason: 'none' | 'other_fulltime';
}

/**
 * Check if Improve Economy should be disabled
 * Only disables if another full-time policy is active
 */
export function shouldDisableImproveEconomy(location: Location): DisableCheckResult {
    // Check if Hunt Networks is active (the only other full-time policy)
    const huntNetworksActive = !!location.governorPolicies?.[GovernorPolicy.HUNT_NETWORKS];

    return {
        shouldDisable: huntNetworksActive,
        reason: huntNetworksActive ? 'other_fulltime' : 'none'
    };
}
