/**
 * Initial Game State Factory - Generates the starting state for a new game
 * Consolidates logic from useGameEngine.ts INITIAL_STATE
 */
import { GameState, FactionId, Army } from '../types';
/**
 * Generate initial armies based on garrison data and locations
 */
export declare const generateInitialArmies: () => Army[];
/**
 * Generate initial resources based on player faction choice
 * AI factions receive boosted resources
 */
export declare const getInitialResources: (playerFaction: FactionId) => {
    REPUBLICANS: {
        gold: number;
    };
    CONSPIRATORS: {
        gold: number;
    };
    NOBLES: {
        gold: number;
    };
    NEUTRAL: {
        gold: number;
    };
};
import { MapId } from '../maps/types';
/**
 * Create the initial game state for starting a new game
 */
export declare const createInitialState: (playerFaction: FactionId, mapId?: MapId) => GameState;
