/**
 * Server-side Game Logic Handler
 * Uses shared game logic to process player actions and manage game state
 */

import {
    GameState,
    FactionId,
    CoreGameState,
    GameAction,
    CombatState,
    FACTION_NAMES,
    LogType,
    LogSeverity
} from '../../shared/types';
import { createInitialState, getInitialResources } from '../../shared/data/initialState';
import { INITIAL_PLAYER_RESOURCES, INITIAL_AI_RESOURCES } from '../../shared/data/gameConstants';
import {
    executeRecruitment,
    executeArmyMove,
    executeSplitArmy,
    executeIncite,
    executeFortify,
    executeMergeRegiments,
    executeGarrison,
    executeSendConvoy,
    executeSendNavalConvoy,
    executeReverseConvoy,
    executeAttachLeader,
    executeDetachLeader,
    executeMoveLeader,
    executeNegotiate,
    executeRequisition,
    executeUpdateCityManagement
} from '../../shared/services/domain';
import { executeRetreat } from '../../shared/services/domain/retreat';
import { resolveCombatResult } from '../../shared/services/combat';
import { detectBattles } from '../../shared/services/combatDetection';
import { processTurn } from '../../shared/services/turnProcessor';
import { calculateEconomyAndFood } from '../../shared/utils/economy';
import { extractCoreState } from '../../shared/utils/stateUtils';
import { processAITurn } from './ai';

export interface MultiplayerGameState extends GameState {
    humanFactions: FactionId[];
    aiFaction: FactionId | null;
    currentTurnFaction: FactionId;
    turnOrder: FactionId[];
    currentTurnIndex: number;
}

/**
 * Create initial multiplayer game state
 */
export function createMultiplayerGameState(
    humanFactions: FactionId[],
    aiFaction: FactionId | null
): MultiplayerGameState {
    const baseState = createInitialState();

    // Set up resources - humans get base, AI gets bonus
    const multiplayerResources = {
        [FactionId.REPUBLICANS]: {
            gold: aiFaction === FactionId.REPUBLICANS ? INITIAL_AI_RESOURCES.REPUBLICANS : INITIAL_PLAYER_RESOURCES.REPUBLICANS
        },
        [FactionId.CONSPIRATORS]: {
            gold: aiFaction === FactionId.CONSPIRATORS ? INITIAL_AI_RESOURCES.CONSPIRATORS : INITIAL_PLAYER_RESOURCES.CONSPIRATORS
        },
        [FactionId.NOBLES]: {
            gold: aiFaction === FactionId.NOBLES ? INITIAL_AI_RESOURCES.NOBLES : INITIAL_PLAYER_RESOURCES.NOBLES
        },
        [FactionId.NEUTRAL]: { gold: 0 },
    };

    // Turn order: humans first (in faction order), then AI last
    // This ensures the game starts with a human player's turn
    const standardOrder = [FactionId.REPUBLICANS, FactionId.CONSPIRATORS, FactionId.NOBLES];
    const humanTurns = standardOrder.filter(f => humanFactions.includes(f));
    const turnOrder = aiFaction ? [...humanTurns, aiFaction] : humanTurns;

    // Calculate initial economy
    const calculatedLocations = calculateEconomyAndFood(
        baseState.locations,
        baseState.armies,
        baseState.characters,
        baseState.roads
    );

    return {
        ...baseState,
        locations: calculatedLocations,
        resources: multiplayerResources,
        playerFaction: FactionId.NEUTRAL, // Server doesn't have a "player"
        showStartScreen: false,
        humanFactions,
        aiFaction,
        currentTurnFaction: turnOrder[0],
        turnOrder,
        currentTurnIndex: 0,
        logs: [{ id: 'mp_start', type: LogType.GAME_START, message: 'Multiplayer game started.', turn: 1, visibleToFactions: [] as FactionId[], baseSeverity: LogSeverity.INFO }]
    };
}

/**
 * Process a player action on the server
 * Returns the updated game state
 */
