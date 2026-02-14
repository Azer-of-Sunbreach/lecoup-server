/**
 * executeImmediateGrandInsurrection.ts
 * 
 * Service for executing Grand Insurrection immediately when a leader has the PREEXISTING_CELLS ability.
 * This bypasses the normal 4-turn preparation period.
 * 
 * Clean Hexagonal Architecture: This service encapsulates the PREEXISTING_CELLS ability logic,
 * keeping GameView clean and focused on UI orchestration.
 */

import { Character, Location, Army, LogEntry, FactionId, CharacterStatus, CombatState } from '../../../types';
import { ActiveClandestineAction, ClandestineActionId } from '../../../types/clandestineTypes';
import { processPrepareGrandInsurrection, PrepareGrandInsurrectionResult } from './prepareGrandInsurrection';

/**
 * Result of immediate Grand Insurrection execution
 */
export interface ImmediateGrandInsurrectionResult {
    success: boolean;
    updatedCharacters: Character[];
    updatedLocations: Location[];
    updatedArmies: Army[];
    logs: LogEntry[];
    shouldCloseMenu: boolean;
    combatState?: CombatState; // If enemy garrison exists, trigger immediate battle
}

/**
 * Check if a leader has the PREEXISTING_CELLS ability
 */
export function hasPreexistingCells(leader: Character): boolean {
    return leader.stats.ability.includes('PREEXISTING_CELLS');
}

/**
 * Check if the action is a PREPARE_GRAND_INSURRECTION action
 */
export function isGrandInsurrectionAction(action: ActiveClandestineAction): boolean {
    return action.actionId === ClandestineActionId.PREPARE_GRAND_INSURRECTION;
}

/**
 * Check if immediate Grand Insurrection should be executed
 * Returns true if leader has PREEXISTING_CELLS and action is PREPARE_GRAND_INSURRECTION
 */
export function shouldExecuteImmediately(
    leader: Character,
    activeActions: ActiveClandestineAction[]
): boolean {
    if (!hasPreexistingCells(leader)) return false;
    return activeActions.some(isGrandInsurrectionAction);
}

/**
 * Execute Grand Insurrection immediately for a leader with PREEXISTING_CELLS ability.
 * 
 * This function:
 * 1. Finds the Grand Insurrection action in activeActions
 * 2. Executes it immediately via processPrepareGrandInsurrection
 * 3. Returns updated game state
 * 
 * @param leaderId - ID of the leader triggering the insurrection
 * @param activeActions - The active clandestine actions being set
 * @param characters - All game characters
 * @param locations - All game locations
 * @param armies - All game armies
 * @param turn - Current game turn
 * @returns Updated game state with insurrection results
 */
export function executeImmediateGrandInsurrection(
    leaderId: string,
    activeActions: ActiveClandestineAction[],
    characters: Character[],
    locations: Location[],
    armies: Army[],
    turn: number
): ImmediateGrandInsurrectionResult {
    // Find the leader
    const leader = characters.find(c => c.id === leaderId);
    if (!leader) {
        return {
            success: false,
            updatedCharacters: characters,
            updatedLocations: locations,
            updatedArmies: armies,
            logs: [],
            shouldCloseMenu: false
        };
    }

    // Check if we should execute immediately
    if (!shouldExecuteImmediately(leader, activeActions)) {
        return {
            success: false,
            updatedCharacters: characters,
            updatedLocations: locations,
            updatedArmies: armies,
            logs: [],
            shouldCloseMenu: false
        };
    }

    // Find the Grand Insurrection action
    const grandInsurrectionAction = activeActions.find(isGrandInsurrectionAction);
    if (!grandInsurrectionAction) {
        return {
            success: false,
            updatedCharacters: characters,
            updatedLocations: locations,
            updatedArmies: armies,
            logs: [],
            shouldCloseMenu: false
        };
    }

    // Find the location
    const location = locations.find(l => l.id === leader.locationId);
    if (!location) {
        return {
            success: false,
            updatedCharacters: characters,
            updatedLocations: locations,
            updatedArmies: armies,
            logs: [],
            shouldCloseMenu: false
        };
    }

    // Create action with turnStarted set to trigger immediate execution (4 turns ago)
    const immediateAction: ActiveClandestineAction = {
        ...grandInsurrectionAction,
        turnStarted: turn - 4
    };

    // Execute the insurrection
    const result: PrepareGrandInsurrectionResult = processPrepareGrandInsurrection(
        leader,
        location,
        immediateAction,
        armies,
        characters,
        turn
    );

    // Update characters array
    const updatedCharacters = characters.map(c =>
        c.id === leaderId ? result.updatedLeader : c
    );

    // Update locations array
    const updatedLocations = locations.map(l =>
        l.id === location.id ? result.updatedLocation : l
    );

    // Update armies
    let updatedArmies = result.updatedArmies || [...armies];
    if (result.newArmy) {
        updatedArmies = [...updatedArmies, result.newArmy];
    }

    // Collect logs
    const logs: LogEntry[] = [];
    if (result.log) {
        logs.push(result.log);
    }
    if (result.feedbackLog) {
        logs.push(result.feedbackLog);
    }

    console.log('[PREEXISTING_CELLS] Immediate Grand Insurrection executed!', {
        leader: leader.name,
        location: location.name,
        newArmy: result.newArmy?.strength,
        isCompleted: result.isCompleted
    });

    // Check for enemy garrison to trigger immediate combat
    let combatState: CombatState | undefined = undefined;
    if (result.newArmy) {
        const enemyArmies = updatedArmies.filter(a =>
            a.locationId === location.id &&
            a.faction !== leader.faction &&
            a.id !== result.newArmy!.id &&
            a.strength > 0
        );

        if (enemyArmies.length > 0) {
            // Create combat state for immediate battle
            const defenderFaction = enemyArmies[0].faction;
            combatState = {
                locationId: location.id,
                attackerFaction: leader.faction,
                defenderFaction: defenderFaction,
                attackers: [result.newArmy],
                defenders: enemyArmies,
                defenseBonus: location.fortificationLevel || 0,
                isInsurgentBattle: true
            };
            console.log('[PREEXISTING_CELLS] Combat state created:', combatState);
        }
    }

    return {
        success: true,
        updatedCharacters,
        updatedLocations,
        updatedArmies,
        logs,
        shouldCloseMenu: true, // Signal to close the ClandestineMenu
        combatState
    };
}
