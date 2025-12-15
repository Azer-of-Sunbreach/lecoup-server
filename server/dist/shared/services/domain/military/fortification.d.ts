/**
 * Fortification Service
 * Handles construction of fortifications at locations and road stages
 * Extracted from useGameEngine.ts handleFortify()
 */
import { GameState, FactionId } from '../../../types';
export interface FortifyResult {
    success: boolean;
    newState: Partial<GameState>;
    message: string;
}
/**
 * Execute fortification construction
 */
export declare const executeFortify: (state: GameState, type: "LOCATION" | "ROAD_STAGE", id: string, faction: FactionId, stageIndex?: number) => FortifyResult;
