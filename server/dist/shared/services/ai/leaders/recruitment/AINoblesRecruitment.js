"use strict";
/**
 * AI Nobles Recruitment Service
 *
 * Orchestrates the full AI recruitment decision for NOBLES faction:
 * 1. Check if recruitment is possible (has territories, has available leaders)
 * 2. Filter leaders based on conditions (territories vs leaders, revenues)
 * 3. Evaluate available leaders and select the best
 * 4. Select fief location (rural if surplus >= 50, city otherwise)
 * 5. Execute recruitment if leader value > fief cost
 *
 * Unlike CONSPIRATORS who pay gold, NOBLES grant fiefdoms (30 food or 30 gold/turn).
 *
 * @module shared/services/ai/leaders/recruitment
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.processAINoblesRecruitment = processAINoblesRecruitment;
exports.applyNoblesRecruitmentResults = applyNoblesRecruitmentResults;
const types_1 = require("../../../../types");
const leaders_1 = require("../../../domain/leaders");
const NoblesRecruitmentFiefManager_1 = require("./NoblesRecruitmentFiefManager");
const LeaderNoblesRecruitmentEvaluator_1 = require("../evaluation/LeaderNoblesRecruitmentEvaluator");
const RecruitmentFundManager_1 = require("./RecruitmentFundManager");
// ============================================================================
// CONSTANTS
// ============================================================================
/** Minimum leader value (per turn) to justify recruitment */
const MIN_LEADER_VALUE_FOR_RECRUITMENT = 30; // Same as fief cost
// ============================================================================
// MAIN FUNCTION
// ============================================================================
/**
 * Process AI recruitment for NOBLES faction.
 * Call this during the AI turn phase.
 *
 * Returns updated state and recruitment results.
 */
