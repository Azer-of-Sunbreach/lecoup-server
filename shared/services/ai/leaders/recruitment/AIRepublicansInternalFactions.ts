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

import { GameState, FactionId, Character, Location, CharacterStatus, RepublicanInternalFaction } from '../../../../types';
import {
    executeKnightlyCoupChoice,
    executeRabbleVictoryChoice,
    executeMerchantDominationChoice,
    getEffectiveStabilityModifier,
    KNIGHTLY_COUP_GOLD_COST,
    MERCHANT_DOMINATION_GOLD_COST
} from '../../../domain/internalFactions/internalFactions';
import { CHARACTERS_NEW } from '../../../../data/characters';
import { dispatchRabbleVictoryLeaders } from './RabbleVictoryInsurrectionService';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Turn at which internal faction decision becomes available */
export const INTERNAL_FACTION_MIN_TURN = 6;

/** Revenue threshold for Rabble Victory condition (below this = desperation) */
const RABBLE_REVENUE_THRESHOLD = 100;

/** Minimum territories for Knightly Coup and Merchant Domination */
const MIN_TERRITORIES_FOR_PAID_OPTIONS = 4;

/** Revenue threshold for paid options (above this = can afford) */
const MIN_REVENUE_FOR_PAID_OPTIONS = 100;

/** Stability threshold for Knightly Coup (below this = need stabilization) */
const KNIGHTLY_COUP_STABILITY_THRESHOLD = 40;

/** Stability malus threshold for Knightly Coup (sum of core leader malus) */
const KNIGHTLY_COUP_MALUS_THRESHOLD = -7;

/** Cost for both paid options */
const INTERNAL_FACTION_COST = 250;

/** Core republican leaders affected by stability malus */
const CORE_REPUBLICAN_STABILITY_LEADERS = ['argo', 'alia', 'lain', 'caelan', 'tordis'];

/** Merchant domination leaders (to calculate their stability bonus) */
const MERCHANT_LEADERS = ['gaiard', 'gildas', 'clavestone'];

/** Enable detailed logging */
export const ENABLE_INTERNAL_FACTION_LOGS = true;

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate faction's income per turn from controlled locations.
 */
function calculateFactionRevenue(locations: Location[], faction: FactionId): number {
    return locations
        .filter(loc => loc.faction === faction)
        .reduce((sum, loc) => sum + (loc.goldIncome || 0), 0);
}

/**
 * Get all locations controlled by a faction.
 */
function getControlledLocations(locations: Location[], faction: FactionId): Location[] {
    return locations.filter(loc => loc.faction === faction);
}

/**
 * Calculate average stability of controlled locations.
 */
function calculateAverageStability(locations: Location[]): number {
    if (locations.length === 0) return 100;
    const totalStability = locations.reduce((sum, loc) => sum + loc.stability, 0);
    return totalStability / locations.length;
}

/**
 * Check if faction controls any complete city+rural pairs.
 * A complete pair means both the city AND its linkedLocation are controlled.
 */
function hasCompleteCityRuralPair(locations: Location[], faction: FactionId): boolean {
    const controlledSet = new Set(
        locations.filter(loc => loc.faction === faction).map(loc => loc.id)
    );

    for (const loc of locations) {
        if (loc.faction === faction && loc.type === 'CITY' && loc.linkedLocationId) {
            if (controlledSet.has(loc.linkedLocationId)) {
                return true; // Found a complete pair
            }
        }
    }
    return false; // No complete pairs
}

/**
 * Check if any controlled city is besieged (cut off from its rural area).
 * A city is besieged if faction controls the city but NOT its linked rural.
 */
function hasBesiegedCity(locations: Location[], faction: FactionId): boolean {
    const controlledSet = new Set(
        locations.filter(loc => loc.faction === faction).map(loc => loc.id)
    );

    for (const loc of locations) {
        if (loc.faction === faction && loc.type === 'CITY' && loc.linkedLocationId) {
            if (!controlledSet.has(loc.linkedLocationId)) {
                return true; // City is cut off from its rural
            }
        }
    }
    return false;
}

