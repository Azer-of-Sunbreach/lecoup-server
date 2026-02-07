/**
 * Leader Recruitment Evaluator
 *
 * Evaluates recruitable leaders to determine their value for AI recruitment decisions.
 * Uses IPG-compatible metrics to compare leaders on a unified gold-equivalent scale.
 *
 * Evaluation considers:
 * - stabilityPerTurn: Converted to gold value via tax revenue potential
 * - clandestineOps/statesmanship: Uses existing IPG calculations
 * - Abilities: Fixed bonuses based on strategic value
 *
 * @module shared/services/ai/leaders/evaluation
 */
import { Character, Location, FactionId } from '../../../../types';
/** Assumed remaining game duration for value calculations */
export declare const ASSUMED_REMAINING_TURNS = 30;
/** Ability value bonuses (in gold-equivalent per recruitment) */
export declare const ABILITY_VALUES: Record<string, number | ((territories: number) => number)>;
export interface LeaderEvaluationContext {
    /** All locations in the game */
    locations: Location[];
    /** Locations controlled by the evaluating faction */
    controlledLocations: Location[];
    /** Current faction revenues (gold per turn) */
    factionRevenues: number;
    /** Number of living leaders for the faction */
    livingLeadersCount: number;
    /** All characters (for reference) */
    characters: Character[];
    /** The faction doing the evaluation */
    faction: FactionId;
}
export interface LeaderEvaluationResult {
    leaderId: string;
    leaderName: string;
    /** Total calculated value in gold-equivalent */
    totalValue: number;
    /** Breakdown of value components */
    breakdown: {
        stabilityValue: number;
        clandestineValue: number;
        governorValue: number;
        abilityBonuses: number;
    };
    /** Reasoning for the evaluation */
    reasoning: string[];
}
/**
 * Evaluate a recruitable leader for CONSPIRATORS faction.
 * Returns a gold-equivalent value that can be compared across leaders.
 */
export declare function evaluateRecruitableLeader(leader: Character, context: LeaderEvaluationContext): LeaderEvaluationResult;
/**
 * Evaluate all recruitable leaders and return sorted by value (descending).
 */
export declare function evaluateAllRecruitableLeaders(recruitableLeaders: Character[], context: LeaderEvaluationContext): LeaderEvaluationResult[];
/**
 * Get the best recruitable leader for a faction.
 * Returns null if no leaders are available.
 */
export declare function getBestRecruitableLeader(recruitableLeaders: Character[], context: LeaderEvaluationContext): LeaderEvaluationResult | null;
