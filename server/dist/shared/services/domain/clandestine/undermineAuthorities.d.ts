/**
 * Undermine Authorities - Clandestine action effect processor
 *
 * Effect: Reduces stability by clandestineOps level each turn.
 * Risk: MODERATE
 * Cost: 10 gold/turn from leader budget
 *
 * @see Spécifications fonctionnelles Nouvelle gestion des leaders.txt
 */
import { Character, Location, LogEntry } from '../../../types';
/**
 * Process Undermine Authorities effect for a single leader.
 *
 * @param leader The clandestine agent performing the action
 * @param location The target location (enemy territory)
 * @param turn Current game turn
 * @returns Updated location and optional warning log for defender
 */
export declare function processUndermineAuthorities(leader: Character, location: Location, turn: number): {
    location: Location;
    log?: LogEntry;
    reductionAmount: number;
};
/**
 * Check if Undermine Authorities should be auto-disabled.
 * Conditions: budget empty OR stability at 0
 */
export declare function shouldDisableUndermineAuthorities(leaderBudget: number, locationStability: number): boolean;
