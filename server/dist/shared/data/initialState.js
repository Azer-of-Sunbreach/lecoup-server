"use strict";
/**
 * Initial Game State Factory - Generates the starting state for a new game
 * Consolidates logic from useGameEngine.ts INITIAL_STATE
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInitialState = exports.getInitialResources = exports.generateInitialArmies = void 0;
const types_1 = require("../types");
const locations_1 = require("./locations");
const roads_1 = require("./roads");
const characters_1 = require("./characters");
const gameConstants_1 = require("./gameConstants");
/**
 * Generate initial armies based on garrison data and locations
 */
const generateInitialArmies = () => {
    return Object.entries(locations_1.INITIAL_GARRISONS).map(([locId, strength], index) => {
        const loc = locations_1.INITIAL_LOCATIONS.find(l => l.id === locId);
        if (!loc)
            return null;
        return {
            id: `start_army_${index}`,
            faction: loc.faction,
            locationType: 'LOCATION',
            locationId: locId,
            roadId: null,
            stageIndex: 0,
            direction: 'FORWARD',
            originLocationId: locId,
            destinationId: null,
            turnsUntilArrival: 0,
            strength: strength,
            isInsurgent: false,
            isSpent: false,
            isSieging: false,
            foodSourceId: locId,
            lastSafePosition: { type: 'LOCATION', id: locId }
        };
    }).filter(Boolean);
};
exports.generateInitialArmies = generateInitialArmies;
/**
 * Generate initial resources based on player faction choice
 * AI factions receive boosted resources
 */
const getInitialResources = (playerFaction) => {
    return {
        [types_1.FactionId.REPUBLICANS]: {
            gold: playerFaction === types_1.FactionId.REPUBLICANS
                ? gameConstants_1.INITIAL_PLAYER_RESOURCES.REPUBLICANS
                : gameConstants_1.INITIAL_AI_RESOURCES.REPUBLICANS
        },
        [types_1.FactionId.CONSPIRATORS]: {
            gold: playerFaction === types_1.FactionId.CONSPIRATORS
                ? gameConstants_1.INITIAL_PLAYER_RESOURCES.CONSPIRATORS
                : gameConstants_1.INITIAL_AI_RESOURCES.CONSPIRATORS
        },
        [types_1.FactionId.NOBLES]: {
            gold: playerFaction === types_1.FactionId.NOBLES
                ? gameConstants_1.INITIAL_PLAYER_RESOURCES.NOBLES
                : gameConstants_1.INITIAL_AI_RESOURCES.NOBLES
        },
        [types_1.FactionId.NEUTRAL]: { gold: 0 },
    };
};
exports.getInitialResources = getInitialResources;
/**
 * Create the initial game state for starting a new game
 */
const createInitialState = () => ({
    turn: 1,
    playerFaction: types_1.FactionId.REPUBLICANS,
    locations: locations_1.INITIAL_LOCATIONS,
    characters: characters_1.CHARACTERS,
    armies: (0, exports.generateInitialArmies)(),
    convoys: [],
    navalConvoys: [],
    roads: roads_1.ROADS,
    resources: {
        [types_1.FactionId.REPUBLICANS]: { gold: gameConstants_1.INITIAL_PLAYER_RESOURCES.REPUBLICANS },
        [types_1.FactionId.CONSPIRATORS]: { gold: gameConstants_1.INITIAL_PLAYER_RESOURCES.CONSPIRATORS },
        [types_1.FactionId.NOBLES]: { gold: gameConstants_1.INITIAL_PLAYER_RESOURCES.NOBLES },
        [types_1.FactionId.NEUTRAL]: { gold: 0 },
    },
    pendingNegotiations: [],
    logs: ["The coup has begun. Count Rivenberg has claimed the regency for himself.", "Baron Lekal has called on the great Dukes to defend their feudal rights.", "Sir Azer and the Republicans took control of Sunbreach.", "Civil war engulfs Larion."],
    stats: { deathToll: 0 },
    selectedType: null,
    selectedId: null,
    selectedStageIndex: null,
    selectedLocationId: null,
    isProcessing: false,
    combatQueue: [],
    combatState: null,
    showLeadersModal: false,
    showStartScreen: true,
    showStatsModal: false,
    showFactionModal: false,
    logsExpanded: true,
    grainTradeNotification: null,
    insurrectionNotification: null,
    famineNotification: null,
    siegeNotification: null,
    hasScannedBattles: false
});
exports.createInitialState = createInitialState;
