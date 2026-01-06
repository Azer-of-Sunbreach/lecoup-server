import { GameState, FactionId, Location } from '../../../../shared/types';
interface SeizeResult {
    locations: Location[];
    goldGained: number;
    foodGained: number;
    logs: string[];
}
/**
 * Handle emergency seize actions for AI faction.
 *
 * Seize Food: When a city faces imminent famine (foodStock < 50 AND foodIncome < 0)
 * Seize Gold: When faction gold < 100 AND critical need (campaign active OR recruiting blocked)
 *
 * Rules:
 * - Stability must be >= 15% to seize
 * - Seize reduces stability by 15%
 * - Prioritize locations with stability > 65% for gold (>50% safety margin)
 * - 1 seize per location per turn
 *
 * @param faction - Faction executing
 * @param state - Current game state
 * @param locations - Locations array (will be modified)
 * @returns Updated locations and amounts seized
 */
export declare function handleSeizeActions(faction: FactionId, state: GameState, locations: Location[]): SeizeResult;
export {};
