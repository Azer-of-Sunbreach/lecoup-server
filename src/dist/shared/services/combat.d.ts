import { GameState } from '../types';
import { applySequentialLosses, calculateCombatStrength } from './combat/index';
export { applySequentialLosses, calculateCombatStrength };
/**
 * Main combat resolution orchestrator.
 * Delegates to specialized handlers based on player choice.
 *
 * @param prevState - Current game state
 * @param choice - Player's combat choice (FIGHT, RETREAT, RETREAT_CITY, SIEGE)
 * @param siegeCost - Gold cost for siege (only for SIEGE choice)
 * @returns Partial game state updates
 */
export declare const resolveCombatResult: (prevState: GameState, choice: "FIGHT" | "RETREAT" | "RETREAT_CITY" | "SIEGE", siegeCost?: number) => Partial<GameState>;
