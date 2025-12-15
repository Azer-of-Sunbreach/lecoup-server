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
    FACTION_NAMES
} from '../../shared/types';
import { createInitialState, getInitialResources } from '../../shared/data/initialState';
import {
    executeRecruitment,
    executeArmyMove,
    executeSplitArmy,
    executeIncite,
    executeFortify,
    executeMergeRegiments
} from '../../shared/services/domain';
import { resolveCombatResult } from '../../shared/services/combat';
import { detectBattles } from '../../shared/services/combatDetection';
import { processTurn } from '../../shared/services/turnProcessor';
import { calculateEconomyAndFood } from '../../shared/utils/economy';
import { extractCoreState } from '../../shared/utils/stateUtils';

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
            gold: aiFaction === FactionId.REPUBLICANS ? 2000 : 1000
        },
        [FactionId.CONSPIRATORS]: {
            gold: aiFaction === FactionId.CONSPIRATORS ? 850 : 350
        },
        [FactionId.NOBLES]: {
            gold: aiFaction === FactionId.NOBLES ? 1200 : 500
        },
        [FactionId.NEUTRAL]: { gold: 0 },
    };

    // Turn order: all factions in standard order
    const turnOrder = [FactionId.REPUBLICANS, FactionId.CONSPIRATORS, FactionId.NOBLES];

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
        logs: ['Multiplayer game started.']
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

    // If we wrapped around, process the full turn (AI, economy, etc.)
    let updatedState = { ...state };
    if (newIndex === 0) {
        // Process turn for ALL factions (AI movement, economy, etc.)
        const processed = await processTurn({
            ...updatedState,
            playerFaction: state.aiFaction || FactionId.NEUTRAL // Let AI faction be processed
        });
        updatedState = {
            ...processed as MultiplayerGameState,
            humanFactions: state.humanFactions,
            aiFaction: state.aiFaction,
            turnOrder: state.turnOrder,
            currentTurnIndex: newIndex,
            currentTurnFaction: nextFaction
        };
    } else {
        updatedState.currentTurnIndex = newIndex;
        updatedState.currentTurnFaction = nextFaction;
    }

    const isAITurn = nextFaction === state.aiFaction;

    return { newState: updatedState, nextFaction, isAITurn };
}

/**
 * Process AI turn
 */
export async function processAITurn(
    state: MultiplayerGameState
): Promise<MultiplayerGameState> {
    if (!state.aiFaction || state.currentTurnFaction !== state.aiFaction) {
        return state;
    }

    // AI processing is handled by processTurn
    const processed = await processTurn({
        ...state,
        playerFaction: state.aiFaction
    });

    return {
        ...processed as MultiplayerGameState,
        humanFactions: state.humanFactions,
        aiFaction: state.aiFaction,
        turnOrder: state.turnOrder,
        currentTurnIndex: state.currentTurnIndex,
        currentTurnFaction: state.currentTurnFaction
    };
}

/**
 * Extract state for client (removes server-only fields)
 */
export function getClientState(state: MultiplayerGameState): CoreGameState {
    return extractCoreState(state);
}