/**
 * Calculate sum of stability modifiers for specified leaders.
 * Uses effective stability (respects overrides).
 */
function calculateLeaderStabilitySum(characters: Character[], leaderIds: string[]): number {
    let sum = 0;
    for (const id of leaderIds) {
        const leader = characters.find(c => c.id === id && c.status !== CharacterStatus.DEAD);
        if (leader) {
            sum += getEffectiveStabilityModifier(leader);
        }
    }
    return sum;
}

/**
 * Get potential stability bonus from merchant leaders (from base data).
 */
function getMerchantLeadersStabilityBonus(): number {
    let sum = 0;
    for (const id of MERCHANT_LEADERS) {
        const leaderData = CHARACTERS_NEW.find(c => c.id === id);
        if (leaderData) {
            sum += leaderData.stats.stabilityPerTurn;
        }
    }
    return sum;
}

// ============================================================================
// CONDITION EVALUATORS
// ============================================================================

/**
 * Check conditions for Rabble Victory.
 * 
 * Conditions:
 * 1. No complete city+rural pairs controlled
 * 2. Revenue < 100 gold/turn
 */
export function checkRabbleVictoryConditions(
    state: GameState,
    faction: FactionId
): ConditionEvaluationResult {
    const hasCompletePair = hasCompleteCityRuralPair(state.locations, faction);
    const revenue = calculateFactionRevenue(state.locations, faction);

    const conditionsMet = !hasCompletePair && revenue < RABBLE_REVENUE_THRESHOLD;

    return {
        conditionsMet,
        canAffordNow: true, // Rabble Victory is free
        reasoning: conditionsMet
            ? `Rabble Victory conditions MET: No complete pairs, revenue=${revenue} < ${RABBLE_REVENUE_THRESHOLD}`
            : `Rabble Victory conditions NOT met: hasCompletePair=${hasCompletePair}, revenue=${revenue}`
    };
}

/**
 * Check conditions for Knightly Coup.
 * 
 * Conditions:
 * 1. 4+ territories controlled
 * 2. Revenue >= 100 gold/turn
 * 3. Average stability < 40
 * 4. Sum of core leader stability malus <= -7
 */
export function checkKnightlyCoupConditions(
    state: GameState,
    faction: FactionId
): ConditionEvaluationResult {
    const controlled = getControlledLocations(state.locations, faction);
    const territoriesCount = controlled.length;
    const revenue = calculateFactionRevenue(state.locations, faction);
    const avgStability = calculateAverageStability(controlled);
    const leaderMalusSum = calculateLeaderStabilitySum(state.characters, CORE_REPUBLICAN_STABILITY_LEADERS);
    const factionGold = state.resources[faction]?.gold || 0;

    const hasEnoughTerritories = territoriesCount >= MIN_TERRITORIES_FOR_PAID_OPTIONS;
    const hasEnoughRevenue = revenue >= MIN_REVENUE_FOR_PAID_OPTIONS;
    const needsStabilization = avgStability < KNIGHTLY_COUP_STABILITY_THRESHOLD;
    const hasSignificantMalus = leaderMalusSum <= KNIGHTLY_COUP_MALUS_THRESHOLD;

    const conditionsMet = hasEnoughTerritories && hasEnoughRevenue && needsStabilization && hasSignificantMalus;
    const canAffordNow = factionGold >= INTERNAL_FACTION_COST;

    return {
        conditionsMet,
        canAffordNow,
        reasoning: conditionsMet
            ? `Knightly Coup conditions MET: ${territoriesCount} territories, revenue=${revenue}, avgStab=${avgStability.toFixed(1)}, malusSum=${leaderMalusSum}`
            : `Knightly Coup conditions NOT met: territories=${territoriesCount}/${MIN_TERRITORIES_FOR_PAID_OPTIONS}, revenue=${revenue}/${MIN_REVENUE_FOR_PAID_OPTIONS}, avgStab=${avgStability.toFixed(1)}/${KNIGHTLY_COUP_STABILITY_THRESHOLD}, malusSum=${leaderMalusSum}/${KNIGHTLY_COUP_MALUS_THRESHOLD}`
    };
}

