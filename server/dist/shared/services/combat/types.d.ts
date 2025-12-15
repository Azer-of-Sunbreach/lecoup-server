import { GameState, Army, Character, CombatState, Road, Location } from '../../types';
/**
 * Context object passed to combat helper functions
 * Contains all the data needed to resolve combat without accessing global state
 */
export interface CombatContext {
    combat: CombatState;
    prevState: GameState;
    armies: Army[];
    characters: Character[];
    locations: Location[];
    roads: Road[];
}
/**
 * Result of applying sequential losses to armies
 */
export interface LossResult {
    updatedArmies: Army[];
    deadArmyIds: string[];
}
/**
 * Result of calculating a retreat position for an army
 */
export type RetreatPosition = Partial<Army>;
/**
 * Result of processing leader survival after combat
 */
export interface LeaderSurvivalResult {
    updatedCharacters: Character[];
    logMessages: string[];
}
/**
 * Result of siege action
 */
export interface SiegeResult {
    armies: Army[];
    locations: Location[];
    roads: Road[];
    resources: GameState['resources'];
    logMessage: string;
}
