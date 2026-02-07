/**
 * AI Conspirators Recruitment Service
 * 
 * Orchestrates the full AI recruitment decision for CONSPIRATORS faction:
 * 1. Check if recruitment is needed (< 5 leaders, territories > leaders)
 * 2. Manage savings fund based on revenue matrix
 * 3. Evaluate available leaders when fund is ready
 * 4. Execute recruitment of best leader
 * 
 * @module shared/services/ai/leaders/recruitment
 */

import { GameState, FactionId, CharacterStatus, Location } from '../../../../types';
import { 
    getRecruitableConspiratorLeaders,
    getLivingConspiratorLeaders,
    executeRecruitLeader,
    CONSPIRATORS_RECRUITMENT_COST,
    CONSPIRATORS_MAX_LEADERS
} from '../../../domain/leaders/conspiratorsRecruitment';
import { executeRequisition } from '../../../domain/economy/requisition';
import {
    calculateSavingsForTurn,
    updateRecruitmentFund,
    consumeRecruitmentFund,
    getRecruitmentFund,
    RECRUITMENT_TARGET
} from './RecruitmentFundManager';
import {
    evaluateAllRecruitableLeaders,
    getBestRecruitableLeader,
    LeaderEvaluationContext
} from '../evaluation/LeaderRecruitmentEvaluator';
import { ENABLE_RECRUITMENT_LOGS } from './RecruitmentFundManager';

// ============================================================================
// TYPES
// ============================================================================

export interface AIRecruitmentResult {
    /** Updated game state after recruitment processing */
    updatedState: Partial<GameState>;
    /** Whether a leader was recruited this turn */
    leaderRecruited: boolean;
    /** ID of recruited leader (if any) */
    recruitedLeaderId?: string;
    /** Amount saved to fund this turn */
    amountSaved: number;
    /** Whether SEIZE_GOLD was used */
    usedSeizeGold: boolean;
    /** Log messages for debugging */
    logs: string[];
}

