import { Character, Location, LogEntry } from '../../../types';
export interface DistributePamphletsResult {
    location: Location;
    log: LogEntry | null;
}
/**
 * Process the effects of distributing pamphlets.
 *
 * @param leader The undercover leader performing the action
 * @param location The location where the action takes place
 * @param turn Current game turn
 */
export declare function processDistributePamphlets(leader: Character, location: Location, turn: number): DistributePamphletsResult;
/**
 * Check if the action should be auto-disabled.
 * Conditions:
 * 1. Resentment against controller is 100
 * (Budget check handled by caller)
 */
export declare function shouldDisableDistributePamphlets(location: Location): boolean;
