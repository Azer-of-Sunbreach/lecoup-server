import { GameState, FactionId, Army } from '../../../shared/types';
import { FactionPersonality } from './types';
/**
 * Main military management function for AI factions.
 *
 * Processes all military missions and handles idle armies.
 * Mission priority: CAMPAIGN > DEFEND > ROAD_DEFENSE > others
 *
 * @param state - Current game state
 * @param faction - Faction to process
 * @param profile - Faction personality profile
 * @returns Updated armies array
 */
export declare const manageMilitary: (state: GameState, faction: FactionId, profile: FactionPersonality) => Army[];
