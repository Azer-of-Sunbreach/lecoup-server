"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIN_LEADER_VALUE_FOR_CITY_FIEF = exports.RURAL_FIEF_FOOD_COST_PER_TURN = exports.CITY_FIEF_GOLD_COST_PER_TURN = exports.MIN_FOOD_SURPLUS_FOR_RURAL_FIEF = void 0;
exports.calculateFoodSurplus = calculateFoodSurplus;
exports.selectFiefLocation = selectFiefLocation;
exports.canAffordRecruitment = canAffordRecruitment;
exports.getFactionRevenues = getFactionRevenues;
const types_1 = require("../../../../types");
const noblesRecruitment_1 = require("../../../domain/leaders/noblesRecruitment");
const territorialStats_1 = require("../../../domain/territorial/territorialStats");
// ============================================================================
// CONSTANTS
// ============================================================================
/** Minimum food surplus required to grant fief in rural area */
exports.MIN_FOOD_SURPLUS_FOR_RURAL_FIEF = 50;
/** Gold cost per turn for granting fief in city */
exports.CITY_FIEF_GOLD_COST_PER_TURN = noblesRecruitment_1.NOBLES_FIEFDOM_PENALTY; // 30
/** Food production loss per turn for granting fief in rural area */
exports.RURAL_FIEF_FOOD_COST_PER_TURN = noblesRecruitment_1.NOBLES_FIEFDOM_PENALTY; // 30
/** Minimum leader value (gold-equivalent) to justify recruiting with city fief */
exports.MIN_LEADER_VALUE_FOR_CITY_FIEF = 30;
// ============================================================================
// FOOD SURPLUS CALCULATION
// ============================================================================
/**
 * Calculate the food surplus from city/rural pairs controlled by faction.
 * Only considers pairs where BOTH city AND its linkedLocationId (rural) are controlled.
 *
 * Uses territorialStats functions for accurate production/consumption calculations.
 */
function calculateFoodSurplus(locations, armies, characters, faction = types_1.FactionId.NOBLES) {
    const controlledLocations = locations.filter(l => l.faction === faction);
    const controlledIds = new Set(controlledLocations.map(l => l.id));
    const controlledPairs = [];
    let totalSurplus = 0;
    // Find all cities controlled by faction
    const controlledCities = controlledLocations.filter(l => l.type === 'CITY');
    for (const city of controlledCities) {
        // Check if linkedLocationId (rural area) is also controlled
        if (city.linkedLocationId && controlledIds.has(city.linkedLocationId)) {
            const rural = locations.find(l => l.id === city.linkedLocationId);
            if (rural && rural.type === 'RURAL') {
                // Use territorialStats for accurate calculation
                const ruralStats = (0, territorialStats_1.calculateRuralFoodStats)(rural, locations, armies, characters);
                const cityStats = (0, territorialStats_1.calculateCityFoodStats)(city, locations, armies, characters);
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
        canGrantRuralFief: totalSurplus >= exports.MIN_FOOD_SURPLUS_FOR_RURAL_FIEF
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
function selectFiefLocation(locations, armies, characters, faction = types_1.FactionId.NOBLES, leaderValue = 0) {
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
                costPerTurn: exports.RURAL_FIEF_FOOD_COST_PER_TURN,
                reasoning: `Food surplus (${surplusResult.totalSurplus}) >= ${exports.MIN_FOOD_SURPLUS_FOR_RURAL_FIEF}. Selected ${selectedRural.name} (pop: ${selectedRural.population})`
            };
        }
        // No rural areas available, fall through to city logic
    }
    // CASE 2: Food surplus < 50 OR no rural available → grant fief in city
    // Only if leader value justifies the gold cost
    if (leaderValue < exports.MIN_LEADER_VALUE_FOR_CITY_FIEF) {
        return {
            canGrantFief: false,
            fiefLocationId: null,
            fiefType: null,
            costPerTurn: 0,
            reasoning: `Food surplus (${surplusResult.totalSurplus}) < ${exports.MIN_FOOD_SURPLUS_FOR_RURAL_FIEF} and leader value (${leaderValue.toFixed(1)}) < ${exports.MIN_LEADER_VALUE_FOR_CITY_FIEF}. Not worth recruiting.`
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
            costPerTurn: exports.CITY_FIEF_GOLD_COST_PER_TURN,
            reasoning: `Food surplus (${surplusResult.totalSurplus}) < ${exports.MIN_FOOD_SURPLUS_FOR_RURAL_FIEF}. Granting city fief at ${selectedCity.name}. Leader value (${leaderValue.toFixed(1)}) justifies gold cost.`
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
function canAffordRecruitment(locations, faction = types_1.FactionId.NOBLES) {
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
function getFactionRevenues(locations, faction) {
    return locations
        .filter(l => l.faction === faction)
        .reduce((sum, l) => sum + (l.goldIncome || 0), 0);
}
