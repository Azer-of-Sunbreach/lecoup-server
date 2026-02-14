
import { GameState, FactionId } from '../../../shared/types';
import { MapRegistry } from '../../../shared/maps/MapRegistry';
import { AI_PROFILES } from './profiles';
import { analyzeTheaters, updateMissions } from './strategy';
import { executeRepublicanEarlyGame } from './strategy/republicanEarlyGame';
import { manageEconomy } from './economy';
import { manageDiplomacy } from './diplomacy';
import { manageMilitary } from './military';
import { AIBudget } from './types';
import { applyBalancedRecruitmentOverride, allocateSiegeBudget } from './economy/budget';
// Siege Priority (shared)
import { findBestSiegeOpportunity, reserveSiegeBudget } from '../../../shared/services/ai/military';
import { executeSiegeFromOpportunity, executeCaptureFromOpportunity } from '../../../shared/services/ai/military/siegeExecution';
import { distributeClandestineBudget } from '../../../shared/services/ai/budgetDistributor';

import { manageLeadersUnified } from '../../../shared/services/ai/leaders';
// AI Leader Recruitment (CONSPIRATORS)
import { calculateRecruitmentBudgetReservation, processAIRecruitment, ENABLE_RECRUITMENT_LOGS } from '../../../shared/services/ai/leaders/recruitment';
// AI Leader Recruitment (NOBLES)
import { processAINoblesRecruitment, applyNoblesRecruitmentResults } from '../../../shared/services/ai/leaders/recruitment';
// Insurrection Defense (shared)
import { detectInsurrectionThreats, convertToAlerts, dispatchEmergencyReinforcements } from '../../../shared/services/ai/strategy';
// Stability Management (shared)
import { enforceHighTaxLimits, detectEmergency } from '../../../shared/services/ai/economy/stabilityManagement';
// Republicans Internal Factions (shared)
import {
    processRepublicanInternalFaction,
    applyInternalFactionResult,
    INTERNAL_FACTION_MIN_TURN
} from '../../../shared/services/ai/leaders/recruitment/AIRepublicansInternalFactions';

// Note: Legacy processLeaderAI has been replaced by unified manageLeadersUnified
// which is shared between solo (Application) and multiplayer (Server) modes.

/**
 * Process AI turn for a SINGLE faction (used in multiplayer)
 */
export const processSingleFactionAITurn = (gameState: GameState, faction: FactionId): GameState => {
    // START HUMAN CHECK (Double safety)
    const playerFactions = (gameState as any).playerFactions || (gameState.playerFaction ? [gameState.playerFaction] : []);
    if (playerFactions.includes(faction)) {
        console.warn(`[AI SERVER] Attempted to process AI for HUMAN faction ${faction}. Aborting.`);
        return gameState;
    }
    // END HUMAN CHECK

    let state = { ...gameState };
    const profile = AI_PROFILES[faction];

    if (!profile) {
        console.log(`[AI] No profile found for faction ${faction}`);
        return state;
    }

    console.log(`[AI] Processing turn for ${faction}`);

    // ... (rest of logic similar to processAITurn but single faction)
    // To avoid duplication, we should probably refactor, but for now let's reuse the logic flow.

    // For now, I will redirect to a unified helper function or just copy the updated logic here?
    // Given the structure, processAITurn iterates. I will reimplement processSingleFactionAITurn properly.

    return processAITurnForFaction(state, faction, profile);
};

export const processAITurn = (gameState: GameState): GameState => {
    let state = { ...gameState };

    // IMPROVED FILTERING FOR SERVER/MULTIPLAYER
    const playerFactions = (state as any).playerFactions || (state.playerFaction ? [state.playerFaction] : []);
    const cpuFactions = MapRegistry.getFactions(state.mapId as any).filter(f => !playerFactions.includes(f));

    console.log(`[AI SERVER] Processing CPU Factions: ${cpuFactions.join(', ')} (Human: ${playerFactions.join(', ')})`);

    for (const faction of cpuFactions) {
        const profile = AI_PROFILES[faction];
        if (!profile) continue;

        state = processAITurnForFaction(state, faction, profile);
    }

    return state;
};

