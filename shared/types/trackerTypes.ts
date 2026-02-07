/**
 * Tracker Types - DevTool for tracking faction metrics over time
 * Used by both solo (Application) and multiplayer (server) modes
 */

import { FactionId } from '../types';

/**
 * Categories of metrics that can be tracked
 */
export type TrackerCategory = 'GOLD' | 'STABILITY' | 'TROOPS' | 'LEADERS' | 'INCOME' | 'FOOD_BALANCE';

/**
 * Snapshot of a single faction's metrics at a specific turn
 */
export interface FactionSnapshot {
    gold: number;           // Treasury gold
    stability: number;      // Average stability of controlled territories
    troops: number;         // Total army strength
    leaders: number;        // Count of living leaders (not DEAD)
    income: number;         // Total gold income per turn
    foodBalance: number;    // Food production - consumption (can be negative)
}

/**
 * Complete snapshot of all factions for a single turn
 */
export interface TurnSnapshot {
    turn: number;
    factions: Partial<Record<FactionId, FactionSnapshot>>;
}

/**
 * Complete tracker state - history of all snapshots
 */
export interface TrackerState {
    enabled: boolean;
    snapshots: TurnSnapshot[];
}

/**
 * Initial empty tracker state
 */
export const createInitialTrackerState = (): TrackerState => ({
    enabled: false,
    snapshots: []
});
