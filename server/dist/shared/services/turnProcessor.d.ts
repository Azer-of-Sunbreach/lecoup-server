import { GameState, FactionId } from '../types';
/**
 * AI function types for injection
 */
export interface TurnProcessorOptions {
    /** Process AI turn (client-only, handles AI planning and execution) */
    processAITurn?: (state: GameState) => GameState;
    /** Generate narrative flavor text (client-only, may use external API) */
    generateTurnNarrative?: (turn: number, events: string[], faction: FactionId) => Promise<string>;
}
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
 * @param options - Optional AI functions to inject (client provides these)
 * @returns Promise resolving to the updated game state
 */
export declare const processTurn: (initialState: GameState, options?: TurnProcessorOptions) => Promise<GameState>;
