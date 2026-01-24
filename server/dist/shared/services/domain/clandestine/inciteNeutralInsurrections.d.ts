/**
 * Incite Neutral Insurrections - Clandestine Action Processor
 *
 * Generates neutral insurgent armies in enemy-controlled territories.
 *
 * @see ./insurrectionFormulas.ts - Centralized formulas for insurgent estimation
 * @module inciteNeutralInsurrections
 */
import { Character, Location, LogEntry, Army } from '../../../types';
import { ActiveClandestineAction } from '../../../types/clandestineTypes';
/**
 * Result of the incite neutral insurrections process
 */
export interface InciteInsurrectionResult {
    log?: LogEntry;
    feedbackLog?: LogEntry;
    newArmy?: Army;
    popDeduction?: number;
    refund?: number;
}
/**
 * Check if the action should be disabled (e.g. not enough budget)
 */
export declare function shouldDisableInciteNeutralInsurrections(leaderBudget: number): boolean;
/**
 * Calculate the number of insurgents to spawn
 */
export declare function calculateInsurgentStrength(leader: Character, location: Location): number;
/**
 * Process the Incite Neutral Insurrections action
 */
export declare function processInciteNeutralInsurrections(leader: Character, location: Location, activeAction: ActiveClandestineAction, turn: number): InciteInsurrectionResult;
