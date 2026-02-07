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

import { GameState, FactionId, CharacterStatus, Location } from '../../../../types';
import {
    getRecruitableNoblesLeaders,
    getLivingNoblesLeaders,
    executeNoblesRecruitLeader,
    getNoblesRecruitmentDestination,
    isLeaderBlocked
} from '../../../domain/leaders';
import {
    calculateFoodSurplus,
    selectFiefLocation,
    canAffordRecruitment,
    getFactionRevenues
} from './NoblesRecruitmentFiefManager';
import {
    evaluateAllNoblesRecruitableLeaders,
    filterNoblesRecruitableLeaders,
    NoblesLeaderEvaluationContext
} from '../evaluation/LeaderNoblesRecruitmentEvaluator';
import { ENABLE_RECRUITMENT_LOGS } from './RecruitmentFundManager';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Minimum leader value (per turn) to justify recruitment */
const MIN_LEADER_VALUE_FOR_RECRUITMENT = 30; // Same as fief cost

// ============================================================================
// TYPES
// ============================================================================

export interface AINoblesRecruitmentResult {
    /** Updated game state after recruitment processing */
    updatedState: Partial<GameState>;
    /** Whether a leader was recruited this turn */
    leaderRecruited: boolean;
    /** ID of recruited leader (if any) */
    recruitedLeaderId?: string;
    /** Fief location granted (if any) */
    fiefLocationId?: string;
    /** Gold bonus from recruitment (baron_ystrir, duke_great_plains) */
    goldBonus?: number;
    /** New army created (duke_esmarch) */
    newArmy?: { strength: number; locationId: string };
    /** Insurrection triggered (georges_cadal, duke_hornvale) */
    triggerInsurrection?: { locationId: string; budget: number };
    /** Log messages for debugging */
    logs: string[];
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Process AI recruitment for NOBLES faction.
 * Call this during the AI turn phase.
 * 
 * Returns updated state and recruitment results.
 */
export function processAINoblesRecruitment(
    state: GameState
): AINoblesRecruitmentResult {
    const faction = FactionId.NOBLES;
    const logs: string[] = [];

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

    const affordCheck = canAffordRecruitment(state.locations, faction);
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
    const allRecruitableLeaders = getRecruitableNoblesLeaders(state.characters);
    
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
        const blockCheck = isLeaderBlocked(leader.id, state.characters, state.locations, controlledLocations);
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
    const livingLeaders = getLivingNoblesLeaders(state.characters);
    const factionRevenues = getFactionRevenues(state.locations, faction);
    const foodSurplusResult = calculateFoodSurplus(state.locations, state.armies, state.characters, faction);

    const evaluationContext: NoblesLeaderEvaluationContext = {
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
    const filteredLeaders = filterNoblesRecruitableLeaders(unlockedLeaders, evaluationContext);

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
    const evaluationResults = evaluateAllNoblesRecruitableLeaders(filteredLeaders, evaluationContext);
    
    if (evaluationResults.length === 0) {
        logs.push('[AI NOBLES RECRUIT] No valid evaluation results');
        return {
            updatedState: {},
            leaderRecruited: false,
            logs
        };
    }

    // Log all evaluated leaders
    if (ENABLE_RECRUITMENT_LOGS) {
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
    const fiefSelection = selectFiefLocation(
        state.locations,
        state.armies,
        state.characters,
        faction,
        bestLeader.totalValue
    );

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

    if (ENABLE_RECRUITMENT_LOGS) {
        console.log(`[AI NOBLES RECRUIT EVALUATION] Selected: ${bestLeader.leaderName} (${bestLeader.totalValue.toFixed(1)}g/turn)`);
        console.log(`[AI NOBLES RECRUIT] Fief: ${fiefSelection.fiefLocationId} (${fiefSelection.fiefType}, -${fiefSelection.costPerTurn}/turn)`);
    }

    // =========================================================================
    // STEP 7: Determine recruitment destination
    // =========================================================================
    const destinationId = getNoblesRecruitmentDestination(
        bestLeader.leaderId,
        state.characters,
        state.locations,
        controlledLocations
    );

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
    const recruitResult = executeNoblesRecruitLeader(
        state.characters,
        bestLeader.leaderId,
        state.locations,
        controlledLocations,
        destinationId,
        fiefSelection.fiefLocationId!
    );

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
    const result: AINoblesRecruitmentResult = {
        updatedState: {
            characters: recruitResult.updatedCharacters,
            locations: recruitResult.updatedLocations
        },
        leaderRecruited: true,
        recruitedLeaderId: bestLeader.leaderId,
        fiefLocationId: fiefSelection.fiefLocationId!,
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
export function applyNoblesRecruitmentResults(
    state: GameState,
    result: AINoblesRecruitmentResult
): GameState {
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
            [FactionId.NOBLES]: {
                ...updatedState.resources[FactionId.NOBLES],
                gold: (updatedState.resources[FactionId.NOBLES]?.gold || 0) + result.goldBonus
            }
        };
    }

    // Create new army (duke_esmarch)
    if (result.newArmy) {
        const newArmy = {
            id: `nobles_esmarch_${Date.now()}`,
            faction: FactionId.NOBLES,
            strength: result.newArmy.strength,
            locationId: result.newArmy.locationId,
            locationType: 'LOCATION' as const,
            roadId: null,
            stageIndex: 0,
            direction: 'FORWARD' as const,
            originLocationId: result.newArmy.locationId,
            destinationId: null,
            turnsUntilArrival: 0,
            justMoved: false,
            foodSourceId: result.newArmy.locationId,
            lastSafePosition: {
                type: 'LOCATION' as const,
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
