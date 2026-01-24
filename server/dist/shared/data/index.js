"use strict";
/**
 * Data Module - Central export for all game data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInitialResources = exports.generateInitialArmies = exports.createInitialState = exports.CHARACTERS = exports.ROADS = exports.INITIAL_GARRISONS = exports.INITIAL_LOCATIONS = exports.getNavalTravelTimeForMap = exports.getNavalTimesForMap = exports.getPortsForMap = exports.getNavalTravelTimeUnified = exports.ALL_NAVAL_TIMES = exports.isPort = exports.ALL_PORTS = exports.LARION_ALTERNATE_NAVAL_TIMES = exports.LARION_ALTERNATE_PORTS = exports.LARION_LARGE_NAVAL_TIMES = exports.LARION_LARGE_PORTS = exports.LARION_NAVAL_TIMES = exports.LARION_PORTS = exports.getAppeaseFoodCost = exports.APPEASE_POPULATION_COSTS = exports.FORTIFY_DEFENSE_BONUS = exports.FORTIFY_COST = exports.INITIAL_AI_RESOURCES = exports.INITIAL_PLAYER_RESOURCES = exports.FORTIFICATION_LEVELS = exports.getNavalTravelTime = exports.NAVAL_STAGE_DAYS = exports.PORT_SEQUENCE = exports.FOOD_PER_SOLDIER = exports.REQUISITION_STABILITY_PENALTY = exports.REQUISITION_AMOUNT = exports.INCITE_BASE_CHANCE = exports.INCITE_BASE_STABILITY_DAMAGE = exports.COST_INCITE = exports.MAX_RECRUITS_PER_TURN = exports.RECRUIT_AMOUNT = exports.RECRUIT_COST = exports.BONUS_FISHING_HUNTING = exports.BONUS_HUNTING_ONLY = void 0;
// Game constants (pure values)
var gameConstants_1 = require("./gameConstants");
Object.defineProperty(exports, "BONUS_HUNTING_ONLY", { enumerable: true, get: function () { return gameConstants_1.BONUS_HUNTING_ONLY; } });
Object.defineProperty(exports, "BONUS_FISHING_HUNTING", { enumerable: true, get: function () { return gameConstants_1.BONUS_FISHING_HUNTING; } });
Object.defineProperty(exports, "RECRUIT_COST", { enumerable: true, get: function () { return gameConstants_1.RECRUIT_COST; } });
Object.defineProperty(exports, "RECRUIT_AMOUNT", { enumerable: true, get: function () { return gameConstants_1.RECRUIT_AMOUNT; } });
Object.defineProperty(exports, "MAX_RECRUITS_PER_TURN", { enumerable: true, get: function () { return gameConstants_1.MAX_RECRUITS_PER_TURN; } });
Object.defineProperty(exports, "COST_INCITE", { enumerable: true, get: function () { return gameConstants_1.COST_INCITE; } });
Object.defineProperty(exports, "INCITE_BASE_STABILITY_DAMAGE", { enumerable: true, get: function () { return gameConstants_1.INCITE_BASE_STABILITY_DAMAGE; } });
Object.defineProperty(exports, "INCITE_BASE_CHANCE", { enumerable: true, get: function () { return gameConstants_1.INCITE_BASE_CHANCE; } });
Object.defineProperty(exports, "REQUISITION_AMOUNT", { enumerable: true, get: function () { return gameConstants_1.REQUISITION_AMOUNT; } });
Object.defineProperty(exports, "REQUISITION_STABILITY_PENALTY", { enumerable: true, get: function () { return gameConstants_1.REQUISITION_STABILITY_PENALTY; } });
Object.defineProperty(exports, "FOOD_PER_SOLDIER", { enumerable: true, get: function () { return gameConstants_1.FOOD_PER_SOLDIER; } });
Object.defineProperty(exports, "PORT_SEQUENCE", { enumerable: true, get: function () { return gameConstants_1.PORT_SEQUENCE; } });
Object.defineProperty(exports, "NAVAL_STAGE_DAYS", { enumerable: true, get: function () { return gameConstants_1.NAVAL_STAGE_DAYS; } });
Object.defineProperty(exports, "getNavalTravelTime", { enumerable: true, get: function () { return gameConstants_1.getNavalTravelTime; } });
Object.defineProperty(exports, "FORTIFICATION_LEVELS", { enumerable: true, get: function () { return gameConstants_1.FORTIFICATION_LEVELS; } });
Object.defineProperty(exports, "INITIAL_PLAYER_RESOURCES", { enumerable: true, get: function () { return gameConstants_1.INITIAL_PLAYER_RESOURCES; } });
Object.defineProperty(exports, "INITIAL_AI_RESOURCES", { enumerable: true, get: function () { return gameConstants_1.INITIAL_AI_RESOURCES; } });
Object.defineProperty(exports, "FORTIFY_COST", { enumerable: true, get: function () { return gameConstants_1.FORTIFY_COST; } });
Object.defineProperty(exports, "FORTIFY_DEFENSE_BONUS", { enumerable: true, get: function () { return gameConstants_1.FORTIFY_DEFENSE_BONUS; } });
Object.defineProperty(exports, "APPEASE_POPULATION_COSTS", { enumerable: true, get: function () { return gameConstants_1.APPEASE_POPULATION_COSTS; } });
Object.defineProperty(exports, "getAppeaseFoodCost", { enumerable: true, get: function () { return gameConstants_1.getAppeaseFoodCost; } });
// Port data for multiple maps
var ports_1 = require("./ports");
Object.defineProperty(exports, "LARION_PORTS", { enumerable: true, get: function () { return ports_1.LARION_PORTS; } });
Object.defineProperty(exports, "LARION_NAVAL_TIMES", { enumerable: true, get: function () { return ports_1.LARION_NAVAL_TIMES; } });
Object.defineProperty(exports, "LARION_LARGE_PORTS", { enumerable: true, get: function () { return ports_1.LARION_LARGE_PORTS; } });
Object.defineProperty(exports, "LARION_LARGE_NAVAL_TIMES", { enumerable: true, get: function () { return ports_1.LARION_LARGE_NAVAL_TIMES; } });
Object.defineProperty(exports, "LARION_ALTERNATE_PORTS", { enumerable: true, get: function () { return ports_1.LARION_ALTERNATE_PORTS; } });
Object.defineProperty(exports, "LARION_ALTERNATE_NAVAL_TIMES", { enumerable: true, get: function () { return ports_1.LARION_ALTERNATE_NAVAL_TIMES; } });
Object.defineProperty(exports, "ALL_PORTS", { enumerable: true, get: function () { return ports_1.ALL_PORTS; } });
Object.defineProperty(exports, "isPort", { enumerable: true, get: function () { return ports_1.isPort; } });
Object.defineProperty(exports, "ALL_NAVAL_TIMES", { enumerable: true, get: function () { return ports_1.ALL_NAVAL_TIMES; } });
Object.defineProperty(exports, "getNavalTravelTimeUnified", { enumerable: true, get: function () { return ports_1.getNavalTravelTimeUnified; } });
Object.defineProperty(exports, "getPortsForMap", { enumerable: true, get: function () { return ports_1.getPortsForMap; } });
Object.defineProperty(exports, "getNavalTimesForMap", { enumerable: true, get: function () { return ports_1.getNavalTimesForMap; } });
Object.defineProperty(exports, "getNavalTravelTimeForMap", { enumerable: true, get: function () { return ports_1.getNavalTravelTimeForMap; } });
// Initial data
var locations_1 = require("./locations");
Object.defineProperty(exports, "INITIAL_LOCATIONS", { enumerable: true, get: function () { return locations_1.INITIAL_LOCATIONS; } });
Object.defineProperty(exports, "INITIAL_GARRISONS", { enumerable: true, get: function () { return locations_1.INITIAL_GARRISONS; } });
var roads_1 = require("./roads");
Object.defineProperty(exports, "ROADS", { enumerable: true, get: function () { return roads_1.ROADS; } });
var characters_1 = require("./characters");
Object.defineProperty(exports, "CHARACTERS", { enumerable: true, get: function () { return characters_1.CHARACTERS; } });
// State factories
var initialState_1 = require("./initialState");
Object.defineProperty(exports, "createInitialState", { enumerable: true, get: function () { return initialState_1.createInitialState; } });
Object.defineProperty(exports, "generateInitialArmies", { enumerable: true, get: function () { return initialState_1.generateInitialArmies; } });
Object.defineProperty(exports, "getInitialResources", { enumerable: true, get: function () { return initialState_1.getInitialResources; } });
