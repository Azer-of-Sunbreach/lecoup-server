
import { GameState, FactionId } from '../../../shared/types';
import { AI_PROFILES } from './profiles';
import { analyzeTheaters, updateMissions } from './strategy';
import { executeRepublicanEarlyGame } from './strategy/republicanEarlyGame';
import { manageEconomy } from './economy';
import { manageDiplomacy } from './diplomacy';
import { manageMilitary } from './military';
import { manageLeaders } from './leaders';
import { AIBudget } from './types';
import { applyBalancedRecruitmentOverride, allocateSiegeBudget } from './economy/budget';

/**
 * Process AI turn for a SINGLE faction (used in multiplayer)
 */
export const processSingleFactionAITurn = (gameState: GameState, faction: FactionId): GameState => {
    let state = { ...gameState };
    const profile = AI_PROFILES[faction];

    if (!profile) {
        console.log(`[AI] No profile found for faction ${faction}`);
        return state;
    }

    console.log(`[AI] Processing turn for ${faction}`);
    console.log(`[AI GOLD DEBUG] ${faction} START: ${state.resources[faction].gold} gold`);

    // 1. ANALYSIS & STRATEGY
    const theaters = analyzeTheaters(state, faction);
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
                goals: []
            }
        }
    };

    const goals: any[] = [];

    // 2. BUDGETING
    const totalGold = state.resources[faction].gold;
    const isUnderThreat = theaters.some(t => t.threatLevel > t.armyStrength);
    let reserveRatio = isUnderThreat ? 0.1 : (profile.subversiveness > 0.6 ? 0.1 : 0.15);
    if (faction === FactionId.NOBLES && state.turn < 5) reserveRatio = 0.1;

    const reserved = Math.floor(totalGold * reserveRatio);
    const available = totalGold - reserved;

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

    // REPUBLICAN EARLY GAME SCRIPT (Turns 1-2)
    if (faction === FactionId.REPUBLICANS && state.turn <= 2) {
        const earlyResult = executeRepublicanEarlyGame(state, faction, budget);
        state = { ...state, ...earlyResult };
    }

    // 3. ECONOMY & LOGISTICS
    const ecoResult = manageEconomy(state, faction, profile, budget);
    state = { ...state, ...ecoResult };
    console.log(`[AI GOLD DEBUG] ${faction} AFTER ECONOMY: ${state.resources[faction].gold} gold`);

    // FIX: Guarantee minimum diplomacy budget for 2 insurrections
    const MIN_BUDGET_PER_INSURRECTION = 400;
    const targetInsurrections = 2;
    const minDiploBudget = targetInsurrections * MIN_BUDGET_PER_INSURRECTION;

    if (profile.subversiveness > 0.5) {
        console.log(`[AI BUDGET FIX ${faction}] Before final: diplo=${budget.allocations.diplomacy}, recruit=${budget.allocations.recruitment}`);

        if (budget.allocations.diplomacy < minDiploBudget) {
            const needed = minDiploBudget - budget.allocations.diplomacy;
            const canTake = Math.max(0, budget.allocations.recruitment - 100);
            const toTake = Math.min(needed, canTake);
            budget.allocations.recruitment -= toTake;
            budget.allocations.diplomacy += toTake;

            console.log(`[AI BUDGET FIX ${faction}] After final: diplo=${budget.allocations.diplomacy}, took=${toTake}`);
        }
    }

    // 4. DIPLOMACY (Insurrections)
    const dipResult = manageDiplomacy(state, faction, goals, profile, budget);
    state = { ...state, ...dipResult };
    console.log(`[AI GOLD DEBUG] ${faction} AFTER DIPLOMACY: ${state.resources[faction].gold} gold`);

    // 5. MILITARY MOVEMENT
    state.armies = manageMilitary(state, faction, profile);

    // 6. LEADER MANAGEMENT
    const leaderResult = manageLeaders(state, faction);
    state = { ...state, ...leaderResult };

    console.log(`[AI GOLD DEBUG] ${faction} END: ${state.resources[faction].gold} gold`);
    console.log(`[AI] Completed turn for ${faction}`);
    return state;
};

export const processAITurn = (gameState: GameState): GameState => {
    let state = { ...gameState };
    const cpuFactions = [FactionId.REPUBLICANS, FactionId.CONSPIRATORS, FactionId.NOBLES].filter(f => f !== state.playerFaction);

    for (const faction of cpuFactions) {
        const profile = AI_PROFILES[faction];
        if (!profile) continue;

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

        // Note: Sub-services (manageMilitary, manageDiplomacy) now read directly from state.aiState.missions
        // We pass empty goals array merely to satisfy legacy signatures if any remain.
        const goals: any[] = [];

        // 2. BUDGETING
        const totalGold = state.resources[faction].gold;
        // Determine emergency state
        const isUnderThreat = theaters.some(t => t.threatLevel > t.armyStrength);

        // Reduced reserve ratio from 0.3 to 0.15 for more aggressive spending
        let reserveRatio = isUnderThreat ? 0.1 : (profile.subversiveness > 0.6 ? 0.1 : 0.15);
        if (faction === FactionId.NOBLES && state.turn < 5) reserveRatio = 0.1; // Nobles spend heavily early

        const reserved = Math.floor(totalGold * reserveRatio);
        const available = totalGold - reserved;

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

        // REPUBLICAN EARLY GAME SCRIPT (Turns 1-2)
        if (faction === FactionId.REPUBLICANS && state.turn <= 2) {
            const earlyResult = executeRepublicanEarlyGame(state, faction, budget);
            state = { ...state, ...earlyResult };
        }

        // 3. ECONOMY & LOGISTICS (Mutates State)
        const ecoResult = manageEconomy(state, faction, profile, budget);
        state = { ...state, ...ecoResult };

        // FIX: Guarantee minimum diplomacy budget for 2 insurrections
        const MIN_BUDGET_PER_INSURRECTION = 400;
        const targetInsurrections = 2;
        const minDiploBudget = targetInsurrections * MIN_BUDGET_PER_INSURRECTION;

        if (profile.subversiveness > 0.5) {
            console.log(`[AI BUDGET FIX ${faction}] Before final: diplo=${budget.allocations.diplomacy}, recruit=${budget.allocations.recruitment}`);

            if (budget.allocations.diplomacy < minDiploBudget) {
                const needed = minDiploBudget - budget.allocations.diplomacy;
                const canTake = Math.max(0, budget.allocations.recruitment - 100);
                const toTake = Math.min(needed, canTake);
                budget.allocations.recruitment -= toTake;
                budget.allocations.diplomacy += toTake;

                console.log(`[AI BUDGET FIX ${faction}] After final: diplo=${budget.allocations.diplomacy}, took=${toTake}`);
            }
        }

        // 4. DIPLOMACY (Insurrections)
        const dipResult = manageDiplomacy(state, faction, goals, profile, budget);
        state = { ...state, ...dipResult };

        // 5. MILITARY MOVEMENT
        state.armies = manageMilitary(state, faction, profile);

        // 6. LEADER MANAGEMENT
        const leaderResult = manageLeaders(state, faction);
        state = { ...state, ...leaderResult };
    }

    return state;
};

