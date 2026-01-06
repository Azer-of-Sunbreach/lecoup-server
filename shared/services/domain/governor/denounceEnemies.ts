/**
 * denounceEnemies.ts - Domain service for "Denounce your enemies" governor policy
 *
 * Effect: Increase resentment against BOTH enemy factions by 1 × Statesmanship per turn
 * Cost: 10 gold/turn (free with Man of the Church)
 * Auto-disable: Revenue = 0 OR enemy resentment reaches 100
 */

import { Location, Character, GovernorPolicy, FactionId } from '../../../types';
import { modifyResentment, getResentment } from '../politics/resentment';

/**
 * Check if Denounce Enemies policy is active for a location
 */
export function isDenounceEnemiesActive(location: Location): boolean {
    return location.governorPolicies?.[GovernorPolicy.DENOUNCE_ENEMIES] === true;
}

/**
 * Get the effective gold cost for a policy, accounting for Man of the Church ability.
 * Man of the Church makes gold-based policies free.
 */
export function getEffectiveGoldCost(
    baseCost: number,
    governor: Character | undefined
): number {
    if (governor?.stats.ability.includes('MAN_OF_CHURCH')) {
        return 0;
    }
    return baseCost;
}

/**
 * Get the two enemy factions (not controlling the location)
 */
export function getEnemyFactions(controllingFaction: FactionId): FactionId[] {
    const allFactions = [FactionId.NOBLES, FactionId.REPUBLICANS, FactionId.CONSPIRATORS];
    return allFactions.filter(f => f !== controllingFaction);
}

/**
 * Check if Denounce Enemies should be disabled
 * 
 * Conditions:
 * - Faction revenue reaches 0
 * - Enemy resentment reaches 100 for BOTH enemies
 */
export function shouldDisableDenounceEnemies(
    location: Location,
    factionRevenue: number,
    controllingFaction: FactionId
): { shouldDisable: boolean; reason?: 'revenue_zero' | 'resentment_max' } {
    // Disable if faction revenue is 0
    if (factionRevenue <= 0) {
        return { shouldDisable: true, reason: 'revenue_zero' };
    }

    // Check enemy resentment - disable if BOTH enemies are at 100
    const enemyFactions = getEnemyFactions(controllingFaction);
    const allAtMax = enemyFactions.every(faction =>
        getResentment(location, faction) >= 100
    );

    if (allAtMax) {
        return { shouldDisable: true, reason: 'resentment_max' };
    }

    return { shouldDisable: false };
}

/**
 * Process Denounce Enemies policy effect
 * Increases resentment against both enemy factions by 1 × Statesmanship
 * 
 * @param governor - The governing character
 * @param location - The location being governed
 * @returns Updated location with increased resentment
 */
export function processDenounceEnemies(
    governor: Character,
    location: Location
): Location {
    const statesmanship = governor.stats.statesmanship || 1;
    const resentmentIncrease = statesmanship; // 1 × Statesmanship per enemy faction

    // Get enemy factions
    const enemyFactions = getEnemyFactions(location.faction);

    // Increase resentment against both enemy factions
    let updatedLocation = location;
    for (const faction of enemyFactions) {
        updatedLocation = modifyResentment(updatedLocation, faction, resentmentIncrease);
    }

    return updatedLocation;
}
