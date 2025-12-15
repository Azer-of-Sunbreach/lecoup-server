import { GameState } from '../../types';
export interface RetreatResult {
    success: boolean;
    newState: Partial<GameState>;
    message: string;
}
/**
 * Execute a retreat/reverse command for an army.
 *
 * - If on a road: flips direction
 * - If at a location: moves onto connected road toward origin
 * - Handles edge cases like enemy-controlled origins
 *
 * @param state - Current game state
 * @param armyId - ID of the army to retreat
 * @returns Result with updated state
 */
export declare function executeRetreat(state: GameState, armyId: string): RetreatResult;
