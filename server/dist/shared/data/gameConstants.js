"use strict";
/**
 * Game Constants - Pure numerical/static values that define game mechanics
 * These values should not change during gameplay and are derived from specifications
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAppeaseFoodCost = exports.APPEASE_POPULATION_COSTS = exports.FORTIFY_DEFENSE_BONUS = exports.FORTIFY_COST = exports.INITIAL_AI_RESOURCES = exports.INITIAL_PLAYER_RESOURCES = exports.FORTIFICATION_LEVELS = exports.NAVAL_STAGE_DAYS = exports.getNavalTravelTime = exports.NAVAL_TRAVEL_TIMES = exports.PORT_SEQUENCE = exports.FOOD_PER_SOLDIER = exports.REQUISITION_STABILITY_PENALTY = exports.REQUISITION_AMOUNT = exports.INCITE_BASE_CHANCE = exports.INCITE_BASE_STABILITY_DAMAGE = exports.COST_INCITE = exports.MAX_RECRUITS_PER_TURN = exports.RECRUIT_AMOUNT = exports.RECRUIT_COST = exports.BONUS_FISHING_HUNTING = exports.BONUS_HUNTING_ONLY = exports.DEBUG_COMBAT = exports.DEBUG_AI = void 0;
// Debug Flags - Set to true to enable verbose console logging
exports.DEBUG_AI = false; // AI decision logging (military, diplomacy, economy)
exports.DEBUG_COMBAT = false; // Combat resolution logging
// Food Production Bonuses (Spec 6.1.2)
exports.BONUS_HUNTING_ONLY = 6;
exports.BONUS_FISHING_HUNTING = 10;
// Recruitment (Spec 7.1.3)
exports.RECRUIT_COST = 50;
exports.RECRUIT_AMOUNT = 500;
exports.MAX_RECRUITS_PER_TURN = 4;
// Insurrection (Spec 5)
exports.COST_INCITE = 100; // Minimum cost, can spend up to 500
exports.INCITE_BASE_STABILITY_DAMAGE = 10;
exports.INCITE_BASE_CHANCE = 0.7;
// Requisition (Spec 6.3)
exports.REQUISITION_AMOUNT = 50;
exports.REQUISITION_STABILITY_PENALTY = 15;
// Army Logistics (Spec 7.2.2)
exports.FOOD_PER_SOLDIER = 0.001; // 1 food unit per 1000 soldiers
// Naval Route (Spec 2.4)
exports.PORT_SEQUENCE = ['mirebridge', 'port_de_sable', 'sunbreach', 'stormbay', 'gullwing', 'brinewaith', 'gre_au_vent'];
// Naval travel times (in days/turns) - only stores one direction, function handles symmetry
// NOTE: This is the base Larion map times. For map-agnostic lookup, use getNavalTravelTimeUnified from ports.ts
exports.NAVAL_TRAVEL_TIMES = {
    mirebridge: { port_de_sable: 2, gre_au_vent: 2, sunbreach: 4, brinewaith: 5, stormbay: 6, gullwing: 8 },
    port_de_sable: { sunbreach: 2, gre_au_vent: 2, brinewaith: 3, stormbay: 4, gullwing: 6 },
    gre_au_vent: { sunbreach: 4, brinewaith: 5, stormbay: 6, gullwing: 8 },
    sunbreach: { brinewaith: 2, stormbay: 2, gullwing: 4 },
    brinewaith: { stormbay: 2, gullwing: 4 },
    stormbay: { gullwing: 2 }
};
// Import the unified naval times that includes all maps
const ports_1 = require("./ports");
// Helper function to get naval travel time between any two ports (handles symmetry)
// Uses merged travel times from ALL maps to support ports like Cathair
const getNavalTravelTime = (from, to) => {
    if (from === to)
        return 0;
    return ports_1.ALL_NAVAL_TIMES[from]?.[to] || ports_1.ALL_NAVAL_TIMES[to]?.[from] || 2;
};
exports.getNavalTravelTime = getNavalTravelTime;
// Deprecated - kept for reference
exports.NAVAL_STAGE_DAYS = 2;
exports.FORTIFICATION_LEVELS = {
    0: { name: "No prepared defenses", legend: "A land ripe for open battles.", bonus: 0, cost: 0, manpower: 0, time: 0 },
    1: { name: "Pikes and trenches", legend: "A cost-effective, easy way to defend.", bonus: 500, cost: 25, manpower: 500, time: 1 },
    2: { name: "Stone tower", legend: "Strong defensive point.", bonus: 1500, cost: 50, manpower: 1000, time: 2 },
    3: { name: "City walls", legend: "A small garrison behind them can hold off vast armies.", bonus: 4000, cost: 150, manpower: 1500, time: 3 },
    4: { name: "Stormbay Fortress", legend: "The impregnable headquarters of the Order.", bonus: 10000, cost: 250, manpower: 2000, time: 3 }
};
// Initial Resources (Spec 7.6)
// Note: When player selects a faction, AI factions get boosted resources
exports.INITIAL_PLAYER_RESOURCES = {
    REPUBLICANS: 1000,
    CONSPIRATORS: 350,
    NOBLES: 500
};
exports.INITIAL_AI_RESOURCES = {
    REPUBLICANS: 3000,
    CONSPIRATORS: 850,
    NOBLES: 1200
};
// Deprecated constants kept for compatibility
exports.FORTIFY_COST = 40;
exports.FORTIFY_DEFENSE_BONUS = 20;
// Governor - Appease the Minds Food Costs (Spec)
exports.APPEASE_POPULATION_COSTS = {
    TIER_1: 1, // < 25k
    TIER_2: 2, // 25k - 70k
    TIER_3: 4, // 70k - 120k
    TIER_4: 6, // 120k - 300k
    TIER_5: 8, // 300k - 500k
    TIER_6: 10 // > 500k
};
const getAppeaseFoodCost = (population) => {
    if (population < 25000)
        return exports.APPEASE_POPULATION_COSTS.TIER_1;
    if (population <= 70000)
        return exports.APPEASE_POPULATION_COSTS.TIER_2;
    if (population <= 120000)
        return exports.APPEASE_POPULATION_COSTS.TIER_3;
    if (population <= 300000)
        return exports.APPEASE_POPULATION_COSTS.TIER_4;
    if (population <= 500000)
        return exports.APPEASE_POPULATION_COSTS.TIER_5;
    return exports.APPEASE_POPULATION_COSTS.TIER_6;
};
exports.getAppeaseFoodCost = getAppeaseFoodCost;