export function processPlayerAction(
    state: MultiplayerGameState,
    action: GameAction,
    playerFaction: FactionId
): { success: boolean; newState: MultiplayerGameState; error?: string } {

    // Validate it's this player's turn
    if (state.currentTurnFaction !== playerFaction) {
        return {
            success: false,
            newState: state,
            error: `Not your turn. Current turn: ${FACTION_NAMES[state.currentTurnFaction]}`
        };
    }

    let updatedState = { ...state };

    switch (action.type) {
        case 'RECRUIT': {
            const result = executeRecruitment(updatedState, action.locationId, playerFaction);
            if (!result.success) {
                return { success: false, newState: state, error: 'Failed to recruit' };
            }
            updatedState = { ...updatedState, ...result.newState } as MultiplayerGameState;
            break;
        }

        case 'MOVE_ARMY': {
            const result = executeArmyMove(updatedState, action.armyId, action.destinationId, playerFaction);
            if (!result.success) {
                return { success: false, newState: state, error: 'Failed to move army' };
            }
            updatedState = { ...updatedState, ...result.newState } as MultiplayerGameState;
            break;
        }

        case 'SPLIT_ARMY': {
            const result = executeSplitArmy(updatedState, action.armyId, action.amount);
            if (!result.armies) {
                return { success: false, newState: state, error: 'Failed to split army' };
            }
            updatedState = { ...updatedState, ...result } as MultiplayerGameState;
            break;
        }

        case 'INCITE': {
            const result = executeIncite(updatedState, action.locationId, action.characterId, action.gold, playerFaction);
            if (!result.success) {
                return { success: false, newState: state, error: 'Failed to incite' };
            }
            updatedState = { ...updatedState, ...result.newState } as MultiplayerGameState;
            break;
        }

        case 'FORTIFY': {
            const result = executeFortify(updatedState, action.locationType, action.id, playerFaction, action.stageIndex);
            if (!result.success) {
                return { success: false, newState: state, error: 'Failed to fortify' };
            }
            updatedState = { ...updatedState, ...result.newState } as MultiplayerGameState;
            break;
        }

        case 'MERGE_REGIMENTS': {
            const result = executeMergeRegiments(updatedState, action.locationId, playerFaction);
            if (!result.success) {
                return { success: false, newState: state, error: 'Failed to merge regiments' };
            }
            updatedState = { ...updatedState, ...result.newState } as MultiplayerGameState;
            break;
        }

        case 'GARRISON': {
            const result = executeGarrison(updatedState, action.armyId, playerFaction);
            if (!result.success) {
                return { success: false, newState: state, error: 'Failed to toggle garrison' };
            }
            updatedState = { ...updatedState, ...result.newState } as MultiplayerGameState;
            break;
        }

        case 'SEND_CONVOY': {
            const result = executeSendConvoy(updatedState, action.locationId, action.amount, action.destinationId, playerFaction);
            if (!result.success) {
                return { success: false, newState: state, error: result.error || 'Failed to send convoy' };
            }
            updatedState = { ...updatedState, ...result.newState } as MultiplayerGameState;
            break;
        }

        case 'SEND_NAVAL_CONVOY': {
            const result = executeSendNavalConvoy(updatedState, action.locationId, action.amount, action.destinationId, playerFaction);
            if (!result.success) {
                return { success: false, newState: state, error: result.error || 'Failed to send naval convoy' };
            }
            updatedState = { ...updatedState, ...result.newState } as MultiplayerGameState;
            break;
        }

        case 'REVERSE_CONVOY': {
            const result = executeReverseConvoy(updatedState, action.convoyId, playerFaction);
            if (!result.success) {
                return { success: false, newState: state, error: result.error || 'Failed to reverse convoy' };
            }
            updatedState = { ...updatedState, ...result.newState } as MultiplayerGameState;
            break;
        }

        case 'ATTACH_LEADER': {
            const result = executeAttachLeader(updatedState, action.armyId, action.characterId);
            if (!result.success) {
                return { success: false, newState: state, error: result.message || 'Failed to attach leader' };
            }
            updatedState = { ...updatedState, ...result.newState } as MultiplayerGameState;
            break;
        }

        case 'DETACH_LEADER': {
            const result = executeDetachLeader(updatedState, action.characterId);
            if (!result.success) {
                return { success: false, newState: state, error: result.message || 'Failed to detach leader' };
            }
            updatedState = { ...updatedState, ...result.newState } as MultiplayerGameState;
            break;
        }

        case 'MOVE_LEADER': {
            const result = executeMoveLeader(updatedState, action.characterId, action.destinationId);
            if (!result.success) {
                return { success: false, newState: state, error: result.message || 'Failed to move leader' };
            }
            updatedState = { ...updatedState, ...result.newState } as MultiplayerGameState;
            break;
        }

        case 'RETREAT_ARMY': {
            const result = executeRetreat(updatedState, action.armyId);
            if (!result.success) {
                return { success: false, newState: state, error: result.message || 'Failed to reverse army' };
            }
            updatedState = { ...updatedState, ...result.newState } as MultiplayerGameState;
            break;
        }

        case 'NEGOTIATE': {
            const result = executeNegotiate(updatedState, action.locationId, action.gold, action.food, action.foodSourceIds, playerFaction);
            if (!result.success) {
                return { success: false, newState: state, error: result.message || 'Failed to negotiate' };
            }
            updatedState = { ...updatedState, ...result.newState } as MultiplayerGameState;
            break;
        }

        case 'REQUISITION': {
            console.log(`[SERVER REQUISITION] Before - ${playerFaction} gold: ${updatedState.resources[playerFaction].gold}`);
            const result = executeRequisition(updatedState, action.locationId, action.resourceType, playerFaction);
            if (!result.success) {
                return { success: false, newState: state, error: result.message || 'Failed to requisition' };
            }
            updatedState = { ...updatedState, ...result.newState } as MultiplayerGameState;
            console.log(`[SERVER REQUISITION] After - ${playerFaction} gold: ${updatedState.resources[playerFaction].gold}`);
            break;
        }

        case 'UPDATE_CITY_MANAGEMENT': {
            const result = executeUpdateCityManagement(updatedState, action.locationId, action.updates);
            if (!result.success) {
                return { success: false, newState: state, error: result.message || 'Failed to update city management' };
            }
            updatedState = { ...updatedState, ...result.newState } as MultiplayerGameState;
            break;
        }

        case 'ATTACH_LEADER': {
            const result = executeAttachLeader(updatedState, action.armyId, action.characterId);
            if (!result.success) {
                return { success: false, newState: state, error: result.message || 'Failed to attach leader' };
            }
            updatedState = { ...updatedState, ...result.newState } as MultiplayerGameState;
            break;
        }

        case 'DETACH_LEADER': {
            const result = executeDetachLeader(updatedState, action.characterId);
            if (!result.success) {
                return { success: false, newState: state, error: result.message || 'Failed to detach leader' };
            }
            updatedState = { ...updatedState, ...result.newState } as MultiplayerGameState;
            break;
        }

        case 'MOVE_LEADER': {
            const result = executeMoveLeader(updatedState, action.characterId, action.destinationId);
            if (!result.success) {
                return { success: false, newState: state, error: result.message || 'Failed to move leader' };
            }
            updatedState = { ...updatedState, ...result.newState } as MultiplayerGameState;
            break;
        }

        default:
            return { success: false, newState: state, error: `Unknown action type: ${action.type}` };
    }

    // Check for battles after action
    const battles = detectBattles(updatedState.locations, updatedState.armies, updatedState.roads);
    const relevantBattles = battles.filter(
        b => b.attackerFaction === playerFaction || b.defenderFaction === playerFaction
    );

    if (relevantBattles.length > 0) {
        updatedState.combatState = relevantBattles[0];
        updatedState.combatQueue = relevantBattles.slice(1);
    }

    return { success: true, newState: updatedState };
}

