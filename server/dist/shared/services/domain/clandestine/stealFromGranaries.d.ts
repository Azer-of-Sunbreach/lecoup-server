/**
 * Steal From Granaries - Clandestine Action
 *
 * Logic for stealing (sabotaging) food from enemy granaries.
 */
import { Character, Location, LogEntry } from '../../../types';
export interface StealFromGranariesResult {
    destroyedAmount: number;
    log?: LogEntry;
    warningLog?: LogEntry;
    targetLocationId?: string;
}
/**
 * Check if the action should be disabled (e.g. no budget)
 */
export declare function shouldDisableStealFromGranaries(leaderBudget: number): boolean;
/**
 * Process the Steal From Granaries action
 */
export declare function processStealFromGranaries(leader: Character, location: Location, locations: Location[], turn: number): StealFromGranariesResult;
