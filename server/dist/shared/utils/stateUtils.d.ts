import { GameState, CoreGameState, UIState, FactionId } from '../types';
/**
 * Extract CoreGameState from legacy GameState
 * Used when sending state over network
 */
export declare const extractCoreState: (state: GameState, gameId?: string) => CoreGameState;
/**
 * Extract UIState from legacy GameState
 * Used for local client state
 */
export declare const extractUIState: (state: GameState) => UIState;
/**
 * Combine CoreGameState and UIState back into legacy GameState
 * Used for backwards compatibility with existing components
 */
export declare const combineToLegacyState: (core: CoreGameState, ui: UIState) => GameState;
/**
 * Create initial UIState
 */
export declare const createInitialUIState: (faction: FactionId) => UIState;
/**
 * Determine turn order based on human players
 * Humans play before AI, in faction order: Republicans -> Conspirators -> Nobles
 */
export declare const calculateTurnOrder: (playerFactions: FactionId[], aiFaction: FactionId | null) => FactionId[];
/**
 * Get next faction in turn order
 */
export declare const getNextTurnFaction: (currentFaction: FactionId, turnOrder: FactionId[]) => FactionId;
/**
 * Check if it's a specific player's turn
 */
export declare const isPlayerTurn: (currentFaction: FactionId, myFaction: FactionId) => boolean;