/**
 * Advance to next turn
 */
export async function advanceTurn(
    state: MultiplayerGameState
): Promise<{ newState: MultiplayerGameState; nextFaction: FactionId; isAITurn: boolean }> {

    // Move to next faction in turn order
    let newIndex = (state.currentTurnIndex + 1) % state.turnOrder.length;
    const nextFaction = state.turnOrder[newIndex];

    console.log(`[ADVANCE_TURN] currentTurnIndex=${state.currentTurnIndex} -> newIndex=${newIndex}`);
    console.log(`[ADVANCE_TURN] turnOrder=${JSON.stringify(state.turnOrder)}, nextFaction=${nextFaction}`);
    console.log(`[ADVANCE_TURN] Will processTurn run? newIndex === 0 ? ${newIndex === 0}`);

    // If we wrapped around, process the full turn (AI, economy, etc.)
    let updatedState = { ...state };
    if (newIndex === 0) {
        console.log(`[ADVANCE_TURN] Round wrapped! Calling processTurn...`);
        // Process turn for ALL factions (AI movement, economy, etc.)
        // IMPORTANT: Pass humanFactions so resolveAIBattles can exclude human battles
        const processed = await processTurn({
            ...updatedState,
            playerFaction: state.aiFaction || FactionId.NEUTRAL, // Let AI faction be processed
            humanFactions: state.humanFactions // Pass human factions for correct battle filtering
        } as any);

        console.log(`[ADVANCE_TURN] processTurn returned. combatState=${processed.combatState ? 'SET' : 'NULL'}`);
        if (processed.combatState) {
            console.log(`[ADVANCE_TURN] combatState: attacker=${processed.combatState.attackerFaction}, defender=${processed.combatState.defenderFaction}`);
        }
        console.log(`[ADVANCE_TURN] combatQueue length=${processed.combatQueue?.length || 0}`);

        updatedState = {
            ...processed as MultiplayerGameState,
            humanFactions: state.humanFactions,
            aiFaction: state.aiFaction,
            turnOrder: state.turnOrder,
            currentTurnIndex: newIndex,
            currentTurnFaction: nextFaction
        };

        console.log(`[ADVANCE_TURN] After merge: updatedState.combatState=${updatedState.combatState ? 'SET' : 'NULL'}`);
    } else {
        console.log(`[ADVANCE_TURN] No round wrap, skipping processTurn.`);
        updatedState.currentTurnIndex = newIndex;
        updatedState.currentTurnFaction = nextFaction;
    }

    const isAITurn = nextFaction === state.aiFaction;
    console.log(`[ADVANCE_TURN] Returning. isAITurn=${isAITurn}`);

    return { newState: updatedState, nextFaction, isAITurn };
}

// Re-export processAITurn and processSingleFactionAITurn from ./ai
export { processAITurn, processSingleFactionAITurn } from './ai';

/**
 * Extract state for client (removes server-only fields)
 */
export function getClientState(state: MultiplayerGameState): CoreGameState {
    return extractCoreState(state);
}
