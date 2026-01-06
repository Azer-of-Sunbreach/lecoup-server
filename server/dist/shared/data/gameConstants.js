"use strict";
/**
 * Game Constants - Pure numerical/static values that define game mechanics
 * These values should not change during gameplay and are derived from specifications
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FORTIFY_DEFENSE_BONUS = exports.FORTIFY_COST = exports.INITIAL_AI_RESOURCES = exports.INITIAL_PLAYER_RESOURCES = exports.FORTIFICATION_LEVELS = exports.NAVAL_STAGE_DAYS = exports.getNavalTravelTime = exports.NAVAL_TRAVEL_TIMES = exports.PORT_SEQUENCE = exports.FOOD_PER_SOLDIER = exports.REQUISITION_STABILITY_PENALTY = exports.REQUISITION_AMOUNT = exports.INCITE_BASE_CHANCE = exports.INCITE_BASE_STABILITY_DAMAGE = exports.COST_INCITE = exports.MAX_RECRUITS_PER_TURN = exports.RECRUIT_AMOUNT = exports.RECRUIT_COST = exports.BONUS_FISHING_HUNTING = exports.BONUS_HUNTING_ONLY = exports.DEBUG_COMBAT = exports.DEBUG_AI = void 0;
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
exports.NAVAL_TRAVEL_TIMES = {
    mirebridge: { port_de_sable: 2, gre_au_vent: 2, sunbreach: 4, brinewaith: 5, stormbay: 6, gullwing: 8 },
    port_de_sable: { sunbreach: 2, gre_au_vent: 2, brinewaith: 3, stormbay: 4, gullwing: 6 },
    gre_au_vent: { sunbreach: 4, brinewaith: 5, stormbay: 6, gullwing: 8 },
    sunbreach: { brinewaith: 2, stormbay: 2, gullwing: 4 },
    brinewaith: { stormbay: 2, gullwing: 4 },
    stormbay: { gullwing: 2 }
};
// Helper function to get naval travel time between any two ports (handles symmetry)
const getNavalTravelTime = (from, to) => {
    if (from === to)
        return 0;
    return exports.NAVAL_TRAVEL_TIMES[from]?.[to] || exports.NAVAL_TRAVEL_TIMES[to]?.[from] || 2;
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
    REPUBLICANS: 2000,
    CONSPIRATORS: 850,
    NOBLES: 1200
};
// Deprecated constants kept for compatibility
exports.FORTIFY_COST = 40;
exports.FORTIFY_DEFENSE_BONUS = 20;