function processAINoblesRecruitment(state) {
    const faction = types_1.FactionId.NOBLES;
    const logs = [];
    // =========================================================================
    // STEP 1: Check basic conditions
    // =========================================================================
    const controlledLocations = state.locations.filter(l => l.faction === faction);
    if (controlledLocations.length === 0) {
        logs.push('[AI NOBLES RECRUIT] No territories controlled - skipping');
        return {
            updatedState: {},
            leaderRecruited: false,
            logs
        };
    }
    const affordCheck = (0, NoblesRecruitmentFiefManager_1.canAffordRecruitment)(state.locations, faction);
    if (!affordCheck.canAfford) {
        logs.push(`[AI NOBLES RECRUIT] Cannot afford recruitment: ${affordCheck.reason}`);
        return {
            updatedState: {},
            leaderRecruited: false,
            logs
        };
    }
    // =========================================================================
    // STEP 2: Get recruitable leaders
    // =========================================================================
    const allRecruitableLeaders = (0, leaders_1.getRecruitableNoblesLeaders)(state.characters);
    if (allRecruitableLeaders.length === 0) {
        logs.push('[AI NOBLES RECRUIT] No recruitable leaders available');
        return {
            updatedState: {},
            leaderRecruited: false,
            logs
        };
    }
    // Filter out blocked leaders
    const unlockedLeaders = allRecruitableLeaders.filter(leader => {
        const blockCheck = (0, leaders_1.isLeaderBlocked)(leader.id, state.characters, state.locations, controlledLocations);
        if (blockCheck.blocked) {
            logs.push(`[AI NOBLES RECRUIT] Leader ${leader.name} blocked: ${blockCheck.reason}`);
            return false;
        }
        return true;
    });
    if (unlockedLeaders.length === 0) {
        logs.push('[AI NOBLES RECRUIT] All available leaders are blocked');
        return {
            updatedState: {},
            leaderRecruited: false,
            logs
        };
    }
    // =========================================================================
    // STEP 3: Build evaluation context
    // =========================================================================
    const livingLeaders = (0, leaders_1.getLivingNoblesLeaders)(state.characters);
    const factionRevenues = (0, NoblesRecruitmentFiefManager_1.getFactionRevenues)(state.locations, faction);
    const foodSurplusResult = (0, NoblesRecruitmentFiefManager_1.calculateFoodSurplus)(state.locations, state.armies, state.characters, faction);
    const evaluationContext = {
        locations: state.locations,
        controlledLocations,
        factionRevenues,
        foodSurplus: foodSurplusResult.totalSurplus,
        livingLeadersCount: livingLeaders.length,
        characters: state.characters,
        armies: state.armies
    };
    // =========================================================================
    // STEP 4: Filter leaders based on conditions
    // =========================================================================
    const filteredLeaders = (0, LeaderNoblesRecruitmentEvaluator_1.filterNoblesRecruitableLeaders)(unlockedLeaders, evaluationContext);
    if (filteredLeaders.length === 0) {
        logs.push('[AI NOBLES RECRUIT] No leaders pass filter conditions');
        return {
            updatedState: {},
            leaderRecruited: false,
            logs
        };
    }
    // =========================================================================
    // STEP 5: Evaluate all filtered leaders
    // =========================================================================
    const evaluationResults = (0, LeaderNoblesRecruitmentEvaluator_1.evaluateAllNoblesRecruitableLeaders)(filteredLeaders, evaluationContext);
    if (evaluationResults.length === 0) {
        logs.push('[AI NOBLES RECRUIT] No valid evaluation results');
        return {
            updatedState: {},
            leaderRecruited: false,
            logs
        };
    }
    // Log all evaluated leaders
    if (RecruitmentFundManager_1.ENABLE_RECRUITMENT_LOGS) {
        console.log(`[AI NOBLES RECRUIT EVALUATION] Evaluating ${evaluationResults.length} leaders:`);
        evaluationResults.forEach((result, index) => {
            console.log(`  ${index + 1}. ${result.leaderName}: ${result.totalValue.toFixed(1)}g/turn`);
            console.log(`     ${result.reasoning.slice(0, -1).join(' | ')}`);
        });
    }
    const bestLeader = evaluationResults[0];
    // =========================================================================
    // STEP 6: Check if best leader is worth recruiting
    // =========================================================================
    // First, determine fief selection to know the cost type
    const fiefSelection = (0, NoblesRecruitmentFiefManager_1.selectFiefLocation)(state.locations, state.armies, state.characters, faction, bestLeader.totalValue);
    if (!fiefSelection.canGrantFief) {
        logs.push(`[AI NOBLES RECRUIT] Cannot grant fief: ${fiefSelection.reasoning}`);
        return {
            updatedState: {},
            leaderRecruited: false,
            logs
        };
    }
    // Check if leader value justifies the cost
    if (bestLeader.totalValue < MIN_LEADER_VALUE_FOR_RECRUITMENT) {
        logs.push(`[AI NOBLES RECRUIT] Best leader ${bestLeader.leaderName} (${bestLeader.totalValue.toFixed(1)}g/turn) below threshold (${MIN_LEADER_VALUE_FOR_RECRUITMENT}g/turn)`);
        return {
            updatedState: {},
            leaderRecruited: false,
            logs
        };
    }
    if (RecruitmentFundManager_1.ENABLE_RECRUITMENT_LOGS) {
        console.log(`[AI NOBLES RECRUIT EVALUATION] Selected: ${bestLeader.leaderName} (${bestLeader.totalValue.toFixed(1)}g/turn)`);
        console.log(`[AI NOBLES RECRUIT] Fief: ${fiefSelection.fiefLocationId} (${fiefSelection.fiefType}, -${fiefSelection.costPerTurn}/turn)`);
    }
    // =========================================================================
    // STEP 7: Determine recruitment destination
    // =========================================================================
    const destinationId = (0, leaders_1.getNoblesRecruitmentDestination)(bestLeader.leaderId, state.characters, state.locations, controlledLocations);
    if (!destinationId) {
        logs.push(`[AI NOBLES RECRUIT] Could not determine destination for ${bestLeader.leaderName}`);
        return {
            updatedState: {},
            leaderRecruited: false,
            logs
        };
    }
    // =========================================================================
    // STEP 8: Execute recruitment
    // =========================================================================
    const recruitResult = (0, leaders_1.executeNoblesRecruitLeader)(state.characters, bestLeader.leaderId, state.locations, controlledLocations, destinationId, fiefSelection.fiefLocationId);
    if (!recruitResult.success) {
        logs.push(`[AI NOBLES RECRUIT] Recruitment failed: ${recruitResult.error}`);
        return {
            updatedState: {},
            leaderRecruited: false,
            logs
        };
    }
    logs.push(`[AI NOBLES RECRUIT] SUCCESS: Recruited ${bestLeader.leaderName} to ${destinationId}, granted fief at ${fiefSelection.fiefLocationId}`);
    // =========================================================================
    // STEP 9: Build result with special effects
    // =========================================================================
    const result = {
        updatedState: {
            characters: recruitResult.updatedCharacters,
            locations: recruitResult.updatedLocations
        },
        leaderRecruited: true,
        recruitedLeaderId: bestLeader.leaderId,
        fiefLocationId: fiefSelection.fiefLocationId,
        logs
    };
    // Handle special effects
    if (recruitResult.goldBonus) {
        result.goldBonus = recruitResult.goldBonus;
        logs.push(`[AI NOBLES RECRUIT] Gold bonus: +${recruitResult.goldBonus}g`);
    }
    if (recruitResult.newArmy) {
        result.newArmy = {
            strength: recruitResult.newArmy.strength,
            locationId: recruitResult.newArmy.locationId
        };
        logs.push(`[AI NOBLES RECRUIT] New army: ${recruitResult.newArmy.strength} soldiers at ${recruitResult.newArmy.locationId}`);
    }
    if (recruitResult.triggerInsurrection) {
        result.triggerInsurrection = {
            locationId: recruitResult.triggerInsurrection.locationId,
            budget: recruitResult.triggerInsurrection.budget
        };
        logs.push(`[AI NOBLES RECRUIT] Trigger insurrection at ${recruitResult.triggerInsurrection.locationId} with ${recruitResult.triggerInsurrection.budget}g budget`);
    }
    return result;
}
/**
 * Apply recruitment results to game state.
 * Handles gold bonuses and army creation.
 */
