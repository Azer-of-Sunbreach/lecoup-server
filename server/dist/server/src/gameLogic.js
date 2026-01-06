"use strict";
/**
 * Server-side Game Logic Handler
 * Uses shared game logic to process player actions and manage game state
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.processAITurn = void 0;
exports.createMultiplayerGameState = createMultiplayerGameState;
exports.processPlayerAction = processPlayerAction;
exports.advanceTurn = advanceTurn;
exports.getClientState = getClientState;
const types_1 = require("../../shared/types");
const initialState_1 = require("../../shared/data/initialState");
const domain_1 = require("../../shared/services/domain");
const combatDetection_1 = require("../../shared/services/combatDetection");
const turnProcessor_1 = require("../../shared/services/turnProcessor");
const economy_1 = require("../../shared/utils/economy");
const stateUtils_1 = require("../../shared/utils/stateUtils");
/**
 * Create initial multiplayer game state
 */
function createMultiplayerGameState(humanFactions, aiFaction) {
    const baseState = (0, initialState_1.createInitialState)();
    // Set up resources - humans get base, AI gets bonus
    const multiplayerResources = {
        [types_1.FactionId.REPUBLICANS]: {
            gold: aiFaction === types_1.FactionId.REPUBLICANS ? 2000 : 1000
        },
        [types_1.FactionId.CONSPIRATORS]: {
            gold: aiFaction === types_1.FactionId.CONSPIRATORS ? 850 : 350
        },
        [types_1.FactionId.NOBLES]: {
            gold: aiFaction === types_1.FactionId.NOBLES ? 1200 : 500
        },
        [types_1.FactionId.NEUTRAL]: { gold: 0 },
    };
    // Turn order: humans first (in faction order), then AI last
    // This ensures the game starts with a human player's turn
    const standardOrder = [types_1.FactionId.REPUBLICANS, types_1.FactionId.CONSPIRATORS, types_1.FactionId.NOBLES];
    const humanTurns = standardOrder.filter(f => humanFactions.includes(f));
    const turnOrder = aiFaction ? [...humanTurns, aiFaction] : humanTurns;
    // Calculate initial economy
    const calculatedLocations = (0, economy_1.calculateEconomyAndFood)(baseState.locations, baseState.armies, baseState.characters, baseState.roads);
    return {
        ...baseState,
        locations: calculatedLocations,
        resources: multiplayerResources,
        playerFaction: types_1.FactionId.NEUTRAL, // Server doesn't have a "player"
        showStartScreen: false,
        humanFactions,
        aiFaction,
        currentTurnFaction: turnOrder[0],
        turnOrder,
        currentTurnIndex: 0,
        logs: ['Multiplayer game started.']
    };
}
/**
 * Process a player action on the server
 * Returns the updated game state
 */
