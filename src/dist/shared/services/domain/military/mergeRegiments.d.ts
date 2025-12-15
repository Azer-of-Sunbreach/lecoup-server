/**
 * Merge Regiments Service
 * Handles merging multiple regiments into one at a location
 * Extracted from useGameEngine.ts handleMergeRegiments()
 */
import { GameState, FactionId } from '../../../types';
export interface MergeResult {
    success: boolean;
    newState: Partial<GameState>;
    message: string;
}
/**
 * Execute regiment merge at a location
 */
export declare const executeMergeRegiments: (state: GameState, locationId: string, faction: FactionId) => MergeResult;
