import { GameState, FactionId } from '../../types';
import { AIBudget, FactionPersonality } from './types';
/**
 * Main economy management function for AI factions.
 *
 * Handles:
 * - Budget allocation and overrides
 * - Tax and food collection optimization
 * - Emergency seize actions (food/gold)
 * - Grain embargo (Windward special)
 * - Food logistics (convoys)
 * - Troop recruitment
 * - Fortification building
 *
 * @param state - Current game state
 * @param faction - Faction to process
 * @param profile - Faction personality
 * @param budget - AI budget allocation
 * @returns Partial state update
 */
export declare const manageEconomy: (state: GameState, faction: FactionId, profile: FactionPersonality, budget: AIBudget) => Partial<GameState>;
