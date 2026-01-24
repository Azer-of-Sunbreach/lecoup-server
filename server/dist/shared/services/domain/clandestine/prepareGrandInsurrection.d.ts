import { Character, Location, Army, LogEntry } from '../../../types';
import { ActiveClandestineAction } from '../../../types/clandestineTypes';
/**
 * Result of the Prepare Grand Insurrection process
 */
export interface PrepareGrandInsurrectionResult {
    updatedLeader: Character;
    updatedLocation: Location;
    updatedArmies?: Army[];
    newArmy?: Army;
    updatedAction?: ActiveClandestineAction;
    log?: LogEntry;
    feedbackLog?: LogEntry;
    isCompleted: boolean;
}
/**
 * Process the 'Prepare Grand Insurrection' action.
 *
 * Timeline:
 * - Turns 0-3: Waiting ("Preparing...").
 * - Turn 4: Execution.
 *
 * Execution Flow:
 * 1. Stability Shock (Ops * 4).
 * 2. Spawn Insurgent Army (Formula).
 * 3. Immediate Combat (No Fortification).
 * 4. Apply Outcome (Victory/Defeat/Death).
 */
export declare function processPrepareGrandInsurrection(leader: Character, location: Location, action: ActiveClandestineAction, armies: Army[], // Need all armies to find garrison
characters: Character[], // Need all characters for command bonuses
turn: number): PrepareGrandInsurrectionResult;
