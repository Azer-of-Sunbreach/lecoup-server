
import { GameState, FactionId } from '../../types';
import { AI_PROFILES } from './profiles';
import { analyzeTheaters, updateMissions } from './strategy';
import { manageEconomy } from './economy';
import { manageDiplomacy } from './diplomacy';
import { manageMilitary } from './military';
import { manageLeaders } from './leaders';
import { AIBudget } from './types';
import { applyBalancedRecruitmentOverride, allocateSiegeBudget } from './economy/budget';

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

        // 3. ECONOMY & LOGISTICS (Mutates State)
        const ecoResult = manageEconomy(state, faction, profile, budget);
        state = { ...state, ...ecoResult };

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

