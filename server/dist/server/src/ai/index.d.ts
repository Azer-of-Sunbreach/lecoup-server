import { GameState, FactionId } from '../../../shared/types';
/**
 * Process AI turn for a SINGLE faction (used in multiplayer)
 */
export declare const processSingleFactionAITurn: (gameState: GameState, faction: FactionId) => GameState;
export declare const processAITurn: (gameState: GameState) => GameState;