/**
 * Check conditions for Merchant Domination.
 * 
 * Conditions:
 * 1. 4+ territories controlled
 * 2. No besieged cities
 * 3. Merchant leaders' stability bonus > Core leaders' malus (living only)
 */
export function checkMerchantDominationConditions(
    state: GameState,
    faction: FactionId
): ConditionEvaluationResult {
    const controlled = getControlledLocations(state.locations, faction);
    const territoriesCount = controlled.length;
    const isBesieged = hasBesiegedCity(state.locations, faction);
    const coreMalusSum = calculateLeaderStabilitySum(state.characters, CORE_REPUBLICAN_STABILITY_LEADERS);
    const merchantBonusSum = getMerchantLeadersStabilityBonus();
    const factionGold = state.resources[faction]?.gold || 0;

    const hasEnoughTerritories = territoriesCount >= MIN_TERRITORIES_FOR_PAID_OPTIONS;
    const notBesieged = !isBesieged;
    const merchantBetterThanMalus = merchantBonusSum > Math.abs(coreMalusSum);

    const conditionsMet = hasEnoughTerritories && notBesieged && merchantBetterThanMalus;
    const canAffordNow = factionGold >= INTERNAL_FACTION_COST;

    return {
        conditionsMet,
        canAffordNow,
        reasoning: conditionsMet
            ? `Merchant Domination conditions MET: ${territoriesCount} territories, notBesieged=${notBesieged}, merchantBonus=${merchantBonusSum} > |coreMalus|=${Math.abs(coreMalusSum)}`
            : `Merchant Domination NOT met: territories=${territoriesCount}/${MIN_TERRITORIES_FOR_PAID_OPTIONS}, notBesieged=${notBesieged}, merchantBonus=${merchantBonusSum} vs |coreMalus|=${Math.abs(coreMalusSum)}`
    };
}