function applyNoblesRecruitmentResults(state, result) {
    let updatedState = { ...state };
    // Apply character and location updates
    if (result.updatedState.characters) {
        updatedState.characters = result.updatedState.characters;
    }
    if (result.updatedState.locations) {
        updatedState.locations = result.updatedState.locations;
    }
    // Apply gold bonus (baron_ystrir, duke_great_plains if Windward controlled)
    if (result.goldBonus && result.goldBonus > 0) {
        updatedState.resources = {
            ...updatedState.resources,
            [types_1.FactionId.NOBLES]: {
                ...updatedState.resources[types_1.FactionId.NOBLES],
                gold: (updatedState.resources[types_1.FactionId.NOBLES]?.gold || 0) + result.goldBonus
            }
        };
    }
    // Create new army (duke_esmarch)
    if (result.newArmy) {
        const newArmy = {
            id: `nobles_esmarch_${Date.now()}`,
            faction: types_1.FactionId.NOBLES,
            strength: result.newArmy.strength,
            locationId: result.newArmy.locationId,
            locationType: 'LOCATION',
            roadId: null,
            stageIndex: 0,
            direction: 'FORWARD',
            originLocationId: result.newArmy.locationId,
            destinationId: null,
            turnsUntilArrival: 0,
            justMoved: false,
            foodSourceId: result.newArmy.locationId,
            lastSafePosition: {
                type: 'LOCATION',
                id: result.newArmy.locationId
            },
            isInsurgent: false,
            isSpent: false,
            isSieging: false
        };
        updatedState.armies = [...updatedState.armies, newArmy];
    }
    // Note: Insurrection triggering should be handled separately
    // as it involves the clandestine system
    return updatedState;
}
