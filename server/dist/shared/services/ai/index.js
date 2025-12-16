"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processAITurn = void 0;
const types_1 = require("../../types");
const profiles_1 = require("./profiles");
const strategy_1 = require("./strategy");
const economy_1 = require("./economy");
const diplomacy_1 = require("./diplomacy");
const military_1 = require("./military");
const leaders_1 = require("./leaders");
const budget_1 = require("./economy/budget");
const processAITurn = (gameState) => {
    let state = { ...gameState };
    const cpuFactions = [types_1.FactionId.REPUBLICANS, types_1.FactionId.CONSPIRATORS, types_1.FactionId.NOBLES].filter(f => f !== state.playerFaction);
    for (const faction of cpuFactions) {
        const profile = profiles_1.AI_PROFILES[faction];
        if (!profile)
            continue;
        // 1. ANALYSIS & STRATEGY
        const theaters = (0, strategy_1.analyzeTheaters)(state, faction);
        // Update Missions (Persistent)
        const missions = (0, strategy_1.updateMissions)(state, faction, theaters, profile);
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
        const goals = [];
        // 2. BUDGETING
        const totalGold = state.resources[faction].gold;
        // Determine emergency state
        const isUnderThreat = theaters.some(t => t.threatLevel > t.armyStrength);
        // Reduced reserve ratio from 0.3 to 0.15 for more aggressive spending
        let reserveRatio = isUnderThreat ? 0.1 : (profile.subversiveness > 0.6 ? 0.1 : 0.15);
        if (faction === types_1.FactionId.NOBLES && state.turn < 5)
            reserveRatio = 0.1; // Nobles spend heavily early
        const reserved = Math.floor(totalGold * reserveRatio);
        const available = totalGold - reserved;
        // Allocation (Integers only)
        // Ensure diplomacy gets enough if subversive
        const diploWeight = profile.subversiveness > 0.3 ? 0.5 : 0.1; // Increased weight for subversives (including Nobles now)
        const recruitWeight = isUnderThreat ? 0.8 : (faction === types_1.FactionId.NOBLES ? 0.7 : 0.4); // Nobles prioritize recruiting
        const fortWeight = profile.useFortifications ? 0.2 : 0;
        // Normalize weights rough approximation
        const totalWeight = diploWeight + recruitWeight + fortWeight;
        const budget = {
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
        (0, budget_1.applyBalancedRecruitmentOverride)(faction, state, budget, state.armies);
        // Allocate siege budget for fortified targets
        (0, budget_1.allocateSiegeBudget)(faction, state, budget);
        // 3. ECONOMY & LOGISTICS (Mutates State)
        const ecoResult = (0, economy_1.manageEconomy)(state, faction, profile, budget);
        state = { ...state, ...ecoResult };
        // 4. DIPLOMACY (Insurrections)
        const dipResult = (0, diplomacy_1.manageDiplomacy)(state, faction, goals, profile, budget);
        state = { ...state, ...dipResult };
        // 5. MILITARY MOVEMENT
        state.armies = (0, military_1.manageMilitary)(state, faction, profile);
        // 6. LEADER MANAGEMENT
        const leaderResult = (0, leaders_1.manageLeaders)(state, faction);
        state = { ...state, ...leaderResult };
    }
    return state;
};
exports.processAITurn = processAITurn;
