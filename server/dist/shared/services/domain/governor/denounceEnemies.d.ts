/**
 * denounceEnemies.ts - Domain service for "Denounce your enemies" governor policy
 *
 * Effect: Increase resentment against BOTH enemy factions by 1 × Statesmanship per turn
 * Cost: 10 gold/turn (free with Man of the Church)
 * Auto-disable: Revenue = 0 OR enemy resentment reaches 100
 */
import { Location, Character, FactionId } from '../../../types';
/**
 * Check if Denounce Enemies policy is active for a location
 */
export declare function isDenounceEnemiesActive(location: Location): boolean;
/**
 * Get the effective gold cost for a policy, accounting for Man of the Church ability.
 * Man of the Church makes gold-based policies free.
 */
export declare function getEffectiveGoldCost(baseCost: number, governor: Character | undefined): number;
/**
 * Get the two enemy factions (not controlling the location)
 */
export declare function getEnemyFactions(controllingFaction: FactionId): FactionId[];
/**
 * Check if Denounce Enemies should be disabled
 *
 * Conditions:
 * - Faction revenue reaches 0
 * - Enemy resentment reaches 100 for BOTH enemies
 */
export declare function shouldDisableDenounceEnemies(location: Location, factionRevenue: number, controllingFaction: FactionId): {
    shouldDisable: boolean;
    reason?: 'revenue_zero' | 'resentment_max';
};
/**
 * Process Denounce Enemies policy effect
 * Increases resentment against both enemy factions by 1 × Statesmanship
 *
 * @param governor - The governing character
 * @param location - The location being governed
 * @returns Updated location with increased resentment
 */
export declare function processDenounceEnemies(governor: Character, location: Location): Location;
