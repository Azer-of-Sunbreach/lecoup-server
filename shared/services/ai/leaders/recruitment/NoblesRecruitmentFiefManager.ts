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
import { NOBLES_FIEFDOM_PENALTY } from '../../../domain/leaders/noblesRecruitment';
import { calculateRuralFoodStats, calculateCityFoodStats } from '../../../domain/territorial/territorialStats';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Minimum food surplus required to grant fief in rural area */
export const MIN_FOOD_SURPLUS_FOR_RURAL_FIEF = 50;

/** Gold cost per turn for granting fief in city */
export const CITY_FIEF_GOLD_COST_PER_TURN = NOBLES_FIEFDOM_PENALTY; // 30

/** Food production loss per turn for granting fief in rural area */
export const RURAL_FIEF_FOOD_COST_PER_TURN = NOBLES_FIEFDOM_PENALTY; // 30

/** Minimum leader value (gold-equivalent) to justify recruiting with city fief */
export const MIN_LEADER_VALUE_FOR_CITY_FIEF = 30;

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// FOOD SURPLUS CALCULATION
// ============================================================================

/**
 * Calculate the food surplus from city/rural pairs controlled by faction.
 * Only considers pairs where BOTH city AND its linkedLocationId (rural) are controlled.
 * 
 * Uses territorialStats functions for accurate production/consumption calculations.
 */
export function calculateFoodSurplus(
    locations: Location[],
    armies: Army[],
    characters: Character[],
    faction: FactionId = FactionId.NOBLES
): FoodSurplusResult {
    const controlledLocations = locations.filter(l => l.faction === faction);
    const controlledIds = new Set(controlledLocations.map(l => l.id));
    
    const controlledPairs: CityRuralPair[] = [];
    let totalSurplus = 0;

    // Find all cities controlled by faction
    const controlledCities = controlledLocations.filter(l => l.type === 'CITY');

    for (const city of controlledCities) {
        // Check if linkedLocationId (rural area) is also controlled
        if (city.linkedLocationId && controlledIds.has(city.linkedLocationId)) {
            const rural = locations.find(l => l.id === city.linkedLocationId);
            if (rural && rural.type === 'RURAL') {
                // Use territorialStats for accurate calculation
                const ruralStats = calculateRuralFoodStats(rural, locations, armies, characters);
                const cityStats = calculateCityFoodStats(city, locations, armies, characters);
                
                // Net food = rural production - city consumption (excluding rural supply since it's circular)
                const ruralProduction = ruralStats?.netProduction || 0;
                const cityConsumption = (cityStats?.populationConsumption || 0) + 
                                       (cityStats?.armyConsumption || 0) + 
                                       (cityStats?.embargoMalus || 0) -
                                       (cityStats?.foodImports || 0) -
                                       (cityStats?.rationingBonus || 0);
                const netFood = ruralProduction - cityConsumption;

                controlledPairs.push({
                    city,
                    rural,
                    netFood
                });

                totalSurplus += netFood;
            }
        }
    }

    return {
        totalSurplus,
        controlledPairs,
        canGrantRuralFief: totalSurplus >= MIN_FOOD_SURPLUS_FOR_RURAL_FIEF
    };
}

// ============================================================================
// FIEF SELECTION LOGIC
// ============================================================================

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
export function selectFiefLocation(
    locations: Location[],
    armies: Army[],
    characters: Character[],
    faction: FactionId = FactionId.NOBLES,
    leaderValue: number = 0
): FiefSelectionResult {
    const surplusResult = calculateFoodSurplus(locations, armies, characters, faction);
    const controlledLocations = locations.filter(l => l.faction === faction);

    // Get all locations without existing fief
    const availableForFief = controlledLocations.filter(l => !l.grantedFief);

    if (availableForFief.length === 0) {
        return {
            canGrantFief: false,
            fiefLocationId: null,
            fiefType: null,
            costPerTurn: 0,
            reasoning: 'No locations available for fief grant (all have existing fiefs)'
        };
    }

    // CASE 1: Food surplus >= 50 → grant fief in rural area
    if (surplusResult.canGrantRuralFief) {
        // Find most populous rural area without existing fief
        const availableRurals = availableForFief
            .filter(l => l.type === 'RURAL')
            .sort((a, b) => (b.population || 0) - (a.population || 0));

        if (availableRurals.length > 0) {
            const selectedRural = availableRurals[0];
            return {
                canGrantFief: true,
                fiefLocationId: selectedRural.id,
                fiefType: 'RURAL',
                costPerTurn: RURAL_FIEF_FOOD_COST_PER_TURN,
                reasoning: `Food surplus (${surplusResult.totalSurplus}) >= ${MIN_FOOD_SURPLUS_FOR_RURAL_FIEF}. Selected ${selectedRural.name} (pop: ${selectedRural.population})`
            };
        }

        // No rural areas available, fall through to city logic
    }

    // CASE 2: Food surplus < 50 OR no rural available → grant fief in city
    // Only if leader value justifies the gold cost
    if (leaderValue < MIN_LEADER_VALUE_FOR_CITY_FIEF) {
        return {
            canGrantFief: false,
            fiefLocationId: null,
            fiefType: null,
            costPerTurn: 0,
            reasoning: `Food surplus (${surplusResult.totalSurplus}) < ${MIN_FOOD_SURPLUS_FOR_RURAL_FIEF} and leader value (${leaderValue.toFixed(1)}) < ${MIN_LEADER_VALUE_FOR_CITY_FIEF}. Not worth recruiting.`
        };
    }

    // Find most populous city without existing fief
    const availableCities = availableForFief
        .filter(l => l.type === 'CITY')
        .sort((a, b) => (b.population || 0) - (a.population || 0));

    if (availableCities.length > 0) {
        const selectedCity = availableCities[0];
        return {
            canGrantFief: true,
            fiefLocationId: selectedCity.id,
            fiefType: 'CITY',
            costPerTurn: CITY_FIEF_GOLD_COST_PER_TURN,
            reasoning: `Food surplus (${surplusResult.totalSurplus}) < ${MIN_FOOD_SURPLUS_FOR_RURAL_FIEF}. Granting city fief at ${selectedCity.name}. Leader value (${leaderValue.toFixed(1)}) justifies gold cost.`
        };
    }

    // No cities available either
    return {
        canGrantFief: false,
        fiefLocationId: null,
        fiefType: null,
        costPerTurn: 0,
        reasoning: 'No cities or rural areas available for fief grant'
    };
}

/**
 * Check if faction can afford to recruit (has at least one location for fief).
 */
export function canAffordRecruitment(
    locations: Location[],
    faction: FactionId = FactionId.NOBLES
): { canAfford: boolean; reason?: string } {
    const controlledLocations = locations.filter(l => l.faction === faction);
    
    if (controlledLocations.length === 0) {
        return { canAfford: false, reason: 'No territories controlled' };
    }

    const availableForFief = controlledLocations.filter(l => !l.grantedFief);
    
    if (availableForFief.length === 0) {
        return { canAfford: false, reason: 'All locations already have fiefs granted' };
    }

    return { canAfford: true };
}

/**
 * Get faction revenues (gold income per turn).
 */
export function getFactionRevenues(
    locations: Location[],
    faction: FactionId
): number {
    return locations
        .filter(l => l.faction === faction)
        .reduce((sum, l) => sum + (l.goldIncome || 0), 0);
}
