/**
 * Burn Operations - Clandestine Action
 *
 * Logic for "Burn crop fields" and "Start urban fire".
 */
import { Character, Location, LogEntry, ClandestineActionId } from '../../../types';
export interface BurnOperationResult {
    burnedAmount: number;
    resentmentIncrease: number;
    log?: LogEntry;
    feedbackLog?: LogEntry;
}
/**
 * Check if should disable based on budget or resource level
 */
export declare function shouldDisableBurnOperation(leaderBudget: number, resourceLevel: number, // Net Food or Total Revenue
threshold?: number): boolean;
/**
 * Process Burn Operation
 */
export declare function processBurnOperation(actionId: ClandestineActionId, leader: Character, location: Location, characters: Character[], turn: number): BurnOperationResult;
