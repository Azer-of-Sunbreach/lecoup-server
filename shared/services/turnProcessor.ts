// Turn Processor - Main turn orchestration logic
// Refactored to use modular components

import { GameState, FactionId, FACTION_NAMES } from '../types';
import { calculateEconomyAndFood } from '../utils/economy';
// AI functions stubbed - server handles AI via gameLogic.ts directly
const processAITurn = (state: GameState): GameState => state;
const generateTurnNarrative = async (_turn: number, _events: string[], _faction: FactionId): Promise<string> => "The war continues...";
import { detectBattles } from './combatDetection';

// Import from turnLogic (already existed)
import { resolveMovements } from './turnLogic/movement';
import { processInsurrections, processConstruction, processAutoCapture } from './turnLogic/actions';

// Import from new modular structure
import {
    processConvoys,
    processNavalConvoys,
    processFamine,
    processStability,
    processNegotiations,
    resolveAIBattles,
    getPlayerBattles
} from './turnProcessor/index';

/**
 * Process a complete game turn.
 * 
 * Phases:
 * 1. AI Planning & Execution
 * 2. Turn Advancement & Reset
 * 3. Movement & Collisions
 * 4. Events & Actions (Insurrections, Construction, Auto-Capture)
 * 5. Logistics (Convoys, Economy, Famine, Stability, Negotiations)
 * 6. AI Battle Resolution
 * 7. Narrative & Victory Check
 * 
 * @param initialState - Game state before the turn
 * @returns Promise resolving to the updated game state
 */
