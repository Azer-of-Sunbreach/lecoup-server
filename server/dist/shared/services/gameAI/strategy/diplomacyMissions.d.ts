import { GameState, FactionId, AIMission } from '../../../types';
import { AITheater, FactionPersonality } from '../types';
/**
 * Generate diplomacy-related missions: INSURRECTION, NEGOTIATE, STABILIZE.
 *
 * @param state - Current game state
 * @param faction - Faction to generate for
 * @param theaters - Analyzed theaters
 * @param profile - Faction personality
 * @param activeMissions - Current active missions (modified in place)
 */
export declare function generateDiplomacyMissions(state: GameState, faction: FactionId, theaters: AITheater[], profile: FactionPersonality, activeMissions: AIMission[]): void;