// ============================================================================
// MAIN PROCESSING FUNCTION
// ============================================================================

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
export function processRepublicanInternalFaction(
    state: GameState,
    faction: FactionId,
    turn: number
): InternalFactionDecisionResult {
    const logs: string[] = [];

    // Validate faction
    if (faction !== FactionId.REPUBLICANS) {
        return {
            choiceMade: false,
            chosenOption: null,
            goldCost: 0,
            inSavingsMode: false,
            savingsTarget: null,
            savedGold: 0,
            logs: ['Not REPUBLICANS faction - skipping']
        };
    }

    // Check turn requirement
    if (turn < INTERNAL_FACTION_MIN_TURN) {
        logs.push(`[AI INTERNAL FACTION] Turn ${turn} < ${INTERNAL_FACTION_MIN_TURN} - not available yet`);
        return {
            choiceMade: false,
            chosenOption: null,
            goldCost: 0,
            inSavingsMode: false,
            savingsTarget: null,
            savedGold: 0,
            logs
        };
    }

    // Check if choice already made
    if (state.chosenInternalFaction) {
        logs.push(`[AI INTERNAL FACTION] Choice already made: ${state.chosenInternalFaction}`);
        return {
            choiceMade: false,
            chosenOption: null,
            goldCost: 0,
            inSavingsMode: false,
            savingsTarget: null,
            savedGold: 0,
            logs
        };
    }

    // Get current AI state for savings mode
    const aiInternalState = state.aiState?.[FactionId.REPUBLICANS]?.republicanInternalFaction;
    const currentSavingsMode = aiInternalState?.savingsMode || null;
    const currentSavedGold = aiInternalState?.savedGold || 0;
    const factionGold = state.resources[faction]?.gold || 0;

    logs.push(`[AI INTERNAL FACTION] Evaluating options (turn ${turn}, gold=${factionGold}, saved=${currentSavedGold})`);

    // =========================================================================
    // PRIORITY 1: Rabble Victory (free, desperation mode)
    // =========================================================================
    const rabbleCheck = checkRabbleVictoryConditions(state, faction);
    logs.push(`  Rabble Victory: ${rabbleCheck.reasoning}`);

    if (rabbleCheck.conditionsMet) {
        logs.push(`[AI INTERNAL FACTION] CHOOSING: Rabble Victory (desperation mode)`);

        const result = executeRabbleVictoryChoice(state.characters, state.locations, faction);
        if (result.success) {
            return {
                choiceMade: true,
                chosenOption: 'RABBLE_VICTORY',
                updatedCharacters: result.updatedCharacters,
                goldCost: 0,
                inSavingsMode: false,
                savingsTarget: null,
                savedGold: 0,
                logs
            };
        } else {
            logs.push(`  Rabble Victory execution failed: ${result.error}`);
        }
    }

    // =========================================================================
    // PRIORITY 2: Knightly Coup (250g, stabilization)
    // =========================================================================
    const knightlyCheck = checkKnightlyCoupConditions(state, faction);
    logs.push(`  Knightly Coup: ${knightlyCheck.reasoning}`);

    if (knightlyCheck.conditionsMet) {
        // Check if we're already in savings mode for this
        if (currentSavingsMode === 'KNIGHTLY_COUP' || knightlyCheck.canAffordNow) {
            const totalAvailable = factionGold + currentSavedGold;

            if (totalAvailable >= INTERNAL_FACTION_COST) {
                logs.push(`[AI INTERNAL FACTION] CHOOSING: Knightly Coup (gold=${totalAvailable})`);

                const result = executeKnightlyCoupChoice(state.characters, state.locations, faction);
                if (result.success) {
                    return {
                        choiceMade: true,
                        chosenOption: 'KNIGHTLY_COUP',
                        updatedCharacters: result.updatedCharacters,
                        goldCost: result.goldCost,
                        inSavingsMode: false,
                        savingsTarget: null,
                        savedGold: 0,
                        logs
                    };
                } else {
                    logs.push(`  Knightly Coup execution failed: ${result.error}`);
                }
            } else {
                // Continue saving
                logs.push(`[AI INTERNAL FACTION] Continuing savings for Knightly Coup (${totalAvailable}/${INTERNAL_FACTION_COST})`);
                return {
                    choiceMade: false,
                    chosenOption: null,
                    goldCost: 0,
                    inSavingsMode: true,
                    savingsTarget: 'KNIGHTLY_COUP',
                    savedGold: currentSavedGold,
                    logs
                };
            }
        } else {
            // Enter savings mode
            logs.push(`[AI INTERNAL FACTION] Entering savings mode for Knightly Coup`);
            return {
                choiceMade: false,
                chosenOption: null,
                goldCost: 0,
                inSavingsMode: true,
                savingsTarget: 'KNIGHTLY_COUP',
                savedGold: 0,
                logs
            };
        }
    }

    // =========================================================================
    // PRIORITY 3: Merchant Domination (250g, development)
    // =========================================================================
    const merchantCheck = checkMerchantDominationConditions(state, faction);
    logs.push(`  Merchant Domination: ${merchantCheck.reasoning}`);

    if (merchantCheck.conditionsMet) {
        // Check if we're already in savings mode for this
        if (currentSavingsMode === 'MERCHANT_DOMINATION' || merchantCheck.canAffordNow) {
            const totalAvailable = factionGold + currentSavedGold;

            if (totalAvailable >= INTERNAL_FACTION_COST) {
                logs.push(`[AI INTERNAL FACTION] CHOOSING: Merchant Domination (gold=${totalAvailable})`);

                const result = executeMerchantDominationChoice(state.characters, state.locations, faction);
                if (result.success) {
                    return {
                        choiceMade: true,
                        chosenOption: 'MERCHANT_DOMINATION',
                        updatedCharacters: result.updatedCharacters,
                        updatedLocations: result.updatedLocations,
                        goldCost: MERCHANT_DOMINATION_GOLD_COST,
                        inSavingsMode: false,
                        savingsTarget: null,
                        savedGold: 0,
                        logs
                    };
                } else {
                    logs.push(`  Merchant Domination execution failed: ${result.error}`);
                }
            } else {
                // Continue saving
                logs.push(`[AI INTERNAL FACTION] Continuing savings for Merchant Domination (${totalAvailable}/${INTERNAL_FACTION_COST})`);
                return {
                    choiceMade: false,
                    chosenOption: null,
                    goldCost: 0,
                    inSavingsMode: true,
                    savingsTarget: 'MERCHANT_DOMINATION',
                    savedGold: currentSavedGold,
                    logs
                };
            }
        } else {
            // Enter savings mode
            logs.push(`[AI INTERNAL FACTION] Entering savings mode for Merchant Domination`);
            return {
                choiceMade: false,
                chosenOption: null,
                goldCost: 0,
                inSavingsMode: true,
                savingsTarget: 'MERCHANT_DOMINATION',
                savedGold: 0,
                logs
            };
        }
    }

    // =========================================================================
    // No conditions met - exit savings mode if we were in one
    // =========================================================================
    if (currentSavingsMode) {
        logs.push(`[AI INTERNAL FACTION] Conditions for ${currentSavingsMode} no longer met - exiting savings mode`);
    }

    logs.push(`[AI INTERNAL FACTION] No option conditions met - waiting`);
    return {
        choiceMade: false,
        chosenOption: null,
        goldCost: 0,
        inSavingsMode: false,
        savingsTarget: null,
        savedGold: 0,
        logs
    };
}

