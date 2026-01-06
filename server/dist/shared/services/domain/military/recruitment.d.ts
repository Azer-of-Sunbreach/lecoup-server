/**
 * Military Recruitment Service
 * Handles the logic for recruiting new regiments
 * Extracted from useGameEngine.ts recruit()
 */
import { GameState, FactionId } from '../../../types';
export interface RecruitResult {
    success: boolean;
    newState: Partial<GameState>;
    message: string;
}
/**
 * Check if recruitment is possible at a given location
 */
export declare const canRecruit: (state: GameState, locId: string, faction: FactionId) => {
    canRecruit: boolean;
    reason?: string;
};
/**
 * Execute recruitment at a location
 * Returns the state updates to apply
 */
export declare const executeRecruitment: (state: GameState, locId: string, faction: FactionId) => RecruitResult;
