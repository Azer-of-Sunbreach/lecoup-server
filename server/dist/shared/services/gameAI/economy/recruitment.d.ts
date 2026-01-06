import { FactionId, Location, Army } from '../../../types';
import { AIBudget, FactionPersonality } from '../types';
/**
 * Handle troop recruitment for AI faction.
 *
 * Priority: Locations with existing armies > High threat zones > High income
 * Merges new recruits into existing armies when possible.
 *
 * @param faction - Faction recruiting
 * @param locations - Locations array (modified in place)
 * @param armies - Armies array (modified in place)
 * @param budget - AI budget
 * @param profile - Faction personality
 * @param turn - Current game turn
 * @param currentGold - Available gold for spending
 * @returns Remaining gold after recruitment
 */
export declare function handleRecruitment(faction: FactionId, locations: Location[], armies: Army[], budget: AIBudget, profile: FactionPersonality, turn: number, currentGold: number): number;
