// AI Economy Types - Interfaces and constants for economic operations

import { GameState, FactionId, Location, ManagementLevel } from '../../../types';
import { AIBudget } from '../types';

/**
 * Tax/Collection levels ordered from lowest to highest
 */
export const TAX_LEVELS: ManagementLevel[] = ['VERY_LOW', 'LOW', 'NORMAL', 'HIGH', 'VERY_HIGH'];

/**
 * Result of economy management
 */
export interface EconomyResult {
    locations: Location[];
    resources: GameState['resources'];
    convoys: GameState['convoys'];
    navalConvoys: GameState['navalConvoys'];
    armies: GameState['armies'];
    roads: GameState['roads'];
    logs: string[];
    grainTradeNotification?: GameState['grainTradeNotification'];
}

/**
 * Context for economic decisions
 */
export interface EconomyContext {
    state: GameState;
    faction: FactionId;
    budget: AIBudget;
    updates: Partial<GameState>;
    currentGold: number;
}
