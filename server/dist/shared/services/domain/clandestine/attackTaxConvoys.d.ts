/**
 * Attack Tax Convoys - Clandestine Action
 *
 * Logic for attacking tax convoys to steal gold.
 */
import { Character, Location, LogEntry } from '../../../types';
export interface AttackTaxConvoysResult {
    stolenAmount: number;
    log?: LogEntry;
    warningLog?: LogEntry;
}
/**
 * Check if the action should be disabled (e.g. no budget)
 */
export declare function shouldDisableAttackTaxConvoys(leaderBudget: number): boolean;
/**
 * Process the Attack Tax Convoys action
 */
export declare function processAttackTaxConvoys(leader: Character, location: Location, locations: Location[], turn: number): AttackTaxConvoysResult;