// Extracted core logic to share between single/multi processing
function processAITurnForFaction(gameState: GameState, faction: FactionId, profile: any): GameState {
    let state = { ...gameState };

    // 1. ANALYSIS & STRATEGY
    const theaters = analyzeTheaters(state, faction);

    // Update Missions (Persistent)
    const missions = updateMissions(state, faction, theaters, profile);

    // Persist Internal State
    state = {
        ...state,
        aiState: {
            ...state.aiState,
            [faction]: {
                ...state.aiState?.[faction],
                theaters,
                missions,
                goals: [] // Clean empty goals
            }
        }
    };

    const goals: any[] = [];

    // 2. BUDGETING
    // 2a. SIEGE PRIORITY - Reserve budget for siege BEFORE other allocations
    const siegeOpportunity = findBestSiegeOpportunity(state, faction);
    let siegeReservedBudget = 0;
    if (siegeOpportunity && siegeOpportunity.action !== 'SKIP') {
        siegeReservedBudget = reserveSiegeBudget(siegeOpportunity);
        console.log(`[AI SIEGE PRIORITY ${faction}] Reserved ${siegeReservedBudget} gold for ${siegeOpportunity.cityName} (action: ${siegeOpportunity.action})`);
    }

    const totalGold = state.resources[faction].gold;
    const goldAfterSiegeReserve = totalGold - siegeReservedBudget;
    
    // Determine emergency state
    const isUnderThreat = theaters.some(t => t.threatLevel > t.armyStrength);

    // Reduced reserve ratio
    let reserveRatio = isUnderThreat ? 0.1 : (profile.subversiveness > 0.6 ? 0.1 : 0.15);
    if (faction === FactionId.NOBLES && state.turn < 5) reserveRatio = 0.1;

    const reserved = Math.floor(goldAfterSiegeReserve * reserveRatio);
    const available = goldAfterSiegeReserve - reserved;

    // Allocation (Integers only)
    const diploWeight = profile.subversiveness > 0.3 ? 0.5 : 0.1;
    const recruitWeight = isUnderThreat ? 0.8 : (faction === FactionId.NOBLES ? 0.7 : 0.4);
    const fortWeight = profile.useFortifications ? 0.2 : 0;

    const totalWeight = diploWeight + recruitWeight + fortWeight;

    const budget: AIBudget = {
        total: totalGold,
        reserved,
        available,
        allocations: {
            recruitment: Math.floor(available * (recruitWeight / totalWeight)),
            fortification: Math.floor(available * (fortWeight / totalWeight)),
            diplomacy: Math.floor(available * (diploWeight / totalWeight)),
            logistics: 0,
            siege: 0
        }
    };

    applyBalancedRecruitmentOverride(faction, state, budget, state.armies);
    allocateSiegeBudget(faction, state, budget);

    // 2c. LEADER RECRUITMENT BUDGET (CONSPIRATORS only)
    // Reserve gold for leader recruitment fund BEFORE other allocations
    let leaderRecruitmentReserve = 0;
    let leaderRecruitmentSeizeGoldLocation: string | undefined;
    if (faction === FactionId.CONSPIRATORS) {
        const recruitBudget = calculateRecruitmentBudgetReservation(state, faction);
        leaderRecruitmentReserve = recruitBudget.amountToReserve;
        leaderRecruitmentSeizeGoldLocation = recruitBudget.seizeGoldLocationId;
        if (leaderRecruitmentReserve > 0) {
            // Deduct from recruitment budget (military recruitment)
            const deductFromRecruitment = Math.min(leaderRecruitmentReserve, budget.allocations.recruitment);
            budget.allocations.recruitment -= deductFromRecruitment;
            if (ENABLE_RECRUITMENT_LOGS) {
                console.log(`[AI LEADER RECRUIT ${faction}] Reserved ${leaderRecruitmentReserve}g for leader fund (${recruitBudget.reasoning})`);
            }
        }
    }

    // REPUBLICAN EARLY GAME SCRIPT (Turns 1-2)
    if (faction === FactionId.REPUBLICANS && state.turn <= 2) {
        const earlyResult = executeRepublicanEarlyGame(state, faction, budget);
        state = { ...state, ...earlyResult };
    }

    // 2c-bis. REPUBLICANS INTERNAL FACTION DECISION (Turn 6+)
    if (faction === FactionId.REPUBLICANS && state.turn >= INTERNAL_FACTION_MIN_TURN && !state.chosenInternalFaction) {
        console.log(`[AI ${faction}] Processing Internal Faction decision...`);
        const internalFactionResult = processRepublicanInternalFaction(state, faction, state.turn);

        if (internalFactionResult.choiceMade) {
            state = applyInternalFactionResult(state, internalFactionResult);
            console.log(`[AI ${faction}] Chose Internal Faction: ${internalFactionResult.chosenOption} (cost: ${internalFactionResult.goldCost}g)`);
        } else if (internalFactionResult.inSavingsMode) {
            console.log(`[AI ${faction}] Saving for ${internalFactionResult.savingsTarget} (${internalFactionResult.savedGold}g saved)`);
        }
    }

    // 2d. STABILITY MANAGEMENT
    // Enforce HIGH tax limits for locations without leaders (prevents stability drain)
    const modifiedLocations = enforceHighTaxLimits(faction, state.locations, state.characters);
    if (modifiedLocations.length > 0) {
        console.log(`[AI ${faction}] Auto-reduced VERY_HIGH to HIGH in: ${modifiedLocations.join(', ')}`);
    }

    // 2e. INSURRECTION THREAT DETECTION
    // Detect insurrection threats for logging/awareness (used by leader AI for prioritization)
    const insurrectionThreats = detectInsurrectionThreats(state, faction);
    const insurrectionAlerts = convertToAlerts(insurrectionThreats);
    if (insurrectionThreats.length > 0) {
        const imminentThreats = insurrectionAlerts.filter(a => a.turnsUntilThreat <= 1);
        if (imminentThreats.length > 0) {
            // Get location names for logging
            const threatNames = imminentThreats.map(t => {
                const loc = state.locations.find(l => l.id === t.locationId);
                return loc?.name || t.locationId;
            });
            console.log(`[AI ${faction}] IMMINENT INSURRECTION THREATS: ${threatNames.join(', ')}`);
        }
    }

    // 2f. EMERGENCY DETECTION (affects stability thresholds)
    const hasEmergency = detectEmergency(faction, state.locations, state.armies);
    if (hasEmergency) {
        console.log(`[AI ${faction}] Emergency mode detected - lowered stability thresholds`);
    }

    // 3. ECONOMY & LOGISTICS (Mutates State)
    // Pass insurrection alerts for priority recruitment
    const ecoResult = manageEconomy(state, faction, profile, budget, insurrectionAlerts);
    state = { ...state, ...ecoResult };

    // FIX: Guarantee minimum diplomacy budget for Clandestine Operations
    const MIN_BUDGET_PER_INSURRECTION = 400;
    const targetInsurrections = 2;
    const minDiploBudget = targetInsurrections * MIN_BUDGET_PER_INSURRECTION;

    if (profile.subversiveness > 0.5) {
        if (budget.allocations.diplomacy < minDiploBudget) {
            const needed = minDiploBudget - budget.allocations.diplomacy;
            const canTake = Math.max(0, budget.allocations.recruitment - 100);
            const toTake = Math.min(needed, canTake);
            budget.allocations.recruitment -= toTake;
            budget.allocations.diplomacy += toTake;
        }
    }

    // 4. DIPLOMACY (Insurrections & Negotiations)
    // Legacy insurrections are disabled since we use unified leader AI
    const dipResult = manageDiplomacy(state, faction, goals, profile, budget, true);

    state = { ...state, ...dipResult };

    // 5. MILITARY MOVEMENT
    state.armies = manageMilitary(state, faction, profile);

    // 5.5 SIEGE/CAPTURE EXECUTION - Execute sieges or captures from detected opportunities
    if (siegeOpportunity && siegeOpportunity.action === 'SIEGE') {
        const siegeResult = executeSiegeFromOpportunity(state, faction, siegeOpportunity);
        if (siegeResult.executed) {
            state = {
                ...state,
                locations: siegeResult.updatedLocations,
                armies: siegeResult.updatedArmies,
                resources: { ...state.resources, ...siegeResult.updatedResources }
            };
            if (siegeResult.siegeNotification) {
                state.siegeNotification = siegeResult.siegeNotification;
            }
        }
    } else if (siegeOpportunity && siegeOpportunity.action === 'CAPTURE') {
        state.armies = executeCaptureFromOpportunity(state, faction, siegeOpportunity);
    }

    // 5.6 EMERGENCY DISPATCH (Phase 2) - Move existing armies to threatened locations
    // Must run AFTER manageMilitary to avoid being overwritten by army object recreation
    if (insurrectionThreats.length > 0) {
        dispatchEmergencyReinforcements(state, faction, insurrectionThreats, state.armies);
    }

    // 6. LEADER MANAGEMENT
    // Use unified IPG-based leader management (same as Application/solo mode)
    {
        // Distribute allocated diplomacy budget to leaders as clandestine budget
        const budgetResult = distributeClandestineBudget(state, faction, budget);
        state = { ...state, ...budgetResult };

        // Calculate clandestine budget from diplomacy allocation
        const clandestineBudget = budget.allocations.diplomacy;

        // Use unified leader manager (shared between solo and multiplayer)
        const leaderResult = manageLeadersUnified(state, faction, clandestineBudget, state.turn);

        // Merge results
        if (leaderResult.characters) {
            state.characters = leaderResult.characters;
        }
        if (leaderResult.locations) {
            state.locations = leaderResult.locations;
        }
        if (leaderResult.resources) {
            state.resources = leaderResult.resources;
        }
        if (leaderResult.chosenInternalFaction) {
            state.chosenInternalFaction = leaderResult.chosenInternalFaction as any;
        }
    }

    // 7. LEADER RECRUITMENT (CONSPIRATORS only)
    // Process recruitment fund and recruit if ready
    if (faction === FactionId.CONSPIRATORS) {
        const recruitResult = processAIRecruitment(
            state,
            faction,
            leaderRecruitmentReserve,
            leaderRecruitmentSeizeGoldLocation
        );
        state = { ...state, ...recruitResult.updatedState };
        recruitResult.logs.forEach(log => {
                if (ENABLE_RECRUITMENT_LOGS || log.includes('SUCCESS')) {
                    console.log(log);
                }
            });
    }

    // 8. LEADER RECRUITMENT (NOBLES only)
    // NOBLES grant fiefs instead of paying gold
    if (faction === FactionId.NOBLES) {
        const noblesRecruitResult = processAINoblesRecruitment(state);
        if (noblesRecruitResult.leaderRecruited) {
            state = applyNoblesRecruitmentResults(state, noblesRecruitResult);
        }
        noblesRecruitResult.logs.forEach(log => {
            if (ENABLE_RECRUITMENT_LOGS || log.includes('SUCCESS')) {
                console.log(log);
            }
        });
    }

    return state;
}

