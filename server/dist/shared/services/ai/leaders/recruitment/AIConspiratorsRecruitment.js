"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRecruitmentBudgetReservation = calculateRecruitmentBudgetReservation;
exports.processAIRecruitment = processAIRecruitment;
exports.processConspiratorRecruitmentTurn = processConspiratorRecruitmentTurn;
const types_1 = require("../../../../types");
const conspiratorsRecruitment_1 = require("../../../domain/leaders/conspiratorsRecruitment");
const requisition_1 = require("../../../domain/economy/requisition");
const RecruitmentFundManager_1 = require("./RecruitmentFundManager");
const LeaderRecruitmentEvaluator_1 = require("../evaluation/LeaderRecruitmentEvaluator");
const RecruitmentFundManager_2 = require("./RecruitmentFundManager");
// ============================================================================
// MAIN FUNCTIONS
// ============================================================================
/**
 * Calculate how much budget to reserve for leader recruitment.
 * Call this BEFORE other budget allocations (after siege budget).
 *
 * Returns the amount to deduct from available budget for the recruitment fund.
 */
function calculateRecruitmentBudgetReservation(state, faction) {
    // Only CONSPIRATORS use this system for now
    if (faction !== types_1.FactionId.CONSPIRATORS) {
        return {
            amountToReserve: 0,
            remainingGold: state.resources[faction]?.gold || 0,
            shouldSeizeGold: false,
            reasoning: 'Not CONSPIRATORS faction'
        };
    }
    const factionGold = state.resources[faction]?.gold || 0;
    const savingsResult = (0, RecruitmentFundManager_1.calculateSavingsForTurn)(state, faction);
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
function processAIRecruitment(state, faction, amountToSave, seizeGoldLocationId) {
    const logs = [];
    let currentState = { ...state };
    let usedSeizeGold = false;
    // Only CONSPIRATORS use this system
    if (faction !== types_1.FactionId.CONSPIRATORS) {
        return {
            updatedState: {},
            leaderRecruited: false,
            amountSaved: 0,
            usedSeizeGold: false,
            logs: ['Not CONSPIRATORS faction - skipping recruitment']
        };
    }
    // Check preconditions
    const livingLeaders = (0, conspiratorsRecruitment_1.getLivingConspiratorLeaders)(currentState.characters);
    if (livingLeaders.length >= conspiratorsRecruitment_1.CONSPIRATORS_MAX_LEADERS) {
        logs.push(`[AI RECRUIT] Max leaders (${conspiratorsRecruitment_1.CONSPIRATORS_MAX_LEADERS}) already alive - skipping`);
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
        const seizeResult = (0, requisition_1.executeRequisition)(currentState, seizeGoldLocationId, 'GOLD', faction);
        if (seizeResult.success) {
            currentState = { ...currentState, ...seizeResult.newState };
            usedSeizeGold = true;
            logs.push(`[AI RECRUIT] SEIZE_GOLD executed at ${seizeGoldLocationId} (+50g, emergency 0 leaders)`);
        }
        else {
            logs.push(`[AI RECRUIT] SEIZE_GOLD failed: ${seizeResult.message}`);
        }
    }
    // =========================================================================
    // STEP 2: Update recruitment fund
    // =========================================================================
    const fundResult = (0, RecruitmentFundManager_1.updateRecruitmentFund)(currentState, faction, amountToSave);
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
    const recruitableLeaders = (0, conspiratorsRecruitment_1.getRecruitableConspiratorLeaders)(currentState.characters);
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
    const evaluationContext = {
        locations: currentState.locations,
        controlledLocations,
        factionRevenues,
        livingLeadersCount: livingLeaders.length,
        characters: currentState.characters,
        faction
    };
    // Evaluate all leaders and pick the best
    const evaluationResults = (0, LeaderRecruitmentEvaluator_1.evaluateAllRecruitableLeaders)(recruitableLeaders, evaluationContext);
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
    if (RecruitmentFundManager_2.ENABLE_RECRUITMENT_LOGS) {
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
    const recruitResult = (0, conspiratorsRecruitment_1.executeRecruitLeader)(currentState.characters, bestLeader.leaderId, currentState.locations, controlledLocations, RecruitmentFundManager_1.RECRUITMENT_TARGET // Use fund amount, not faction gold
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
    const consumeResult = (0, RecruitmentFundManager_1.consumeRecruitmentFund)(currentState, faction);
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
function processConspiratorRecruitmentTurn(state) {
    const faction = types_1.FactionId.CONSPIRATORS;
    // Calculate budget reservation
    const budgetAllocation = calculateRecruitmentBudgetReservation(state, faction);
    // Process recruitment with the calculated values
    return processAIRecruitment(state, faction, budgetAllocation.amountToReserve, budgetAllocation.seizeGoldLocationId);
}
