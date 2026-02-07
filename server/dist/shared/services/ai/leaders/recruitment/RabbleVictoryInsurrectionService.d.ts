/**
 * Rabble Victory Insurrection Service
 *
 * Specialized service to immediately dispatch jack_the_fox and richard_fayre
 * on GRAND_INSURRECTION missions after Rabble Victory is chosen.
 *
 * Target selection priority:
 * 1. City+rural pairs where AI controls neither (full conquest opportunity)
 * 2. Cities where AI controls linked rural (consolidation)
 * 3. Rurals where AI controls linked city (consolidation)
 *
 * Selection criteria: Maximum raw insurgent count using calculateGrandInsurgents
 *
 * @module shared/services/ai/leaders/recruitment
 */
import { GameState, Character, FactionId } from '../../../../types';
export interface InsurrectionTarget {
    /** Target location ID */
    locationId: string;
    /** Location name for logging */
    locationName: string;
    /** Expected insurgent count */
    expectedInsurgents: number;
    /** Type of target opportunity */
    targetType: 'FULL_CONQUEST' | 'CITY_CONSOLIDATION' | 'RURAL_CONSOLIDATION';
    /** Description for logging */
    description: string;
}
export interface RabbleDispatchResult {
    /** Whether dispatch was successful */
    success: boolean;
    /** Updated characters with mission assignments */
    updatedCharacters: Character[];
    /** Details of assigned missions */
    assignments: {
        leaderId: string;
        leaderName: string;
        targetId: string;
        targetName: string;
        expectedInsurgents: number;
    }[];
    /** Log messages */
    logs: string[];
}
/**
 * Immediately dispatch Rabble Victory leaders on GRAND_INSURRECTION missions.
 *
 * Called right after Rabble Victory is chosen to assign jack_the_fox and
 * richard_fayre to optimal targets.
 *
 * @param state - Current game state (after Rabble Victory choice)
 * @param faction - Must be REPUBLICANS
 * @returns Dispatch result with updated characters
 */
export declare function dispatchRabbleVictoryLeaders(state: GameState, faction: FactionId): RabbleDispatchResult;
