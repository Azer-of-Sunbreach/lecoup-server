/**
 * Leader Nobles Recruitment Evaluator
 *
 * Evaluates recruitable leaders for NOBLES faction AI recruitment decisions.
 * Uses gold-equivalent metrics to compare leaders against the fief cost (30g/turn).
 *
 * Evaluation components:
 * - stabilityPerTurn: Tax revenue potential from second most populous city
 * - clandestineOps/statesmanship: IPG calculations for missions/governor roles
 * - Abilities: Fixed bonuses based on strategic value
 * - Special effects: Leader-specific bonuses (ystrir gold, esmarch soldiers, etc.)
 *
 * @module shared/services/ai/leaders/evaluation
 */
import { Character, Location, Army } from '../../../../types';
import { LeaderAbilityNew } from '../../../../types/leaderTypes';
/** Assumed remaining game duration for value calculations */
export declare const ASSUMED_REMAINING_TURNS = 30;
/** Minimum fief cost per turn (threshold for recruitment) */
export declare const FIEF_COST_PER_TURN = 30;
/** Ability value bonuses (in gold-equivalent per turn over 30 turns) */
export declare const NOBLES_ABILITY_VALUES: Partial<Record<LeaderAbilityNew, number | ((territories: number) => number)>>;
export interface NoblesLeaderEvaluationContext {
    /** All locations in the game */
    locations: Location[];
    /** Locations controlled by NOBLES */
    controlledLocations: Location[];
    /** Current faction gold revenues (per turn) */
    factionRevenues: number;
    /** Current food surplus from city/rural pairs */
    foodSurplus: number;
    /** Number of living leaders for NOBLES */
    livingLeadersCount: number;
    /** All characters */
    characters: Character[];
    /** All armies */
    armies: Army[];
}
export interface NoblesLeaderEvaluationResult {
    leaderId: string;
    leaderName: string;
    /** Total calculated value in gold-equivalent per turn */
    totalValue: number;
    /** Breakdown of value components */
    breakdown: {
        stabilityValue: number;
        clandestineValue: number;
        governorValue: number;
        abilityBonuses: number;
        specialEffectValue: number;
    };
    /** Reasoning for the evaluation */
    reasoning: string[];
}
/** Leaders with priority evaluation (even when territories <= leaders or low revenues) */
export declare const PRIORITY_LEADERS: string[];
/**
 * Evaluate a recruitable leader for NOBLES faction.
 * Returns a gold-equivalent value per turn that can be compared to fief cost (30g/turn).
 */
export declare function evaluateNoblesRecruitableLeader(leader: Character, context: NoblesLeaderEvaluationContext): NoblesLeaderEvaluationResult;
/**
 * Evaluate all recruitable leaders and return sorted by value (descending).
 */
export declare function evaluateAllNoblesRecruitableLeaders(recruitableLeaders: Character[], context: NoblesLeaderEvaluationContext): NoblesLeaderEvaluationResult[];
/**
 * Get the best recruitable leader for NOBLES.
 * Returns null if no leaders are available.
 */
export declare function getBestNoblesRecruitableLeader(recruitableLeaders: Character[], context: NoblesLeaderEvaluationContext): NoblesLeaderEvaluationResult | null;
/**
 * Filter leaders based on recruitment conditions.
 *
 * - If territories <= livingLeaders OR revenues < 150 AND foodSurplus < 50:
 *   Only consider PRIORITY_LEADERS (ystrir, esmarch, etc.)
 * - Otherwise: consider all leaders
 */
export declare function filterNoblesRecruitableLeaders(recruitableLeaders: Character[], context: NoblesLeaderEvaluationContext): Character[];
