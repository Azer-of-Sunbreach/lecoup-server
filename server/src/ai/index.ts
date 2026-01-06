
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
import { distributeClandestineBudget } from '../../../shared/services/ai/budgetDistributor';

import { processLeaderAI } from '../../../shared/services/ai/leaders';

// Flags controlled by feature flags or config
const USE_NEW_LEADER_AI = true;

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
    const cpuFactions = [FactionId.REPUBLICANS, FactionId.CONSPIRATORS, FactionId.NOBLES].filter(f => !playerFactions.includes(f));

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
    const totalGold = state.resources[faction].gold;
    // Determine emergency state
    const isUnderThreat = theaters.some(t => t.threatLevel > t.armyStrength);

    // Reduced reserve ratio
    let reserveRatio = isUnderThreat ? 0.1 : (profile.subversiveness > 0.6 ? 0.1 : 0.15);
    if (faction === FactionId.NOBLES && state.turn < 5) reserveRatio = 0.1;

    const reserved = Math.floor(totalGold * reserveRatio);
    const available = totalGold - reserved;

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

    // REPUBLICAN EARLY GAME SCRIPT (Turns 1-2)
    if (faction === FactionId.REPUBLICANS && state.turn <= 2) {
        const earlyResult = executeRepublicanEarlyGame(state, faction, budget);
        state = { ...state, ...earlyResult };
    }

    // 3. ECONOMY & LOGISTICS (Mutates State)
    const ecoResult = manageEconomy(state, faction, profile, budget);
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
    const dipResult = manageDiplomacy(state, faction, goals, profile, budget, USE_NEW_LEADER_AI);

    state = { ...state, ...dipResult };

    // 5. MILITARY MOVEMENT
    state.armies = manageMilitary(state, faction, profile);

    // 6. LEADER MANAGEMENT
    // Use new AI system if enabled, otherwise fallback to legacy
    if (USE_NEW_LEADER_AI) {
        // Distribute allocated diplomacy budget to leaders as clandestine budget
        const budgetResult = distributeClandestineBudget(state, faction, budget);
        state = { ...state, ...budgetResult };

        const leaderResult = processLeaderAI(state, faction, state.turn);

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
                    const msg = typeof log === 'string' ? log : (log as any).message || '';
                    return msg.includes('Agent Actions') || msg.includes('Governor Policies') || msg.includes('Commander Orders');
                })
                .map((log, index) => {
                    const msg = typeof log === 'string' ? log : (log as any).message || '';
                    return {
                        id: `ai-log-${faction}-${state.turn}-${Date.now()}-${index}`,
                        type: 'LEADER' as any,
                        message: msg,
                        turn: state.turn,
                        visibleToFactions: [],
                        baseSeverity: 'INFO' as any
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
    } else {
        const leaderResult = manageLeaders(state, faction);
        state = { ...state, ...leaderResult };
    }

    return state;
}