function processPlayerAction(state, action, playerFaction) {
    // Validate it's this player's turn
    if (state.currentTurnFaction !== playerFaction) {
        return {
            success: false,
            newState: state,
            error: `Not your turn. Current turn: ${types_1.FACTION_NAMES[state.currentTurnFaction]}`
        };
    }
    let updatedState = { ...state };
    switch (action.type) {
        case 'RECRUIT': {
            const result = (0, domain_1.executeRecruitment)(updatedState, action.locationId, playerFaction);
            if (!result.success) {
                return { success: false, newState: state, error: 'Failed to recruit' };
            }
            updatedState = { ...updatedState, ...result.newState };
            break;
        }
        case 'MOVE_ARMY': {
            const result = (0, domain_1.executeArmyMove)(updatedState, action.armyId, action.destinationId, playerFaction);
            if (!result.success) {
                return { success: false, newState: state, error: 'Failed to move army' };
            }
            updatedState = { ...updatedState, ...result.newState };
            break;
        }
        case 'SPLIT_ARMY': {
            const result = (0, domain_1.executeSplitArmy)(updatedState, action.armyId, action.amount);
            if (!result.armies) {
                return { success: false, newState: state, error: 'Failed to split army' };
            }
            updatedState = { ...updatedState, ...result };
            break;
        }
        case 'INCITE': {
            const result = (0, domain_1.executeIncite)(updatedState, action.locationId, action.characterId, action.gold, playerFaction);
            if (!result.success) {
                return { success: false, newState: state, error: 'Failed to incite' };
            }
            updatedState = { ...updatedState, ...result.newState };
            break;
        }
        case 'FORTIFY': {
            const result = (0, domain_1.executeFortify)(updatedState, action.locationType, action.id, playerFaction, action.stageIndex);
            if (!result.success) {
                return { success: false, newState: state, error: 'Failed to fortify' };
            }
            updatedState = { ...updatedState, ...result.newState };
            break;
        }
        case 'MERGE_REGIMENTS': {
            const result = (0, domain_1.executeMergeRegiments)(updatedState, action.locationId, playerFaction);
            if (!result.success) {
                return { success: false, newState: state, error: 'Failed to merge regiments' };
            }
            updatedState = { ...updatedState, ...result.newState };
            break;
        }
        case 'GARRISON': {
            const result = (0, domain_1.executeGarrison)(updatedState, action.armyId, playerFaction);
            if (!result.success) {
                return { success: false, newState: state, error: 'Failed to toggle garrison' };
            }
            updatedState = { ...updatedState, ...result.newState };
            break;
        }
        case 'SEND_CONVOY': {
            const result = (0, domain_1.executeSendConvoy)(updatedState, action.locationId, action.amount, action.destinationId, playerFaction);
            if (!result.success) {
                return { success: false, newState: state, error: result.error || 'Failed to send convoy' };
            }
            updatedState = { ...updatedState, ...result.newState };
            break;
        }
        case 'SEND_NAVAL_CONVOY': {
            const result = (0, domain_1.executeSendNavalConvoy)(updatedState, action.locationId, action.amount, action.destinationId, playerFaction);
            if (!result.success) {
                return { success: false, newState: state, error: result.error || 'Failed to send naval convoy' };
            }
            updatedState = { ...updatedState, ...result.newState };
            break;
        }
        case 'REVERSE_CONVOY': {
            const result = (0, domain_1.executeReverseConvoy)(updatedState, action.convoyId, playerFaction);
            if (!result.success) {
                return { success: false, newState: state, error: result.error || 'Failed to reverse convoy' };
            }
            updatedState = { ...updatedState, ...result.newState };
            break;
        }
        case 'ATTACH_LEADER': {
            const result = (0, domain_1.executeAttachLeader)(updatedState, action.armyId, action.characterId);
            if (!result.success) {
                return { success: false, newState: state, error: result.message || 'Failed to attach leader' };
            }
            updatedState = { ...updatedState, ...result.newState };
            break;
        }
        case 'DETACH_LEADER': {
            const result = (0, domain_1.executeDetachLeader)(updatedState, action.characterId);
            if (!result.success) {
                return { success: false, newState: state, error: result.message || 'Failed to detach leader' };
            }
            updatedState = { ...updatedState, ...result.newState };
            break;
        }
        case 'MOVE_LEADER': {
            const result = (0, domain_1.executeMoveLeader)(updatedState, action.characterId, action.destinationId);
            if (!result.success) {
                return { success: false, newState: state, error: result.message || 'Failed to move leader' };
            }
            updatedState = { ...updatedState, ...result.newState };
            break;
        }
        case 'NEGOTIATE': {
            const result = (0, domain_1.executeNegotiate)(updatedState, action.locationId, action.gold, action.food, action.foodSourceIds, playerFaction);
            if (!result.success) {
                return { success: false, newState: state, error: result.message || 'Failed to negotiate' };
            }
            updatedState = { ...updatedState, ...result.newState };
            break;
        }
        case 'REQUISITION': {
            const result = (0, domain_1.executeRequisition)(updatedState, action.locationId, action.resourceType, playerFaction);
            if (!result.success) {
                return { success: false, newState: state, error: result.message || 'Failed to requisition' };
            }
            updatedState = { ...updatedState, ...result.newState };
            break;
        }
        case 'UPDATE_CITY_MANAGEMENT': {
            const result = (0, domain_1.executeUpdateCityManagement)(updatedState, action.locationId, action.updates);
            if (!result.success) {
                return { success: false, newState: state, error: result.message || 'Failed to update city management' };
            }
            updatedState = { ...updatedState, ...result.newState };
            break;
        }
        case 'ATTACH_LEADER': {
            const result = (0, domain_1.executeAttachLeader)(updatedState, action.armyId, action.characterId);
            if (!result.success) {
                return { success: false, newState: state, error: result.message || 'Failed to attach leader' };
            }
            updatedState = { ...updatedState, ...result.newState };
            break;
        }
        case 'DETACH_LEADER': {
            const result = (0, domain_1.executeDetachLeader)(updatedState, action.characterId);
            if (!result.success) {
                return { success: false, newState: state, error: result.message || 'Failed to detach leader' };
            }
            updatedState = { ...updatedState, ...result.newState };
            break;
        }
        case 'MOVE_LEADER': {
            const result = (0, domain_1.executeMoveLeader)(updatedState, action.characterId, action.destinationId);
            if (!result.success) {
                return { success: false, newState: state, error: result.message || 'Failed to move leader' };
            }
            updatedState = { ...updatedState, ...result.newState };
            break;
        }
        default:
            return { success: false, newState: state, error: `Unknown action type: ${action.type}` };
    }
    // Check for battles after action
    const battles = (0, combatDetection_1.detectBattles)(updatedState.locations, updatedState.armies, updatedState.roads);
    const relevantBattles = battles.filter(b => b.attackerFaction === playerFaction || b.defenderFaction === playerFaction);
    if (relevantBattles.length > 0) {
        updatedState.combatState = relevantBattles[0];
        updatedState.combatQueue = relevantBattles.slice(1);
    }
    return { success: true, newState: updatedState };
}
/**
 * Advance to next turn
 */
async function advanceTurn(state) {
    // Move to next faction in turn order
    let newIndex = (state.currentTurnIndex + 1) % state.turnOrder.length;
    const nextFaction = state.turnOrder[newIndex];
    // If we wrapped around, process the full turn (AI, economy, etc.)
    let updatedState = { ...state };
    if (newIndex === 0) {
        // Process turn for ALL factions (AI movement, economy, etc.)
        const processed = await (0, turnProcessor_1.processTurn)({
            ...updatedState,
            playerFaction: state.aiFaction || types_1.FactionId.NEUTRAL // Let AI faction be processed
        });
        updatedState = {
            ...processed,
            humanFactions: state.humanFactions,
            aiFaction: state.aiFaction,
            turnOrder: state.turnOrder,
            currentTurnIndex: newIndex,
            currentTurnFaction: nextFaction
        };
    }
    else {
        updatedState.currentTurnIndex = newIndex;
        updatedState.currentTurnFaction = nextFaction;
    }
    const isAITurn = nextFaction === state.aiFaction;
    return { newState: updatedState, nextFaction, isAITurn };
}
// Re-export processAITurn from ./ai
var ai_1 = require("./ai");
Object.defineProperty(exports, "processAITurn", { enumerable: true, get: function () { return ai_1.processAITurn; } });
/**
 * Extract state for client (removes server-only fields)
 */
function getClientState(state) {
    return (0, stateUtils_1.extractCoreState)(state);
}
