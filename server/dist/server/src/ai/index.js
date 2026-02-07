"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processAITurn = exports.processSingleFactionAITurn = void 0;
const types_1 = require("../../../shared/types");
const profiles_1 = require("./profiles");
const strategy_1 = require("./strategy");
const republicanEarlyGame_1 = require("./strategy/republicanEarlyGame");
const economy_1 = require("./economy");
const diplomacy_1 = require("./diplomacy");
const military_1 = require("./military");
const leaders_1 = require("./leaders");
const budget_1 = require("./economy/budget");
const budgetDistributor_1 = require("../../../shared/services/ai/budgetDistributor");
const leaders_2 = require("../../../shared/services/ai/leaders");
// AI Leader Recruitment (CONSPIRATORS)
const recruitment_1 = require("../../../shared/services/ai/leaders/recruitment");
// AI Leader Recruitment (NOBLES)
const recruitment_2 = require("../../../shared/services/ai/leaders/recruitment");
// Flags controlled by feature flags or config
const USE_NEW_LEADER_AI = true;
/**
 * Process AI turn for a SINGLE faction (used in multiplayer)
 */
const processSingleFactionAITurn = (gameState, faction) => {
    // START HUMAN CHECK (Double safety)
    const playerFactions = gameState.playerFactions || (gameState.playerFaction ? [gameState.playerFaction] : []);
    if (playerFactions.includes(faction)) {
        console.warn(`[AI SERVER] Attempted to process AI for HUMAN faction ${faction}. Aborting.`);
        return gameState;
    }
    // END HUMAN CHECK
    let state = { ...gameState };
    const profile = profiles_1.AI_PROFILES[faction];
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
exports.processSingleFactionAITurn = processSingleFactionAITurn;
const processAITurn = (gameState) => {
    let state = { ...gameState };
    // IMPROVED FILTERING FOR SERVER/MULTIPLAYER
    const playerFactions = state.playerFactions || (state.playerFaction ? [state.playerFaction] : []);
    const cpuFactions = [types_1.FactionId.REPUBLICANS, types_1.FactionId.CONSPIRATORS, types_1.FactionId.NOBLES].filter(f => !playerFactions.includes(f));
    console.log(`[AI SERVER] Processing CPU Factions: ${cpuFactions.join(', ')} (Human: ${playerFactions.join(', ')})`);
    for (const faction of cpuFactions) {
        const profile = profiles_1.AI_PROFILES[faction];
        if (!profile)
            continue;
        state = processAITurnForFaction(state, faction, profile);
    }
    return state;
};
exports.processAITurn = processAITurn;
// Extracted core logic to share between single/multi processing
function processAITurnForFaction(gameState, faction, profile) {
    let state = { ...gameState };
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
    const goals = [];
    // 2. BUDGETING
    const totalGold = state.resources[faction].gold;
    // Determine emergency state
    const isUnderThreat = theaters.some(t => t.threatLevel > t.armyStrength);
    // Reduced reserve ratio
    let reserveRatio = isUnderThreat ? 0.1 : (profile.subversiveness > 0.6 ? 0.1 : 0.15);
    if (faction === types_1.FactionId.NOBLES && state.turn < 5)
        reserveRatio = 0.1;
    const reserved = Math.floor(totalGold * reserveRatio);
    const available = totalGold - reserved;
    // Allocation (Integers only)
    const diploWeight = profile.subversiveness > 0.3 ? 0.5 : 0.1;
    const recruitWeight = isUnderThreat ? 0.8 : (faction === types_1.FactionId.NOBLES ? 0.7 : 0.4);
    const fortWeight = profile.useFortifications ? 0.2 : 0;
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
    (0, budget_1.applyBalancedRecruitmentOverride)(faction, state, budget, state.armies);
    (0, budget_1.allocateSiegeBudget)(faction, state, budget);
    // 2c. LEADER RECRUITMENT BUDGET (CONSPIRATORS only)
    // Reserve gold for leader recruitment fund BEFORE other allocations
    let leaderRecruitmentReserve = 0;
    let leaderRecruitmentSeizeGoldLocation;
    if (faction === types_1.FactionId.CONSPIRATORS) {
        const recruitBudget = (0, recruitment_1.calculateRecruitmentBudgetReservation)(state, faction);
        leaderRecruitmentReserve = recruitBudget.amountToReserve;
        leaderRecruitmentSeizeGoldLocation = recruitBudget.seizeGoldLocationId;
        if (leaderRecruitmentReserve > 0) {
            // Deduct from recruitment budget (military recruitment)
            const deductFromRecruitment = Math.min(leaderRecruitmentReserve, budget.allocations.recruitment);
            budget.allocations.recruitment -= deductFromRecruitment;
            if (recruitment_1.ENABLE_RECRUITMENT_LOGS) {
                console.log(`[AI LEADER RECRUIT ${faction}] Reserved ${leaderRecruitmentReserve}g for leader fund (${recruitBudget.reasoning})`);
            }
        }
    }
    // REPUBLICAN EARLY GAME SCRIPT (Turns 1-2)
    if (faction === types_1.FactionId.REPUBLICANS && state.turn <= 2) {
        const earlyResult = (0, republicanEarlyGame_1.executeRepublicanEarlyGame)(state, faction, budget);
        state = { ...state, ...earlyResult };
    }
    // 3. ECONOMY & LOGISTICS (Mutates State)
    const ecoResult = (0, economy_1.manageEconomy)(state, faction, profile, budget);
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
    // If using New Leader AI, we disable legacy insurrections in manageDiplomacy
    const dipResult = (0, diplomacy_1.manageDiplomacy)(state, faction, goals, profile, budget, USE_NEW_LEADER_AI);
    state = { ...state, ...dipResult };
    // 5. MILITARY MOVEMENT
    state.armies = (0, military_1.manageMilitary)(state, faction, profile);
    // 6. LEADER MANAGEMENT
    // Use new AI system if enabled, otherwise fallback to legacy
    if (USE_NEW_LEADER_AI) {
        // Distribute allocated diplomacy budget to leaders as clandestine budget
        const budgetResult = (0, budgetDistributor_1.distributeClandestineBudget)(state, faction, budget);
        state = { ...state, ...budgetResult };
        const leaderResult = (0, leaders_2.processLeaderAI)(state, faction, state.turn);
        // Merge updated characters
        if (leaderResult.updatedCharacters) {
            state.characters = leaderResult.updatedCharacters;
        }
        // Log debug info and persist important logs to state
        if (leaderResult.logs && leaderResult.logs.length > 0) {
            console.log(`[AI LEADER ${faction}] \n` + leaderResult.logs.join('\n'));
            // Convert string logs to LogEntry for in-game display (optional, but good for debugging)
            // Only add if they seem important (not just movement spam usually)
            // For now, we add them as INFO logs visible only to the AI faction (or debug)
            // Note: In single player, player is not this faction, so they won't see them unless we make them public.
            // Let's make them visible to everyone for now if they are important actions.
            const newLogs = leaderResult.logs
                .filter(log => {
                const msg = typeof log === 'string' ? log : log.message || '';
                return msg.includes('Agent Actions') || msg.includes('Governor Policies') || msg.includes('Commander Orders');
            })
                .map((log, index) => {
                const msg = typeof log === 'string' ? log : log.message || '';
                return {
                    id: `ai-log-${faction}-${state.turn}-${Date.now()}-${index}`,
                    type: 'LEADER',
                    message: msg,
                    turn: state.turn,
                    visibleToFactions: [],
                    baseSeverity: 'INFO'
                };
            });
            if (newLogs.length > 0) {
                // state.logs = [...state.logs, ...newLogs]; // Append to existing logs
                // Actually, let's NOT pollute the player log with debug info unless requested.
                // The user incorrectly stated "menu of logs no longer saves logs". 
                // This usually implies existing logs were WIPED.
                // Ensure we are preserving `state.logs` from input `gameState`.
                // In processAITurnForFaction: `let state = { ...gameState };` -> preserves logs.
                // In diplomacy.ts: `logs: [...state.logs]` -> preserves logs.
            }
        }
    }
    else {
        const leaderResult = (0, leaders_1.manageLeaders)(state, faction);
        state = { ...state, ...leaderResult };
    }
    // 7. LEADER RECRUITMENT (CONSPIRATORS only)
    // Process recruitment fund and recruit if ready
    if (faction === types_1.FactionId.CONSPIRATORS) {
        const recruitResult = (0, recruitment_1.processAIRecruitment)(state, faction, leaderRecruitmentReserve, leaderRecruitmentSeizeGoldLocation);
        state = { ...state, ...recruitResult.updatedState };
        recruitResult.logs.forEach(log => {
            if (recruitment_1.ENABLE_RECRUITMENT_LOGS || log.includes('SUCCESS')) {
                console.log(log);
            }
        });
    }
    // 8. LEADER RECRUITMENT (NOBLES only)
    // NOBLES grant fiefs instead of paying gold
    if (faction === types_1.FactionId.NOBLES) {
        const noblesRecruitResult = (0, recruitment_2.processAINoblesRecruitment)(state);
        if (noblesRecruitResult.leaderRecruited) {
            state = (0, recruitment_2.applyNoblesRecruitmentResults)(state, noblesRecruitResult);
        }
        noblesRecruitResult.logs.forEach(log => {
            if (recruitment_1.ENABLE_RECRUITMENT_LOGS || log.includes('SUCCESS')) {
                console.log(log);
            }
        });
    }
    return state;
}
