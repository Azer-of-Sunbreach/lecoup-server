/**
 * SmugglerMissionService - AI Decision Service for SMUGGLER Ability
 *
 * This service handles the AI decision-making for SMUGGLER leaders when cities
 * lose control of their rural food supply (linkedLocation). When this happens,
 * the service identifies available SMUGGLER leaders and dispatches them to
 * provide emergency food supply (5-15 food/turn via smuggling networks).
 *
 * Key mechanics:
 * - SMUGGLER mission is CUMULATIVE with GOVERNOR role
 * - Leader can govern a city AND provide smuggling bonus
 * - Mission continues until city falls or linkedLocation is recaptured
 * - Silent cancellation when city falls (no alert)
 *
 * @module shared/services/ai/leaders/missions
 */
import { Character, FactionId, GameState } from '../../../../types';
export interface SmugglerMissionContext {
    state: GameState;
    faction: FactionId;
    lostRuralLocationId: string;
    cityId: string;
}
export interface SmugglerDispatchDecision {
    leaderId: string;
    leaderName: string;
    targetCityId: string;
    targetCityName: string;
    travelTime: number;
    reasoning: string;
}
export interface SmugglerCandidate {
    leader: Character;
    travelTime: number;
    isAlreadyAtCity: boolean;
    isGoverning: boolean;
    currentStability?: number;
}
/**
 * Evaluate whether to dispatch a SMUGGLER to a city that lost its rural food supply.
 *
 * Called when a faction loses control of a linkedLocation (rural area).
 *
 * @param context - The game state and relevant location IDs
 * @returns A dispatch decision, or null if no action needed/possible
 */
export declare function evaluateSmugglerDispatch(context: SmugglerMissionContext): SmugglerDispatchDecision | null;
/**
 * Check if a SMUGGLER mission should be cancelled.
 *
 * Conditions for silent cancellation:
 * - City falls to enemy or neutral
 * - City's linkedLocation is recaptured by our faction
 */
export declare function shouldCancelSmugglerMission(leader: Character, state: GameState): boolean;
/**
 * Mark a leader as being on a SMUGGLER mission.
 * This is cumulative with GOVERNOR role.
 */
export declare function assignSmugglerMission(leader: Character, targetCityId: string): Character;
/**
 * Clear SMUGGLER mission from a leader.
 */
export declare function clearSmugglerMission(leader: Character): Character;
