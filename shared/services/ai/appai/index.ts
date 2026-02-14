
import { GameState, FactionId } from '../../../types';
import { MapRegistry } from '../../../maps/MapRegistry';
import { AI_PROFILES } from './profiles';
import { analyzeTheaters, updateMissions } from './strategy';
import { detectInsurrectionThreats, convertToAlerts, dispatchEmergencyReinforcements } from './strategy/insurrectionDefense';
import { executeRepublicanEarlyGame } from './strategy/republicanEarlyGame';
import { manageEconomy } from './economy';
import { enforceHighTaxLimits, detectEmergency } from '../economy/stabilityManagement';
import { manageDiplomacy } from './diplomacy';
import { manageMilitary } from './military';
// Use unified IPG-based leader assignment system (shared between solo and multiplayer)
import { manageLeadersUnified } from '../leaders';
import { AIBudget } from './types';
import { applyBalancedRecruitmentOverride, allocateSiegeBudget } from './economy/budget';
import { findBestSiegeOpportunity, reserveSiegeBudget } from './military/siegePriority';
import { executeSiegeFromOpportunity } from '../military/siegeExecution';
// AI Leader Recruitment (CONSPIRATORS)
import { calculateRecruitmentBudgetReservation, processAIRecruitment, ENABLE_RECRUITMENT_LOGS } from '../leaders/recruitment';
// AI Leader Recruitment (NOBLES)
import { processAINoblesRecruitment, applyNoblesRecruitmentResults } from '../leaders/recruitment';

export const processAITurn = (gameState: GameState): GameState => {
    let state = { ...gameState };
    const cpuFactions = MapRegistry.getFactions(state.mapId || 'larion_alternate' as any).filter(f => f !== state.playerFaction);

    for (const faction of cpuFactions) {
        const profile = AI_PROFILES[faction];
        if (!profile) continue;

        // 1. ANALYSIS & STRATEGY
        const theaters = analyzeTheaters(state, faction);

        // NEW: Detect insurrection threats (GRAND, NEUTRAL, SPONTANEOUS)
        const insurrectionThreats = detectInsurrectionThreats(state, faction);
        const insurrectionAlerts = convertToAlerts(insurrectionThreats);

        // NEW: Detect emergency state (famine, enemy army)
        const isInEmergency = detectEmergency(faction, state.locations, state.armies);

        // NEW: Enforce HIGH tax limits (VERY_HIGH without leader → HIGH)
        const modifiedLocations = enforceHighTaxLimits(faction, state.locations, state.characters);
        if (modifiedLocations.length > 0) {
            console.log(`[AI ECONOMY ${faction}] Reduced VERY_HIGH to HIGH in: ${modifiedLocations.join(', ')}`);
        }

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

        // Note: Sub-services (manageMilitary, manageDiplomacy) now read directly from state.aiState.missions
        // We pass empty goals array merely to satisfy legacy signatures if any remain.
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

        // Reduced reserve ratio from 0.3 to 0.15 for more aggressive spending
        let reserveRatio = isUnderThreat ? 0.1 : (profile.subversiveness > 0.6 ? 0.1 : 0.15);
        if (faction === FactionId.NOBLES && state.turn < 5) reserveRatio = 0.1; // Nobles spend heavily early

        const reserved = Math.floor(goldAfterSiegeReserve * reserveRatio);
        const available = goldAfterSiegeReserve - reserved;

        // Allocation (Integers only)
        // Ensure diplomacy gets enough if subversive
        const diploWeight = profile.subversiveness > 0.3 ? 0.5 : 0.1; // Increased weight for subversives (including Nobles now)
        const recruitWeight = isUnderThreat ? 0.8 : (faction === FactionId.NOBLES ? 0.7 : 0.4); // Nobles prioritize recruiting
        const fortWeight = profile.useFortifications ? 0.2 : 0;

        // Normalize weights rough approximation
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

        // Apply balanced recruitment override (considers insurrection budget)

        applyBalancedRecruitmentOverride(faction, state, budget, state.armies);

        // Allocate siege budget for fortified targets
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
        // Execute before normal economy to handle scripted recruitment and garrison deployment
        if (faction === FactionId.REPUBLICANS && state.turn <= 2) {
            const earlyResult = executeRepublicanEarlyGame(state, faction, budget);
            state = { ...state, ...earlyResult };
        }

        // 3. ECONOMY & LOGISTICS (Mutates State)
        // Pass insurrection alerts for priority recruitment
        const ecoResult = manageEconomy(state, faction, profile, budget, insurrectionAlerts);
        state = { ...state, ...ecoResult };

        // FIX: Guarantee minimum diplomacy budget for Clandestine Operations (Leader AI)
        // MUST run AFTER manageEconomy which may modify the budget
        // We ensure enough gold is allocated for potential insurrections via leaders
        const MIN_BUDGET_PER_INSURRECTION = 400;
        const targetInsurrections = 2;
        const minDiploBudget = targetInsurrections * MIN_BUDGET_PER_INSURRECTION;

        if (profile.subversiveness > 0.5) {
            // console.log(`[AI BUDGET] Ensuring min clandestine budget: ${minDiploBudget}`);

            if (budget.allocations.diplomacy < minDiploBudget) {
                const needed = minDiploBudget - budget.allocations.diplomacy;
                // Take from recruitment, but leave at least 100 for emergency
                const canTake = Math.max(0, budget.allocations.recruitment - 100);
                const toTake = Math.min(needed, canTake);
                budget.allocations.recruitment -= toTake;
                budget.allocations.diplomacy += toTake;
            }
        }

        // 4. DIPLOMACY (Insurrections & Negotiations)
        const dipResult = manageDiplomacy(state, faction, goals, profile, budget, true);
        const { remainingDiplomacyBudget, ...dipUpdates } = dipResult;
        state = { ...state, ...dipUpdates };

        // Calculate clandestine budget: remaining diplomacy budget after NEGOTIATE missions
        const clandestineBudget = remainingDiplomacyBudget ?? budget.allocations.diplomacy;

        // 5. MILITARY MOVEMENT
        state.armies = manageMilitary(state, faction, profile);

        // 5.5 SIEGE EXECUTION - Execute sieges from detected opportunities
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
        }

        // 5.6 EMERGENCY DISPATCH (Phase 2) - Move existing armies to threatened locations
        // Must run AFTER manageMilitary to avoid being overwritten by army object recreation
        dispatchEmergencyReinforcements(state, faction, insurrectionThreats, state.armies);

        // 6. LEADER MANAGEMENT
        // Use unified IPG-based assignment system
        const leaderResult = manageLeadersUnified(state, faction, clandestineBudget, state.turn);
        state = { ...state, ...leaderResult };

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
    }

    return state;
};

