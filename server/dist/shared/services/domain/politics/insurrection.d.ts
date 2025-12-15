/**
 * Insurrection Service
 * Handles player-initiated insurrections
 * Extracted from useGameEngine.ts incite()
 *
 * IMPORTANT: All validation is handled by the UI layer (LocationInfo.tsx):
 * - Enemy territory check (not neutral, not controlled)
 * - No pending insurrection for this location
 * - Leader availability (alive, not on mission, not attached to army)
 * - Sufficient gold
 * - LEGENDARY defender check (with proper error animation)
 * - Noble cannot incite in cities
 *
 * This service only executes the insurrection initiation.
 */
import { GameState, FactionId } from '../../../types';
export interface InciteResult {
    success: boolean;
    newState: Partial<GameState>;
    message: string;
}
/**
 * Execute insurrection initiation
 *
 * Assumes ALL UI-level validations have already passed.
 * Does not perform redundant validation - trust the UI.
 */
export declare const executeIncite: (state: GameState, locId: string, charId: string, goldAmount: number, faction: FactionId) => InciteResult;
