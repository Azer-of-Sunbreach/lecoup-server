import { FactionId, Location, Army, Road } from '../../../types';
import { AIBudget, FactionPersonality } from '../types';
/**
 * Handle fortification building for AI faction.
 *
 * Builds on locations and road stages according to:
 * - Strategic importance (key cities get priority)
 * - Available garrison (must have troops to hold)
 * - Natural defense check (don't build on naturally defended stages)
 *
 * @param faction - Faction building
 * @param locations - Locations array (modified in place)
 * @param roads - Roads array (modified in place)
 * @param armies - Armies array (modified in place)
 * @param budget - AI budget
 * @param profile - Faction personality
 * @param currentGold - Available gold for spending
 * @returns Remaining gold after fortification
 */
export declare function handleFortifications(faction: FactionId, locations: Location[], roads: Road[], armies: Army[], budget: AIBudget, profile: FactionPersonality, currentGold: number): number;
