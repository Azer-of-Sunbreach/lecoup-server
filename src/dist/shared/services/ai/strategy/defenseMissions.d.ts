import { GameState, FactionId, AIMission } from '../../../types';
import { AITheater, FactionPersonality } from '../types';
/**
 * Generate DEFEND missions for threatened locations.
 *
 * Priority: Vital Cities > Strategic Locations > Unstable Regions
 *
 * @param state - Current game state
 * @param faction - Faction to generate for
 * @param theaters - Analyzed theaters
 * @param profile - Faction personality
 * @param activeMissions - Current active missions (modified in place)
 */
export declare function generateDefendMissions(state: GameState, faction: FactionId, theaters: AITheater[], profile: FactionPersonality, activeMissions: AIMission[]): void;
