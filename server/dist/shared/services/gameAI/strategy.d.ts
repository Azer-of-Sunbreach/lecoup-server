import { GameState, FactionId, AIMission } from '../../types';
import { AITheater, AIGoal, FactionPersonality } from './types';
import { analyzeTheaters as analyzeTheatersImpl } from './strategy/index';
/**
 * Analyze the game map to identify theaters of operation.
 * Re-exported from theaters module for backward compatibility.
 */
export declare const analyzeTheaters: typeof analyzeTheatersImpl;
/**
 * Update and generate AI missions based on theaters and faction personality.
 *
 * Mission types:
 * - DEFEND: Protect owned territories
 * - CAMPAIGN: Offensive operations against enemies
 * - ROAD_DEFENSE: Control strategic road stages
 * - INSURRECTION: Destabilize enemy territories
 * - NEGOTIATE: Rally neutral territories
 * - STABILIZE: Improve stability in owned territories
 *
 * @param state - Current game state
 * @param faction - Faction to generate for
 * @param theaters - Analyzed theaters
 * @param profile - Faction personality
 * @returns Sorted list of missions by priority
 */
export declare const updateMissions: (state: GameState, faction: FactionId, theaters: AITheater[], profile: FactionPersonality) => AIMission[];
/**
 * Compatibility wrapper - returns empty array.
 * @deprecated Use updateMissions instead
 */
export declare const generateGoals: (state: GameState, faction: FactionId, theaters: AITheater[], profile: FactionPersonality) => AIGoal[];
