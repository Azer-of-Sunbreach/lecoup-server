/**
 * Nobles Recruitment Fief Manager
 *
 * Manages the fief selection logic for Nobles leader recruitment.
 * Nobles must grant a fiefdom (territory) which reduces production by 30 food or 30 gold.
 *
 * Logic:
 * 1. Calculate food surplus from controlled city/rural pairs
 * 2. If surplus >= 50, grant fief in rural area (most populous without existing fief)
 * 3. If surplus < 50, must evaluate granting fief in city (costs 30g/turn)
 *
 * @module shared/services/ai/leaders/recruitment
 */
import { Location, FactionId, Army, Character } from '../../../../types';
/** Minimum food surplus required to grant fief in rural area */
export declare const MIN_FOOD_SURPLUS_FOR_RURAL_FIEF = 50;
/** Gold cost per turn for granting fief in city */
export declare const CITY_FIEF_GOLD_COST_PER_TURN = 30;
/** Food production loss per turn for granting fief in rural area */
export declare const RURAL_FIEF_FOOD_COST_PER_TURN = 30;
/** Minimum leader value (gold-equivalent) to justify recruiting with city fief */
export declare const MIN_LEADER_VALUE_FOR_CITY_FIEF = 30;
export interface CityRuralPair {
    city: Location;
    rural: Location;
    /** Net food from this pair (rural production - city consumption) */
    netFood: number;
}
export interface FoodSurplusResult {
    /** Total food surplus from all controlled city/rural pairs */
    totalSurplus: number;
    /** City/rural pairs where both are controlled by Nobles */
    controlledPairs: CityRuralPair[];
    /** Whether surplus is sufficient to grant fief in rural (>= 50) */
    canGrantRuralFief: boolean;
}
export interface FiefSelectionResult {
    /** Whether a valid fief location was found */
    canGrantFief: boolean;
    /** Selected location for fief grant */
    fiefLocationId: string | null;
    /** Type of fief location (CITY or RURAL) */
    fiefType: 'CITY' | 'RURAL' | null;
    /** Cost per turn (30 gold for city, 30 food for rural) */
    costPerTurn: number;
    /** Reason for selection or failure */
    reasoning: string;
}
/**
 * Calculate the food surplus from city/rural pairs controlled by faction.
 * Only considers pairs where BOTH city AND its linkedLocationId (rural) are controlled.
 *
 * Uses territorialStats functions for accurate production/consumption calculations.
 */
export declare function calculateFoodSurplus(locations: Location[], armies: Army[], characters: Character[], faction?: FactionId): FoodSurplusResult;
/**
 * Select the best location to grant a fief.
 *
 * Priority:
 * 1. If food surplus >= 50: grant fief in most populous rural area without existing fief
 * 2. If food surplus < 50: grant fief in city (only if leader value >= 30g/turn)
 *
 * @param locations All game locations
 * @param armies All armies (for food consumption calculation)
 * @param characters All characters (for governor policies)
 * @param faction Faction granting the fief
 * @param leaderValue Gold-equivalent value of the leader being recruited (per turn)
 */
export declare function selectFiefLocation(locations: Location[], armies: Army[], characters: Character[], faction?: FactionId, leaderValue?: number): FiefSelectionResult;
/**
 * Check if faction can afford to recruit (has at least one location for fief).
 */
export declare function canAffordRecruitment(locations: Location[], faction?: FactionId): {
    canAfford: boolean;
    reason?: string;
};
/**
 * Get faction revenues (gold income per turn).
 */
export declare function getFactionRevenues(locations: Location[], faction: FactionId): number;
