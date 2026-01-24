import { GameState, FactionId } from '../../types';
export interface AIBudget {
    allocations: {
        diplomacy: number;
        [key: string]: any;
    };
    [key: string]: any;
}
/**
 * Distributes diplomacy budget to leaders for clandestine operations.
 * Transfers gold from faction treasury to leader.clandestineBudget.
 */
export declare function distributeClandestineBudget(state: GameState, faction: FactionId, budget: AIBudget): Partial<GameState>;
