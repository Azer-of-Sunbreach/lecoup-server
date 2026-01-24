/**
 * Spread Propaganda - Clandestine Action
 *
 * Effect: Reduces resentment against the leader's faction each turn.
 * Amount = Leader's Clandestine Operations Level (1-5).
 *
 * Auto-disable: When resentment reaches 0.
 */
import { Character, Location, LogEntry, FactionId } from '../../../types';
export interface SpreadPropagandaResult {
    location: Location;
    log: LogEntry | null;
}
/**
 * Process the effects of spreading propaganda.
 *
 * @param leader The undercover leader performing the action
 * @param location The location where the action takes place
 * @param turn Current game turn
 */
export declare function processSpreadPropaganda(leader: Character, location: Location, turn: number): SpreadPropagandaResult;
/**
 * Check if the action should be auto-disabled.
 * Conditions:
 * 1. Resentment against leader's faction is 0
 * (Budget check handled by caller)
 */
export declare function shouldDisableSpreadPropaganda(location: Location, leaderFaction: FactionId): boolean;
