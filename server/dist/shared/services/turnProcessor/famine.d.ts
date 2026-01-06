import { GameState } from '../../types';
import { FamineProcessingResult } from './types';
/**
 * Process famine effects for all cities.
 *
 * Famine occurs when a city's projected food stock (current + income) is <= 0.
 * Effects:
 * - Stability drops by 30 (or 5 if stock is just low: < 50)
 * - Population dies (1000-5000 randomly)
 * - Armies in the city take losses (0-2500 randomly)
 * - If linked rural area also has no food, it suffers the same effects
 *
 * @param state - Current game state
 * @returns Updated locations, armies, stats and famine notification
 */
export declare function processFamine(state: GameState): FamineProcessingResult;
