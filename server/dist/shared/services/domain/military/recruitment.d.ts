/**
 * Military Recruitment Service
 * Handles the logic for recruiting new regiments
 * Extracted from useGameEngine.ts recruit()
 */
import { GameState, FactionId, Character } from '../../../types';
export interface RecruitResult {
    success: boolean;
    newState: Partial<GameState>;
    message: string;
}
/**
 * Result of the recruitment cost calculation
 */
export interface RecruitmentCostResult {
    cost: number;
}
/**
 * Get the recruitment cost at a location (always standard cost now).
 * CONSCRIPTION discount has been moved to separate conscription system.
 */
export declare const calculateRecruitCost: (_locationId: string, _faction: FactionId, _characters: Character[]) => RecruitmentCostResult;
/**
 * Check if recruitment is possible at a given location
 */
export declare const canRecruit: (state: GameState, locId: string, faction: FactionId) => {
    canRecruit: boolean;
    reason?: string;
    cost: number;
};
/**
 * Execute recruitment at a location
 * Returns the state updates to apply
 */
export declare const executeRecruitment: (state: GameState, locId: string, faction: FactionId) => RecruitResult;
