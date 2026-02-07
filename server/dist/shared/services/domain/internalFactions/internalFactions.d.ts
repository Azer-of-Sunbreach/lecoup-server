/**
 * Internal Factions Domain Service
 *
 * Handles the gameplay effects when a player chooses an internal faction.
 * Part of the Republican faction's unique mechanics.
 *
 * @see implementation_plan.md - Knightly Coup Column
 */
import { Character, FactionId, Location, LeaderAbility } from '../../../types';
/** Cost in gold to choose Knightly Coup faction. Exported for UI use. */
export declare const KNIGHTLY_COUP_GOLD_COST = 250;
export interface KnightlyCoupResult {
    success: boolean;
    error?: string;
    updatedCharacters: Character[];
    goldCost: number;
}
/**
 * Execute the Knightly Coup internal faction choice.
 *
 * Effects:
 * 1. Argo loses AGITATIONAL_NETWORKS ability (disabled, not removed)
 * 2. Argo, Alia, Lain, Caelan, Tordis lose their -3% stability malus (set to 0)
 * 3. Sir Castelreach is recruited (DEAD→AVAILABLE, NEUTRAL→REPUBLICANS)
 * 4. Player pays KNIGHTLY_COUP_GOLD_COST gold
 *
 * @param characters - Current game characters
 * @param locations - Current game locations
 * @param playerFaction - Player's faction (should be REPUBLICANS)
 * @returns Result with updated characters and gold cost
 */
export declare function executeKnightlyCoupChoice(characters: Character[], locations: Location[], playerFaction: FactionId): KnightlyCoupResult;
/** Budget in gold that recruited leaders arrive with for clandestine missions */
export declare const RABBLE_MISSION_BUDGET = 400;
export interface RabbleVictoryResult {
    success: boolean;
    error?: string;
    updatedCharacters: Character[];
    /** IDs of recruited leaders (for modal triggering) */
    recruitedLeaderIds: string[];
    /** Location where leaders spawned */
    spawnLocationId: string | null;
}
/**
 * Execute the Victory of the Rabble internal faction choice.
 *
 * Effects:
 * 1. Alia, Lain, Caelan, Tordis gain AGITATIONAL_NETWORKS ability
 * 2. Argo, Alia, Lain, Caelan, Tordis get stability malus set to -4%
 * 3. Jack the Fox & Richard Fayre are recruited (DEAD→AVAILABLE, NEUTRAL→REPUBLICANS)
 *
 * @param characters - Current game characters
 * @param locations - Current game locations
 * @param playerFaction - Player's faction (should be REPUBLICANS)
 * @returns Result with updated characters and recruited leader IDs
 */
export declare function executeRabbleVictoryChoice(characters: Character[], locations: Location[], playerFaction: FactionId): RabbleVictoryResult;
/**
 * Helper function to check if a character has an active ability.
 * Respects both disabledAbilities and grantedAbilities from Internal Factions effects.
 *
 * @param character - Character to check
 * @param ability - Ability to check for
 * @returns true if character has the ability (base or granted) and it's not disabled
 */
export declare function hasActiveAbility(character: Character, ability: LeaderAbility): boolean;
/**
 * Get all active abilities for a character.
 * Combines base abilities with granted abilities, excludes disabled ones.
 *
 * @param character - Character to get abilities for
 * @returns Array of active ability IDs
 */
export declare function getActiveAbilities(character: Character): LeaderAbility[];
/**
 * Get the effective stability modifier for a character.
 * Uses stabilityModifierOverride if set, otherwise falls back to stats.stabilityPerTurn.
 *
 * @param character - Character to get stability for
 * @returns Effective stability modifier value
 */
export declare function getEffectiveStabilityModifier(character: Character): number;
/** Cost in gold to choose Merchant Domination faction */
export declare const MERCHANT_DOMINATION_GOLD_COST = 250;
export interface MerchantDominationResult {
    success: boolean;
    error?: string;
    updatedCharacters: Character[];
    updatedLocations?: Location[];
    spawnLocationId: string | null;
}
/**
 * Execute the Merchant Domination internal faction choice.
 *
 * Effects:
 * 1. Argo gains "Free-trader" trait
 * 2. Gaiard, Gildas, Clavestone are recruited (DEAD→AVAILABLE, NEUTRAL→REPUBLICANS)
 * 3. Player pays MERCHANT_DOMINATION_GOLD_COST gold
 *
 * @param characters - Current game characters
 * @param locations - Current game locations
 * @param playerFaction - Player's faction (should be REPUBLICANS)
 * @returns Result with updated characters
 */
export declare function executeMerchantDominationChoice(characters: Character[], locations: Location[], playerFaction: FactionId): MerchantDominationResult;
