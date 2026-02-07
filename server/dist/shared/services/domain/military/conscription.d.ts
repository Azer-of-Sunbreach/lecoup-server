/**
 * Conscription Service
 *
 * Handles the CONSCRIPTION ability logic - allows leaders with this ability
 * to recruit regiments at reduced gold cost but with stability penalty.
 *
 * Rules:
 * - Cost: 15g + 3 stability
 * - Requires CONSCRIPTION leader in location
 * - Each leader can conscript once per turn (tracked by usedConscriptionThisTurn)
 * - Location must have population > 2000
 * - Location must have stability >= 3 (to pay the cost)
 * - Separate from normal recruitment counter
 */
import { GameState, FactionId, Character } from '../../../types';
/** Gold cost for conscription */
export declare const CONSCRIPTION_GOLD_COST = 15;
/** Stability cost for conscription */
export declare const CONSCRIPTION_STABILITY_COST = 3;
/** Minimum population required for conscription */
export declare const CONSCRIPTION_MIN_POPULATION = 2000;
/**
 * Get CONSCRIPTION leaders at a location that haven't used their ability this turn.
 */
export declare function getAvailableConscriptionLeaders(locationId: string, faction: FactionId, characters: Character[]): Character[];
/**
 * Get the number of conscriptions available at a location.
 * Returns 0 if no CONSCRIPTION leaders present or conditions not met.
 */
export declare function getConscriptionCount(state: GameState, locationId: string, faction: FactionId): number;
export interface CanConscriptResult {
    canConscript: boolean;
    reason?: string;
    availableCount: number;
}
/**
 * Check if conscription is possible at a location.
 * For human players - only checks hard constraints.
 */
export declare function canConscript(state: GameState, locationId: string, faction: FactionId): CanConscriptResult;
export interface ConscriptionResult {
    success: boolean;
    newState: Partial<GameState>;
    message: string;
}
/**
 * Execute conscription at a location.
 */
export declare function executeConscription(state: GameState, locationId: string, faction: FactionId): ConscriptionResult;
