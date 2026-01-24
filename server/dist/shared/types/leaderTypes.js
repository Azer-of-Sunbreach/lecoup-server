"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHARACTER_TRAIT_COLORS = exports.CHARACTER_TRAIT_TOOLTIPS = exports.LEADER_ABILITY_TOOLTIPS = exports.LEADER_STAT_TOOLTIPS = exports.CharacterTrait = exports.LeaderStatLevel = void 0;
/**
 * Stat levels for leader skills.
 * Used for: clandestineOps, discretion, statesmanship
 *
 * Numeric values reflect effectiveness multipliers in calculations.
 */
var LeaderStatLevel;
(function (LeaderStatLevel) {
    LeaderStatLevel[LeaderStatLevel["EXCEPTIONAL"] = 5] = "EXCEPTIONAL";
    LeaderStatLevel[LeaderStatLevel["EFFECTIVE"] = 4] = "EFFECTIVE";
    LeaderStatLevel[LeaderStatLevel["CAPABLE"] = 3] = "CAPABLE";
    LeaderStatLevel[LeaderStatLevel["UNRELIABLE"] = 2] = "UNRELIABLE";
    LeaderStatLevel[LeaderStatLevel["INEPT"] = 1] = "INEPT";
})(LeaderStatLevel || (exports.LeaderStatLevel = LeaderStatLevel = {}));
/**
 * Character traits that modify leader behavior automatically.
 * These traits override player control for certain actions.
 *
 * @see Specs: "Les traits de caractère font que certains leaders effectuent
 * automatiquement ou ne peuvent pas effectuer certaines actions"
 */
var CharacterTrait;
(function (CharacterTrait) {
    /**
     * As governor, will systematically make examples after suppressing insurrections.
     * Cannot be disabled by player.
     */
    CharacterTrait["IRON_FIST"] = "IRON_FIST";
    /**
     * As clandestine agent, cannot and will not order assassinations and arson.
     * Buttons are greyed out.
     */
    CharacterTrait["FAINT_HEARTED"] = "FAINT_HEARTED";
    /**
     * As clandestine agent, will systematically organize arson and small-scale insurrections.
     * Cannot be disabled by player. Priority: small-scale insurrections first.
     */
    CharacterTrait["SCORCHED_EARTH"] = "SCORCHED_EARTH";
})(CharacterTrait || (exports.CharacterTrait = CharacterTrait = {}));
/**
 * Tooltips for leader statistics.
 * Used in the Leaders Modal UI.
 */
exports.LEADER_STAT_TOOLTIPS = {
    command: 'Increase the battle power of an army by a fixed amount when commanding it. Is cumulative with others leaders\' command bonuses.',
    clandestineOps: 'The effectiveness of a given leader when performing operations in an enemy territory.',
    discretion: 'The more a leader is discrete, the less he is at risk of being caught when infiltrating an enemy territory or performing clandestine operations.',
    statesmanship: 'The ability of a leader to govern a territory effectively. The higher the level, the greater the effects.'
};
/**
 * Tooltips for leader abilities.
 * Used in the Leaders Modal UI.
 */
exports.LEADER_ABILITY_TOOLTIPS = {
    NONE: '',
    MANAGER: 'Generates 20 extra gold per turn when in a city your faction controls.',
    LEGENDARY: 'Prevents enemy faction from fomenting new insurrections in the territory he is in.',
    FIREBRAND: 'When organizing an insurrection, raise 33% more insurgents than a normal leader would.',
    MAN_OF_CHURCH: 'As a governor, is able to Stabilize region, Appease the minds, and Denounce your enemies at no cost.',
    DAREDEVIL: 'Has a chance to survive capture when acting as a clandestine agent, and to escape when being defeated while heading an insurrection.',
    GHOST: 'Systematically avoid detection when entering or leaving an enemy territory.',
    PARANOID: 'As a governor, passively increases the risk of enemy clandestine leaders of being caught at the end of each turn by 15 points.'
};
/**
 * Tooltips for character traits.
 * Used in the Leaders Modal UI.
 */
exports.CHARACTER_TRAIT_TOOLTIPS = {
    [CharacterTrait.IRON_FIST]: 'As a governor, will systematically make examples after suppressing insurrections.',
    [CharacterTrait.FAINT_HEARTED]: 'As a clandestine agent, cannot and will not order assassinations and arson.',
    [CharacterTrait.SCORCHED_EARTH]: 'As a clandestine agent, will systematically organize arson and insurrections.'
};
/**
 * Display colors for character traits in the Leaders Modal.
 */
exports.CHARACTER_TRAIT_COLORS = {
    [CharacterTrait.IRON_FIST]: 'text-red-400', // "écrit en rouge discret"
    [CharacterTrait.FAINT_HEARTED]: 'text-blue-400', // "écrit en bleu discret"
    [CharacterTrait.SCORCHED_EARTH]: 'text-red-400' // "écrit en rouge discret"
};