export interface RecruitmentBudgetAllocation {
    /** Amount to reserve from faction gold for recruitment fund */
    amountToReserve: number;
    /** Remaining gold after reservation */
    remainingGold: number;
    /** Whether SEIZE_GOLD should be executed */
    shouldSeizeGold: boolean;
    /** Location to seize gold from */
    seizeGoldLocationId?: string;
    /** Explanation for the allocation decision */
    reasoning: string;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Calculate how much budget to reserve for leader recruitment.
 * Call this BEFORE other budget allocations (after siege budget).
 * 
 * Returns the amount to deduct from available budget for the recruitment fund.
 */
export function calculateRecruitmentBudgetReservation(
    state: GameState,
    faction: FactionId
): RecruitmentBudgetAllocation {
    // Only CONSPIRATORS use this system for now
    if (faction !== FactionId.CONSPIRATORS) {
        return {
            amountToReserve: 0,
            remainingGold: state.resources[faction]?.gold || 0,
            shouldSeizeGold: false,
            reasoning: 'Not CONSPIRATORS faction'
        };
    }

    const factionGold = state.resources[faction]?.gold || 0;
    const savingsResult = calculateSavingsForTurn(state, faction);

    // Cap reservation at available gold
    const amountToReserve = Math.min(savingsResult.amountToSave, factionGold);

    return {
        amountToReserve,
        remainingGold: factionGold - amountToReserve,
        shouldSeizeGold: savingsResult.shouldSeizeGold,
        seizeGoldLocationId: savingsResult.seizeGoldLocationId,
        reasoning: savingsResult.reasoning
    };
}

/**
 * Process AI recruitment for CONSPIRATORS faction.
 * Call this after budget allocation to:
 * 1. Execute SEIZE_GOLD if needed
 * 2. Update recruitment fund
 * 3. Recruit best leader if fund is ready
 */
export function processAIRecruitment(
    state: GameState,
    faction: FactionId,
    amountToSave: number,
    seizeGoldLocationId?: string
): AIRecruitmentResult {
    const logs: string[] = [];
    let currentState = { ...state };
    let usedSeizeGold = false;

    // Only CONSPIRATORS use this system
    if (faction !== FactionId.CONSPIRATORS) {
        return {
            updatedState: {},
            leaderRecruited: false,
            amountSaved: 0,
            usedSeizeGold: false,
            logs: ['Not CONSPIRATORS faction - skipping recruitment']
        };
    }

    // Check preconditions
    const livingLeaders = getLivingConspiratorLeaders(currentState.characters);
    if (livingLeaders.length >= CONSPIRATORS_MAX_LEADERS) {
        logs.push(`[AI RECRUIT] Max leaders (${CONSPIRATORS_MAX_LEADERS}) already alive - skipping`);
        return {
            updatedState: {},
            leaderRecruited: false,
            amountSaved: 0,
            usedSeizeGold: false,
            logs
        };
    }

    // =========================================================================
    // STEP 1: Execute SEIZE_GOLD if needed (0 leaders emergency)
    // =========================================================================
    if (seizeGoldLocationId && livingLeaders.length === 0) {
        const seizeResult = executeRequisition(currentState, seizeGoldLocationId, 'GOLD', faction);
        if (seizeResult.success) {
            currentState = { ...currentState, ...seizeResult.newState };
            usedSeizeGold = true;
            logs.push(`[AI RECRUIT] SEIZE_GOLD executed at ${seizeGoldLocationId} (+50g, emergency 0 leaders)`);
        } else {
            logs.push(`[AI RECRUIT] SEIZE_GOLD failed: ${seizeResult.message}`);
        }
    }

    // =========================================================================
    // STEP 2: Update recruitment fund
    // =========================================================================
    const fundResult = updateRecruitmentFund(currentState, faction, amountToSave);
    currentState = {
        ...currentState,
        aiState: fundResult.updatedAiState
    };
    logs.push(fundResult.log);

    // =========================================================================
    // STEP 3: Check if we can recruit
    // =========================================================================
    if (!fundResult.canRecruit) {
        return {
            updatedState: {
                aiState: currentState.aiState,
                locations: currentState.locations,
                resources: currentState.resources
            },
            leaderRecruited: false,
            amountSaved: fundResult.amountSaved,
            usedSeizeGold,
            logs
        };
    }

    // =========================================================================
    // STEP 4: Evaluate and recruit best leader
    // =========================================================================
    const recruitableLeaders = getRecruitableConspiratorLeaders(currentState.characters);
    if (recruitableLeaders.length === 0) {
        logs.push('[AI RECRUIT] No recruitable leaders available');
        return {
            updatedState: {
                aiState: currentState.aiState,
                locations: currentState.locations,
                resources: currentState.resources
            },
            leaderRecruited: false,
            amountSaved: fundResult.amountSaved,
            usedSeizeGold,
            logs
        };
    }

    // Build evaluation context
    const controlledLocations = currentState.locations.filter(l => l.faction === faction);
    const factionRevenues = controlledLocations.reduce((sum, loc) => sum + (loc.goldIncome || 0), 0);

    const evaluationContext: LeaderEvaluationContext = {
        locations: currentState.locations,
        controlledLocations,
        factionRevenues,
        livingLeadersCount: livingLeaders.length,
        characters: currentState.characters,
        faction
    };

    // Evaluate all leaders and pick the best
    const evaluationResults = evaluateAllRecruitableLeaders(recruitableLeaders, evaluationContext);
    const bestLeader = evaluationResults[0];

    if (!bestLeader) {
        logs.push('[AI RECRUIT] No valid leader evaluation result');
        return {
            updatedState: {
                aiState: currentState.aiState,
                locations: currentState.locations,
                resources: currentState.resources
            },
            leaderRecruited: false,
            amountSaved: fundResult.amountSaved,
            usedSeizeGold,
            logs
        };
    }

    // Log all evaluated leaders when recruitment is happening
    if (ENABLE_RECRUITMENT_LOGS) {
        console.log(`[AI RECRUIT EVALUATION ${faction}] Evaluating ${evaluationResults.length} recruitable leaders:`);
        evaluationResults.forEach((result, index) => {
            console.log(`  ${index + 1}. ${result.leaderName}: ${result.totalValue.toFixed(1)} gold-equivalent`);
            console.log(`     ${result.reasoning.join(' | ')}`);
        });
        console.log(`[AI RECRUIT EVALUATION ${faction}] Selected: ${bestLeader.leaderName} (${bestLeader.totalValue.toFixed(1)})`);
    }

    logs.push(`[AI RECRUIT] Best leader: ${bestLeader.leaderName} (value=${bestLeader.totalValue.toFixed(1)})`);
    logs.push(`  Breakdown: ${bestLeader.reasoning.join(' | ')}`);

    // Execute recruitment
    const recruitResult = executeRecruitLeader(
        currentState.characters,
        bestLeader.leaderId,
        currentState.locations,
        controlledLocations,
        RECRUITMENT_TARGET // Use fund amount, not faction gold
    );

    if (!recruitResult.success) {
        logs.push(`[AI RECRUIT] Recruitment failed: ${recruitResult.error}`);
        return {
            updatedState: {
                aiState: currentState.aiState,
                locations: currentState.locations,
                resources: currentState.resources
            },
            leaderRecruited: false,
            amountSaved: fundResult.amountSaved,
            usedSeizeGold,
            logs
        };
    }

    // Consume the fund
    const consumeResult = consumeRecruitmentFund(currentState, faction);
    
    logs.push(`[AI RECRUIT] SUCCESS: Recruited ${bestLeader.leaderName} to ${recruitResult.destinationId}`);

    return {
        updatedState: {
            characters: recruitResult.updatedCharacters,
            aiState: consumeResult.updatedAiState,
            locations: currentState.locations,
            resources: currentState.resources
        },
        leaderRecruited: true,
        recruitedLeaderId: bestLeader.leaderId,
        amountSaved: fundResult.amountSaved,
        usedSeizeGold,
        logs
    };
}

/**
 * Full recruitment processing for a turn.
 * Combines budget reservation calculation and execution.
 */
export function processConspiratorRecruitmentTurn(
    state: GameState
): AIRecruitmentResult {
    const faction = FactionId.CONSPIRATORS;
    
    // Calculate budget reservation
    const budgetAllocation = calculateRecruitmentBudgetReservation(state, faction);
    
    // Process recruitment with the calculated values
    return processAIRecruitment(
        state,
        faction,
        budgetAllocation.amountToReserve,
        budgetAllocation.seizeGoldLocationId
    );
}