/**
 * Apply internal faction decision result to game state.
 */
export function applyInternalFactionResult(
    state: GameState,
    result: InternalFactionDecisionResult
): GameState {
    let newState = { ...state };

    if (result.choiceMade && result.chosenOption) {
        // Update characters
        if (result.updatedCharacters) {
            newState.characters = result.updatedCharacters;
        }

        // Update locations (for Merchant Domination FREE_TRADER limits)
        if (result.updatedLocations) {
            newState.locations = result.updatedLocations;
        }

        // Record the choice
        newState.chosenInternalFaction = result.chosenOption;

        // === RABBLE VICTORY SPECIAL: Immediate dispatch ===
        if (result.chosenOption === 'RABBLE_VICTORY') {
            const dispatchResult = dispatchRabbleVictoryLeaders(newState, FactionId.REPUBLICANS);
            if (dispatchResult.success) {
                newState.characters = dispatchResult.updatedCharacters;
                // Add dispatch logs to result
                if (ENABLE_INTERNAL_FACTION_LOGS) {
                    dispatchResult.logs.forEach(log => console.log(log));
                }
            }
        }

        // Pay the cost
        if (result.goldCost > 0) {
            const currentGold = newState.resources[FactionId.REPUBLICANS]?.gold || 0;
            newState.resources = {
                ...newState.resources,
                [FactionId.REPUBLICANS]: {
                    ...newState.resources[FactionId.REPUBLICANS],
                    gold: currentGold - result.goldCost
                }
            };
        }

        // Clear savings mode
        const existingRepAiState = newState.aiState?.[FactionId.REPUBLICANS];
        newState.aiState = {
            ...newState.aiState,
            [FactionId.REPUBLICANS]: {
                theaters: existingRepAiState?.theaters || [],
                goals: existingRepAiState?.goals || [],
                missions: existingRepAiState?.missions || [],
                savings: existingRepAiState?.savings || 0,
                leaderRecruitmentFund: existingRepAiState?.leaderRecruitmentFund,
                republicanInternalFaction: {
                    savingsMode: null,
                    savedGold: 0,
                    decisionMade: true
                }
            }
        };
    } else if (result.inSavingsMode) {
        // Update savings mode state
        const existingRepAiState = newState.aiState?.[FactionId.REPUBLICANS];
        newState.aiState = {
            ...newState.aiState,
            [FactionId.REPUBLICANS]: {
                theaters: existingRepAiState?.theaters || [],
                goals: existingRepAiState?.goals || [],
                missions: existingRepAiState?.missions || [],
                savings: existingRepAiState?.savings || 0,
                leaderRecruitmentFund: existingRepAiState?.leaderRecruitmentFund,
                republicanInternalFaction: {
                    savingsMode: result.savingsTarget,
                    savedGold: result.savedGold,
                    decisionMade: false
                }
            }
        };
    }


    // Log results
    if (ENABLE_INTERNAL_FACTION_LOGS && result.logs.length > 0) {
        result.logs.forEach(log => console.log(log));
    }

    return newState;
}
