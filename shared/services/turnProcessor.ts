// Turn Processor - Main turn orchestration logic
// Shared module: Used by both client (solo) and server (multiplayer)
// AI functions are injected to allow client-specific AI logic

import { GameState, FactionId, FACTION_NAMES, LogEntry, LogSeverity, LogType } from '../types';
import { calculateEconomyAndFood } from '../utils/economy';
import { detectBattles } from './combatDetection';

// Import from turnLogic
import { resolveMovements } from './turnLogic/movement';
import { processInsurrections, processConstruction, processAutoCapture } from './turnLogic/actions';

// Import from turnProcessor modules
import {
    processConvoys,
    processNavalConvoys,
    processFamine,
    processStability,
    processNegotiations,
    resolveAIBattles,
    getPlayerBattles
} from './turnProcessor/index';

// Import log factory
import { createTurnMarkerLog, createNarrativeLog } from './logs/logFactory';

/**
 * AI function types for injection
 */
export interface TurnProcessorOptions {
    /** Process AI turn (client-only, handles AI planning and execution) */
    processAITurn?: (state: GameState) => GameState;
    /** Generate narrative flavor text (client-only, may use external API) */
    generateTurnNarrative?: (turn: number, events: string[], faction: FactionId) => Promise<string>;
}

// Default stubs (used by server)
const defaultProcessAITurn = (state: GameState): GameState => state;
const defaultGenerateTurnNarrative = async (_turn: number, _events: string[], _faction: FactionId): Promise<string> => "The war continues...";

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
 * @param options - Optional AI functions to inject (client provides these)
 * @returns Promise resolving to the updated game state
 */
export const processTurn = async (
    initialState: GameState,
    options: TurnProcessorOptions = {}
): Promise<GameState> => {
    const {
        processAITurn = defaultProcessAITurn,
        generateTurnNarrative = defaultGenerateTurnNarrative
    } = options;

    let state = { ...initialState };
    const logs: LogEntry[] = [];

    // --- PHASE 1: AI PLANNING & EXECUTION ---
    state = processAITurn(state);

    // --- PHASE 2: TURN ADVANCEMENT & RESET ---
    state.turn += 1;

    // Add turn separator log
    logs.push(createTurnMarkerLog(state.turn));

    state.locations = state.locations.map(l => ({
        ...l,
        actionsTaken: { recruit: 0, seizeGold: 0, seizeFood: 0, incite: 0 },
        hasBeenSiegedThisTurn: false
    }));
    state.roads = state.roads.map(r => ({
        ...r,
        stages: r.stages.map(s => ({ ...s, hasBeenSiegedThisTurn: false }))
    }));

    // Reset Army Statuses
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

    // Reset justMoved AFTER movement resolution to prevent double-move bug
    state.armies = state.armies.map(a => ({ ...a, justMoved: false }));

    // --- PHASE 4: EVENTS & ACTIONS ---
    console.log('[TURN] Phase 4: Processing insurrections...');
    const revoltResult = processInsurrections(state.locations, state.characters, state.armies, state.playerFaction, state.turn);
    state.locations = revoltResult.locations;
    state.characters = revoltResult.characters;
    state.armies = revoltResult.armies;
    logs.push(...revoltResult.logs);
    let insurrectionNotification = revoltResult.notification;

    const insurgentArmies = state.armies.filter(a => a.isInsurgent);
    console.log(`[TURN] After insurrections: ${insurgentArmies.length} insurgent armies exist`);

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

    const captureResult = processAutoCapture(state.locations, state.roads, state.armies, state.playerFaction, state.turn);
    state.locations = captureResult.locations;
    state.roads = captureResult.roads;
    logs.push(...captureResult.logs);

    const grainTradeNotification = state.grainTradeNotification || captureResult.tradeNotification;

    // --- PHASE 5: LOGISTICS ---
    // 5.1 Land Convoys
    const convoyResult = processConvoys(state.convoys, state.roads, state.locations, state.turn);
    state.convoys = convoyResult.convoys;
    state.locations = convoyResult.locations;
    logs.push(...convoyResult.logs);

    // 5.2 Naval Convoys
    const navalResult = processNavalConvoys(state.navalConvoys, state.locations, state.turn);
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

    // 5.6 Stability
    const stabilityResult = processStability(state.locations, state.characters, state.turn);
    state.locations = stabilityResult.locations;
    logs.push(...stabilityResult.logs);

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
    console.log('[TURN] Detecting battles...');
    const battles = detectBattles(state.locations, state.armies, state.roads);
    console.log(`[TURN] detectBattles returned ${battles.length} total battles`);

    let playerBattles: typeof battles = [];
    const humanFactions = (state as any).humanFactions as FactionId[] | undefined;
    const isServerMode = Array.isArray(humanFactions) && humanFactions.length > 0;

    if (isServerMode) {
        playerBattles = battles.filter(b =>
            humanFactions.includes(b.attackerFaction) ||
            humanFactions.includes(b.defenderFaction)
        );
    } else {
        playerBattles = getPlayerBattles(battles, state.playerFaction);
    }

    // --- PHASE 7: NARRATIVE ---
    // Extract messages from LogEntry[] for narrative generation
    const narrativeEvents = logs.map(l => l.message);
    if (playerBattles.length > 0) {
        narrativeEvents.push("Battles have erupted involving your forces.");
    }


    // NARRATIVE LOG DISABLED per user request
    // If you want to re-enable: uncomment the following lines
    // let flavorText = "The war continues...";
    // try {
    //     flavorText = await generateTurnNarrative(state.turn, narrativeEvents, state.playerFaction);
    // } catch (e) { }
    // logs.push(createNarrativeLog(flavorText, state.turn));

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