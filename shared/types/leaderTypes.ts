/**
 * Leader Types - New leader characteristics for the leader system refactoring
 * 
 * This file contains the new enums and interfaces for:
 * - Leader stat levels (Clandestine operations, Discretion, Statesmanship)
 * - Leader abilities (new ones added to existing)
 * - Character traits (Iron Fist, Faint-Hearted, Scorched Earth)
 * 
 * @see Spécifications fonctionnelles Nouvelle gestion des leaders.txt - Section 3
 */

/**
 * Stat levels for leader skills.
 * Used for: clandestineOps, discretion, statesmanship
 * 
 * Numeric values reflect effectiveness multipliers in calculations.
 */
export enum LeaderStatLevel {
    EXCEPTIONAL = 5,
    EFFECTIVE = 4,
    CAPABLE = 3,
    UNRELIABLE = 2,
    INEPT = 1
}

/**
 * Character traits that modify leader behavior automatically.
 * These traits override player control for certain actions.
 * 
 * @see Specs: "Les traits de caractère font que certains leaders effectuent
 * automatiquement ou ne peuvent pas effectuer certaines actions"
 */
export enum CharacterTrait {
    /**
     * As governor, will systematically make examples after suppressing insurrections.
     * Cannot be disabled by player.
     */
    IRON_FIST = 'IRON_FIST',

    /**
     * As clandestine agent, cannot and will not order assassinations and arson.
     * Buttons are greyed out.
     */
    FAINT_HEARTED = 'FAINT_HEARTED',

    /**
     * As clandestine agent, will systematically organize arson and small-scale insurrections.
     * Cannot be disabled by player. Priority: small-scale insurrections first.
     */
    SCORCHED_EARTH = 'SCORCHED_EARTH',

    /**
     * As a leader in a region, lowers the maximum tax and food collection levels by one.
     * Multiple FREE_TRADER leaders stack (each reduces cap by one more level).
     */
    FREE_TRADER = 'FREE_TRADER',

    /**
     * As governor, can only use HUNT_NETWORKS, MAKE_EXAMPLES, and RATIONING.
     * All other governor policies are disabled.
     */
    MAN_OF_ACTION = 'MAN_OF_ACTION'
}

/**
 * Extended leader abilities.
 * Includes existing abilities + new ones from the refactoring specs.
 */
export type LeaderAbilityNew =
    // Existing abilities (unchanged)
    | 'NONE'
    | 'MANAGER'      // Generates 20 extra gold per turn in a city
    | 'LEGENDARY'    // Prevents enemy insurrections in territory
    | 'FIREBRAND'    // +33% insurgents when organizing insurrection
    // New abilities
    | 'MAN_OF_CHURCH'  // As governor: Stabilize/Appease/Denounce cost 0
    | 'DAREDEVIL'      // Chance to survive capture/escape failed insurrection
    | 'GHOST'          // Avoid detection when entering/leaving enemy territory
    | 'PARANOID'       // As governor: +15 cumulated risk for enemy clandestine leaders
    | 'SMUGGLER'       // Generates food in a city if rural area is not controlled
    | 'ELITE_NETWORKS' // No costs for propaganda actions if resentment < 50
    | 'CONSCRIPTION'   // Reduces recruitment cost
    | 'AGITATIONAL_NETWORKS'; // +200 gold for new missions if resentment < 60

/**
 * Tooltips for leader statistics.
 * Used in the Leaders Modal UI.
 */
export const LEADER_STAT_TOOLTIPS = {
    command: 'Increase the battle power of an army by a fixed amount when commanding it. Is cumulative with others leaders\' command bonuses.',
    clandestineOps: 'The effectiveness of a given leader when performing operations in an enemy territory.',
    discretion: 'The more a leader is discrete, the less he is at risk of being caught when infiltrating an enemy territory or performing clandestine operations.',
    statesmanship: 'The ability of a leader to govern a territory effectively. The higher the level, the greater the effects.'
} as const;

/**
 * Tooltips for leader abilities.
 * Used in the Leaders Modal UI.
 */
export const LEADER_ABILITY_TOOLTIPS = {
    NONE: '',
    MANAGER: 'Generates 20 extra gold per turn when in a city your faction controls.',
    LEGENDARY: 'Prevents enemy faction from fomenting new insurrections in the territory he is in.',
    FIREBRAND: 'When organizing an insurrection, raise 33% more insurgents than a normal leader would.',
    MAN_OF_CHURCH: 'As a governor, is able to Stabilize region, Appease the minds, and Denounce your enemies at no cost.',
    DAREDEVIL: 'Has a chance to survive capture when acting as a clandestine agent, and to escape when being defeated while heading an insurrection.',
    GHOST: 'Systematically avoid detection when entering or leaving an enemy territory.',
    PARANOID: 'As a governor, passively increases the risk of enemy clandestine leaders of being caught at the end of each turn by 15 points.',
    SMUGGLER: 'When in a city you control whose rural area is controlled by another faction, generate up to 15 food per turn.',
    ELITE_NETWORKS: 'As long as resentment against your faction in a region is under 50, will incur no costs there for Undermine authorities, Distribute sediitous pamphlets and Spread propaganda.',
    CONSCRIPTION: 'Once per turn, reduce the recruitment cost in the region he\'s in from 50 to 25 gold.',
    AGITATIONAL_NETWORKS: 'When sent in a new clandestine mission in a region where resentment against your faction is below 60, gather 200 extra gold. Doesn\'t work when being exfiltrated.'
} as const;

/**
 * Tooltips for character traits.
 * Used in the Leaders Modal UI.
 */
export const CHARACTER_TRAIT_TOOLTIPS = {
    [CharacterTrait.IRON_FIST]: 'As a governor, will systematically make examples after suppressing insurrections.',
    [CharacterTrait.FAINT_HEARTED]: 'As a clandestine agent, cannot and will not order assassinations and arson.',
    [CharacterTrait.SCORCHED_EARTH]: 'As a clandestine agent, will systematically organize arson and insurrections.',
    [CharacterTrait.FREE_TRADER]: 'Each free trader in a given region lowers the maximum tax rate and food collection level by one.',
    [CharacterTrait.MAN_OF_ACTION]: 'Will not act as a governor, save for hunting enemy clandestine agents, making examples and organizing rationing.'
} as const;

/**
 * Display colors for character traits in the Leaders Modal.
 */
export const CHARACTER_TRAIT_COLORS = {
    [CharacterTrait.IRON_FIST]: 'text-red-400',       // "écrit en rouge discret"
    [CharacterTrait.FAINT_HEARTED]: 'text-blue-400',  // "écrit en bleu discret"
    [CharacterTrait.SCORCHED_EARTH]: 'text-red-400',  // "écrit en rouge discret"
    [CharacterTrait.FREE_TRADER]: 'text-green-400',   // Green for economic trait
    [CharacterTrait.MAN_OF_ACTION]: 'text-red-400'    // Red for restrictive trait
} as const;

/**
 * Extended stats interface for the new leader system.
 * Used in Character.stats
 */
export interface LeaderStatsNew {
    stabilityPerTurn: number;
    commandBonus: number;

    // New stats (replacing insurrectionValue)
    clandestineOps: LeaderStatLevel;
    discretion: LeaderStatLevel;
    statesmanship: LeaderStatLevel;

    // Abilities and traits
    ability: LeaderAbilityNew[];
    traits: CharacterTrait[];

    // DEPRECATED - kept for backward compatibility
    /** @deprecated Use clandestineOps instead. Will be removed in future version. */
    insurrectionValue?: number;
}
