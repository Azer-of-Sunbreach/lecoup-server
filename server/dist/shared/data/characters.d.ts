/**
 * Characters Data - All leaders and their initial state
 *
 * REFACTORED: Added new stats (clandestineOps, discretion, statesmanship),
 * new abilities (MAN_OF_CHURCH, DAREDEVIL, GHOST, PARANOID),
 * and character traits (IRON_FIST, FAINT_HEARTED, SCORCHED_EARTH).
 *
 * @see Spécifications fonctionnelles Nouvelle gestion des leaders.txt - Section 3
 */
import { Character, LeaderAbility } from '../types';
import { LeaderStatLevel, CharacterTrait } from '../types/leaderTypes';
/**
 * Extended Character type with new stats.
 * Used until the main Character interface is fully migrated.
 */
export interface CharacterNew extends Omit<Character, 'stats'> {
    /** Initial budget for clandestine operations (0 if not specified) */
    budget: number;
    stats: {
        stabilityPerTurn: number;
        commandBonus: number;
        clandestineOps: LeaderStatLevel;
        discretion: LeaderStatLevel;
        statesmanship: LeaderStatLevel;
        ability: LeaderAbility[];
        traits: CharacterTrait[];
        insurrectionValue: number;
    };
}
export declare const CHARACTERS_NEW: CharacterNew[];
import { Character as OldCharacter } from '../types';
/**
 * @deprecated Use CHARACTERS_NEW instead with the new stats structure.
 * This export is kept for backward compatibility during migration.
 */
export declare const CHARACTERS: OldCharacter[];
