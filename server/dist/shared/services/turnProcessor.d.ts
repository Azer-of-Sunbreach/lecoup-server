import { GameState } from '../types';
/**
 * Process a complete game turn.
 *
 * Phases:
 * 1. AI Planning & Execution
 * 2. Turn Advancement & Reset
 * 3. Movement & Collisions
 * 4. Events & Actions (Insurrections, Construction, Auto-Capture)
 * 5. Logistics (Convoys, Economy, Famine, Stability, Negotiations)
 * 6. AI Battle Resolution
 * 7. Narrative & Victory Check
 *
 * @param initialState - Game state before the turn
 * @returns Promise resolving to the updated game state
 */
export declare const processTurn: (initialState: GameState) => Promise<GameState>;