export const processTurn = async (initialState: GameState): Promise<GameState> => {
    let state = { ...initialState };
    const logs: string[] = [];

    // --- PHASE 1: AI PLANNING & EXECUTION ---
    // Reset justMoved BEFORE AI turn, so previous-turn armies can be moved by AI
    state.armies = state.armies.map(a => ({ ...a, justMoved: false }));
    state = processAITurn(state);

    // --- PHASE 2: TURN ADVANCEMENT & RESET ---
    state.turn += 1;
    state.locations = state.locations.map(l => ({
        ...l,
        actionsTaken: { recruit: 0, seizeGold: 0, seizeFood: 0, incite: 0 },
        hasBeenSiegedThisTurn: false
    }));
    state.roads = state.roads.map(r => ({
        ...r,
        stages: r.stages.map(s => ({ ...s, hasBeenSiegedThisTurn: false }))
    }));

    // Reset Army Statuses (Spec 7.7)
    state.armies = state.armies.map(a => ({
        ...a,
        isSpent: false,
        isSieging: false,
        isInsurgent: false
    }));

    // --- PHASE 3: MOVEMENT & COLLISIONS ---
    const moveResult = resolveMovements(state);
    state.armies = moveResult.armies;
    state.characters = moveResult.characters;
    logs.push(...moveResult.logs);

    // --- PHASE 4: EVENTS & ACTIONS ---
    const revoltResult = processInsurrections(state.locations, state.characters, state.armies, state.playerFaction);
    state.locations = revoltResult.locations;
    state.characters = revoltResult.characters;
    state.armies = revoltResult.armies;
    logs.push(...revoltResult.logs);
    let insurrectionNotification = revoltResult.notification;

    if (revoltResult.refunds) {
        Object.entries(revoltResult.refunds).forEach(([faction, amount]) => {
            if (amount && amount > 0) state.resources[faction as FactionId].gold += amount;
        });
    }

    const buildResult = processConstruction(state);
    state.locations = buildResult.locations;
    state.roads = buildResult.roads;
    state.armies = buildResult.armies;
    logs.push(...buildResult.logs);

    const captureResult = processAutoCapture(state.locations, state.roads, state.armies, state.playerFaction);
    state.locations = captureResult.locations;
    state.roads = captureResult.roads;
    logs.push(...captureResult.logs);

    // Prioritize Embargo notification if it exists, otherwise allow Restore notification
    const grainTradeNotification = state.grainTradeNotification || captureResult.tradeNotification;

    // --- PHASE 5: LOGISTICS ---
    // 5.1 Land Convoys
    const convoyResult = processConvoys(state.convoys, state.roads, state.locations);
    state.convoys = convoyResult.convoys;
    state.locations = convoyResult.locations;
    logs.push(...convoyResult.logs);

    // 5.2 Naval Convoys
    const navalResult = processNavalConvoys(state.navalConvoys, state.locations);
    state.navalConvoys = navalResult.navalConvoys;
    state.locations = navalResult.locations;
    logs.push(...navalResult.logs);

    // 5.3 Economy
    state.locations = calculateEconomyAndFood(state.locations, state.armies, state.characters, state.roads);

    // 5.4 Famine
    const famineResult = processFamine(state);
    state.locations = famineResult.locations;
    state.armies = famineResult.armies;
    state.stats = famineResult.stats;
    logs.push(...famineResult.logs);
    const famineNotification = famineResult.famineNotification;

    // 5.5 Gold Income
    Object.values(FactionId).forEach(fid => {
        const income = state.locations.filter(l => l.faction === fid).reduce((sum, l) => sum + l.goldIncome, 0);
        state.resources[fid].gold += income;
    });

    // 5.6 Stability (Leader modifiers + Low tax recovery)
    const stabilityResult = processStability(state.locations, state.characters);
    state.locations = stabilityResult.locations;

    // 5.7 Negotiations
    const negResult = processNegotiations(state);
    state.locations = negResult.locations;
    state.armies = negResult.armies;
    state.pendingNegotiations = negResult.pendingNegotiations;
    logs.push(...negResult.logs);

    // --- PHASE 6: AI BATTLE RESOLUTION ---
    const battleResult = resolveAIBattles(state, insurrectionNotification);
    state.locations = battleResult.locations;
    state.roads = battleResult.roads;
    state.armies = battleResult.armies;
    state.characters = battleResult.characters;
    state.stats = battleResult.stats;
    logs.push(...battleResult.logs);
    insurrectionNotification = battleResult.insurrectionNotification;

    // Detect player battles
    const battles = detectBattles(state.locations, state.armies, state.roads);

    // FIX: On server (NEUTRAL) or simply for robust detection, we want ANY battle involving a human.
    // If state.playerFaction is NEUTRAL, getPlayerBattles(NEUTRAL) returns nothing useful for humans.
    let playerBattles: typeof battles = [];

    const humanFactions = (state as any).humanFactions || [state.playerFaction];

    if (state.playerFaction === FactionId.NEUTRAL) {
        // Server side: Get battles for ALL humans
        playerBattles = battles.filter(b =>
            humanFactions.includes(b.attackerFaction) ||
            humanFactions.includes(b.defenderFaction)
        );
    } else {
        // Client side or specific faction processing
        playerBattles = getPlayerBattles(battles, state.playerFaction);
    }

    // --- PHASE 7: NARRATIVE ---
    const narrativeEvents = [...logs];
    if (playerBattles.length > 0) {
        narrativeEvents.push("Battles have erupted involving your forces.");
    }

    let flavorText = "The war continues...";
    try {
        flavorText = await generateTurnNarrative(state.turn, narrativeEvents, state.playerFaction);
    } catch (e) { }
    logs.push(flavorText);

    // --- VICTORY CHECK ---
    const activeFactions = [FactionId.REPUBLICANS, FactionId.CONSPIRATORS, FactionId.NOBLES];
    for (const faction of activeFactions) {
        const ownedLocations = state.locations.filter(l => l.faction === faction);
        if (ownedLocations.length === state.locations.length) {
            let message = "Your armies are victorious... ";
            switch (faction) {
                case FactionId.REPUBLICANS: message += "but at what cost?"; break;
                case FactionId.CONSPIRATORS: message += "and Larion can finally enter a new era."; break;
                case FactionId.NOBLES: message += "and order is restored, for good."; break;
                default: message += "The land is yours.";
            }

            state.victory = {
                winner: faction,
                message: message
            };
            break;
        }
    }

    return {
        ...state,
        combatState: playerBattles.length > 0 ? playerBattles[0] : null,
        combatQueue: playerBattles.length > 0 ? playerBattles.slice(1) : [],
        logs: [...state.logs, ...logs].slice(-100),
        isProcessing: false,
        famineNotification,
        insurrectionNotification: (insurrectionNotification as any),
        grainTradeNotification
    };
}