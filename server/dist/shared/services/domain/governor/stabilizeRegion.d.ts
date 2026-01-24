/**
 * stabilizeRegion.ts - Domain service for "Stabilize Region" governor policy
 *
 * Effect: Increase stability by Statesmanship level per turn.
 * Cost: Handled by processor (10g/turn)
 * Auto-disable: Revenue=0 OR Stability=100
 */
import { Location, Character, LogEntry } from '../../../types';
/**
 * Check if Stabilize Region should be disabled.
 */
export declare function shouldDisableStabilizeRegion(location: Location, factionRevenue: number, factionGold: number): {
    shouldDisable: boolean;
    reason?: 'revenue_zero' | 'stability_max' | 'bankruptcy';
};
/**
 * Process Stabilize Region policy effect.
 * Assumes cost has been paid.
 */
export declare function processStabilizeRegion(governor: Character, location: Location, turn: number): {
    location: Location;
    log?: LogEntry;
};
export declare function isStabilizeRegionActive(location: Location): boolean;
