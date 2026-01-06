import { GameState, FactionId, AIMission } from '../../../types';
import { AITheater, FactionPersonality } from '../types';
/**
 * Generate CAMPAIGN missions for offensive operations.
 *
 * Only launches if:
 * - Theater is not critically weak (< 3:1 outnumbered)
 * - Below max concurrent campaigns for the theater
 *
 * @param state - Current game state
 * @param faction - Faction to generate for
 * @param theaters - Analyzed theaters
 * @param profile - Faction personality
 * @param activeMissions - Current active missions (modified in place)
 */
export declare function generateCampaignMissions(state: GameState, faction: FactionId, theaters: AITheater[], profile: FactionPersonality, activeMissions: AIMission[]): void;
