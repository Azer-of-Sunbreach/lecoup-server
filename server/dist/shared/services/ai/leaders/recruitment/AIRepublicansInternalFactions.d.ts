/**
 * AI Republicans Internal Factions Service
 *
 * Orchestrates the AI decision for REPUBLICANS faction's internal faction choice:
 * - Rabble Victory (desperation mode)
 * - Knightly Coup (stabilization)
 * - Merchant Domination (development)
 *
 * Priority: Rabble Victory > Knightly Coup > Merchant Domination
 *
 * @module shared/services/ai/leaders/recruitment
 */
import { GameState, FactionId, Character, Location, RepublicanInternalFaction } from '../../../../types';
/** Turn at which internal faction decision becomes available */
export declare const INTERNAL_FACTION_MIN_TURN = 6;
/** Enable detailed logging */
export declare const ENABLE_INTERNAL_FACTION_LOGS = true;
export interface InternalFactionDecisionResult {
    /** Whether a choice was made this turn */
    choiceMade: boolean;
    /** Which option was chosen */
    chosenOption: RepublicanInternalFaction | null;
    /** Updated characters after choice */
    updatedCharacters?: Character[];
    /** Updated locations after choice */
    updatedLocations?: Location[];
    /** Gold cost paid */
    goldCost: number;
    /** Whether AI is in savings mode */
    inSavingsMode: boolean;
    /** Target option for savings mode */
    savingsTarget: 'KNIGHTLY_COUP' | 'MERCHANT_DOMINATION' | null;
    /** Amount saved so far */
    savedGold: number;
    /** Log messages for debugging */
    logs: string[];
}
export interface ConditionEvaluationResult {
    /** Whether conditions are met */
    conditionsMet: boolean;
    /** Whether AI can afford this option now */
    canAffordNow: boolean;
    /** Explanation for the evaluation */
    reasoning: string;
}
/**
 * Check conditions for Rabble Victory.
 *
 * Conditions:
 * 1. No complete city+rural pairs controlled
 * 2. Revenue < 100 gold/turn
 */
export declare function checkRabbleVictoryConditions(state: GameState, faction: FactionId): ConditionEvaluationResult;
/**
 * Check conditions for Knightly Coup.
 *
 * Conditions:
 * 1. 4+ territories controlled
 * 2. Revenue >= 100 gold/turn
 * 3. Average stability < 40
 * 4. Sum of core leader stability malus <= -7
 */
export declare function checkKnightlyCoupConditions(state: GameState, faction: FactionId): ConditionEvaluationResult;
/**
 * Check conditions for Merchant Domination.
 *
 * Conditions:
 * 1. 4+ territories controlled
 * 2. No besieged cities
 * 3. Merchant leaders' stability bonus > Core leaders' malus (living only)
 */
export declare function checkMerchantDominationConditions(state: GameState, faction: FactionId): ConditionEvaluationResult;
/**
 * Process internal faction decision for AI REPUBLICANS.
 *
 * Priority: Rabble Victory > Knightly Coup > Merchant Domination
 *
 * @param state - Current game state
 * @param faction - Must be REPUBLICANS
 * @param turn - Current turn number
 * @returns Decision result with updated state if a choice was made
 */
export declare function processRepublicanInternalFaction(state: GameState, faction: FactionId, turn: number): InternalFactionDecisionResult;
/**
 * Apply internal faction decision result to game state.
 */
export declare function applyInternalFactionResult(state: GameState, result: InternalFactionDecisionResult): GameState;
