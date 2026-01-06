"use strict";
// Combat Resolver - Main combat resolution orchestrator
// Refactored to use modular components
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCombatResult = exports.calculateCombatStrength = exports.applySequentialLosses = void 0;
const combatDetection_1 = require("./combatDetection");
// Import from new modular structure
const index_1 = require("./combat/index");
Object.defineProperty(exports, "applySequentialLosses", { enumerable: true, get: function () { return index_1.applySequentialLosses; } });
Object.defineProperty(exports, "calculateCombatStrength", { enumerable: true, get: function () { return index_1.calculateCombatStrength; } });
/**
 * Main combat resolution orchestrator.
 * Delegates to specialized handlers based on player choice.
 *
 * @param prevState - Current game state
 * @param choice - Player's combat choice (FIGHT, RETREAT, RETREAT_CITY, SIEGE)
 * @param siegeCost - Gold cost for siege (only for SIEGE choice)
 * @returns Partial game state updates
 */
const resolveCombatResult = (prevState, choice, siegeCost = 0) => {
    if (!prevState.combatState)
        return {};
    const combat = prevState.combatState;
    // Initialize state copies
    let newArmies = [...prevState.armies];
    let newLocations = [...prevState.locations];
    let newRoads = [...prevState.roads];
    let newCharacters = [...prevState.characters];
    let newResources = { ...prevState.resources };
    let newStats = { ...prevState.stats };
    let logMsg = "";
    // Delegate to appropriate handler based on choice
    switch (choice) {
        case 'FIGHT': {
            const result = (0, index_1.resolveFight)(combat, newArmies, newCharacters, newLocations, newRoads, newStats);
            newArmies = result.armies;
            newLocations = result.locations;
            newRoads = result.roads;
            newCharacters = result.characters;
            newStats = result.stats;
            logMsg = result.logMessage;
            break;
        }
        case 'RETREAT': {
            const result = (0, index_1.handleAttackerRetreat)(combat, newArmies, prevState.armies, newRoads, newLocations);
            newArmies = result.armies;
            newLocations = result.locations;
            logMsg = result.logMessage;
            break;
        }
        case 'RETREAT_CITY': {
            const result = (0, index_1.handleDefenderRetreatToCity)(combat, newArmies, newLocations);
            newArmies = result.armies;
            newLocations = result.locations;
            logMsg = result.logMessage;
            break;
        }
        case 'SIEGE': {
            const result = (0, index_1.handleSiege)(combat, siegeCost, prevState.playerFaction, newArmies, newLocations, newRoads, newResources);
            newArmies = result.armies;
            newLocations = result.locations;
            newRoads = result.roads;
            newResources = result.resources;
            logMsg = result.logMessage;
            break;
        }
    }
    // Auto-resolve cascading AI battles
    const cascadeResult = (0, index_1.resolveAIBattleCascade)(prevState.playerFaction, newArmies, newCharacters, newLocations, newRoads, newStats);
    newArmies = cascadeResult.armies;
    newLocations = cascadeResult.locations;
    newRoads = cascadeResult.roads;
    newCharacters = cascadeResult.characters;
    newStats = cascadeResult.stats;
    cascadeResult.logMessages.forEach(msg => logMsg += ` ${msg}`);
    // Detect remaining player battles
    const currentBattles = (0, combatDetection_1.detectBattles)(newLocations, newArmies, newRoads);
    const playerBattles = (0, index_1.getPlayerBattles)(currentBattles, prevState.playerFaction);
    const nextBattle = playerBattles.length > 0 ? playerBattles[0] : null;
    const nextQueue = playerBattles.length > 1 ? playerBattles.slice(1) : [];
    if (nextBattle && !prevState.combatState) {
        logMsg += " Another conflict has erupted!";
    }
    return {
        armies: newArmies,
        locations: newLocations,
        roads: newRoads,
        characters: newCharacters,
        resources: newResources,
        stats: newStats,
        combatState: nextBattle,
        combatQueue: nextQueue,
        logs: [...prevState.logs, logMsg]
    };
};
exports.resolveCombatResult = resolveCombatResult;
