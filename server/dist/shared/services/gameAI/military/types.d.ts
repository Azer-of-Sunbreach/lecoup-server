import { GameState, FactionId, Army } from '../../../types';
/**
 * Context object for military operations
 */
export interface MilitaryContext {
    state: GameState;
    faction: FactionId;
    armies: Army[];
    assigned: Set<string>;
}
/**
 * Strategic locations configuration per faction
 */
export declare const STRATEGIC_LOCATIONS: Record<string, string[]>;
/**
 * Idle army strategic deployment targets per faction
 */
export declare const IDLE_DEPLOYMENT_TARGETS: Record<string, string[]>;
/**
 * Siege cost table based on fortification level
 */
export declare const SIEGE_COST_TABLE: Record<number, number>;
