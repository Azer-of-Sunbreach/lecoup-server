import { GameState, FactionId } from '../../../../shared/types';
import { AIBudget } from '../types';
/**
 * Execute the Republican early game strategy (Turns 1-2).
 * This is a scripted behavior to establish defensive positions.
 *
 * Turn 1:
 * - Deploy 500 soldiers to Heatherfield + build Pikes and Trenches
 * - Deploy 500 soldiers to Sunbreach Lighthouse + build Pikes and Trenches
 * - Recruit 4 times in Sunbreach Lands
 * - Recruit 4 times in Sunbreach
 *
 * Turn 2 (if situation is favorable):
 * - Reinforce both positions with 500 more soldiers
 * - Upgrade to Stone Tower (level 2)
 *
 * @returns Updated state partial
 */
export declare function executeRepublicanEarlyGame(state: GameState, faction: FactionId, budget: AIBudget): Partial<GameState>;
