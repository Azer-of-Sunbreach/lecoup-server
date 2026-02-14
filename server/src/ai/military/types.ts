// AI Military Types - Interfaces for military operations

import { GameState, FactionId, Army, AIMission, Character, Location, Road } from '../../../../shared/types';
import { FactionPersonality } from '../types';

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
export const STRATEGIC_LOCATIONS: Record<string, string[]> = {
    'REPUBLICANS': ['sunbreach', 'sunbreach_lands'],
    'CONSPIRATORS': ['stormbay', 'order_lands', 'great_plains', 'windward'],
    'NOBLES': ['port_de_sable', 'northern_barony']
};

/**
 * Idle army strategic deployment targets per faction
 */
export const IDLE_DEPLOYMENT_TARGETS: Record<string, string[]> = {
    'REPUBLICANS': ['sunbreach'],
    'CONSPIRATORS': ['stormbay', 'windward'],
    'NOBLES': ['port_de_sable']
};

/**
 * Siege cost table based on fortification level
 */
export const SIEGE_COST_TABLE: Record<number, number> = {
    1: 15,
    2: 30,
    3: 50,
    4: 100
};
