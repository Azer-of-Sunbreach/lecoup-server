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
    getPlayerBattles,
    processGovernorPolicies
} from './turnProcessor/index';

// Import log factory
import { createTurnMarkerLog, createNarrativeLog } from './logs/logFactory';

// Import undercover mission processing and Nobles leader availability
import { processUndercoverMissionTravel, processNoblesLeaderAvailability } from './domain/leaders';

// Import clandestine action processing
import { processClandestineActions } from './domain/clandestine';

// Import resentment processing
import {
    processShortageResentment,
    processHighTaxResentment,
    processEmbargoResentment,
    updatePreviousFaction
} from './domain/politics/resentmentProcessing';

// Import Free Trader enforcement
import { enforceFreeTraderLimits } from './domain/economy/freeTrader';

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

    try {
        // --- PHASE 1: AI PLANNING & EXECUTION ---
        state = processAITurn(state);

        // --- PHASE 2: TURN ADVANCEMENT & RESET ---
        state.turn += 1;

        // Add turn separator log
        logs.push(createTurnMarkerLog(state.turn));

        // Process Nobles leader availability (leaders become recruitable at specific turns)
        const noblesAvailResult = processNoblesLeaderAvailability(state.characters, state.turn);
        state.characters = noblesAvailResult.characters;

        state.locations = state.locations.map(l => ({
            ...l,
            actionsTaken: { recruit: 0, seizeGold: 0, seizeFood: 0, incite: 0 },
            hasBeenSiegedThisTurn: false
        }));
        // Clear siege notification only if it's from a previous turn
        // (Keep notification set during current AI turn in Phase 1)
        if (state.siegeNotification && (state.siegeNotification as any).turn !== state.turn) {
            state.siegeNotification = null;
        }
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

        // Reset Character Statuses (e.g. abilities used once per turn)
        state.characters = state.characters.map(c => ({
            ...c,
            usedConscriptionThisTurn: false
        }));

        // --- PHASE 3: MOVEMENT & COLLISIONS ---
        const moveResult = resolveMovements(state);
        state.armies = moveResult.armies;
        state.characters = moveResult.characters;
        logs.push(...moveResult.logs);

        // Reset justMoved AFTER movement resolution to prevent double-move bug
        state.armies = state.armies.map(a => ({ ...a, justMoved: false }));

        // Process undercover leader travel
        const missionResult = processUndercoverMissionTravel(state.characters, state.locations, state.armies, state.turn);
        state.characters = missionResult.characters;
        logs.push(...missionResult.logs);

        // Enforce Free Trader tax limits after movement (leaders arrived)
        // This ensures tax levels are clamped if a Free Trader enters the region
        state.locations = state.locations.map(loc => {
            const result = enforceFreeTraderLimits(loc, state.characters);
            if (result.modified) {
                // We should log this modification
                logs.push({
                    id: `ft-clamp-${loc.id}-${state.turn}`,
                    type: LogType.ECONOMY,
                    message: `Free Trader influence in ${loc.name}: ${result.modifications.join(', ')}.`,
                    turn: state.turn,
                    visibleToFactions: [loc.faction],
                    baseSeverity: LogSeverity.WARNING
                });
                return result.location;
            }
            return loc;
        });

        // --- PHASE 3b: CLANDESTINE ACTIONS ---
        // Process active clandestine operations (costs deducted at turn start, effects applied)
        const clandestineResult = processClandestineActions(state.characters, state.locations, state.armies, state.turn);
        state.characters = clandestineResult.characters;
        state.locations = clandestineResult.locations;
        if (clandestineResult.armies) {
            state.armies = clandestineResult.armies;
        }
        logs.push(...clandestineResult.logs);

        // Add generated armies (e.g. insurgents)
        if (clandestineResult.newArmies && clandestineResult.newArmies.length > 0) {
            state.armies = [...state.armies, ...clandestineResult.newArmies];
            console.log(`[TURN] Generated ${clandestineResult.newArmies.length} armies from clandestine operations.`);
        }

        // Apply resource updates (e.g. seized budget from captured leaders)
        if (clandestineResult.resourceUpdates) {
            Object.entries(clandestineResult.resourceUpdates).forEach(([faction, amount]) => {
                if (amount && amount > 0 && state.resources[faction as FactionId]) {
                    state.resources[faction as FactionId].gold += amount;
                }
            });
        }

        // Extract leader elimination notification (take the first one if multiple)
        const leaderEliminatedNotification = missionResult.notifications.find((n: any) => n.type === 'LEADER_ELIMINATED');

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

        const captureResult = processAutoCapture(state.locations, state.roads, state.armies, state.characters, state.playerFaction, state.turn);
        state.locations = captureResult.locations;
        state.roads = captureResult.roads;
        state.characters = captureResult.characters;
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
        state.locations = calculateEconomyAndFood(state, state.locations, state.armies, state.characters, state.roads);

        // 5.4 Famine
        const famineResult = processFamine(state);
        state.locations = famineResult.locations;
        state.armies = famineResult.armies;
        state.stats = famineResult.stats;
        logs.push(...famineResult.logs);
        const famineNotification = famineResult.famineNotification;

        // 5.5 Gold Income
        console.log(`[TURN PROCESSOR] Gold BEFORE income: NOBLES=${state.resources.NOBLES?.gold}, REP=${state.resources.REPUBLICANS?.gold}, CONS=${state.resources.CONSPIRATORS?.gold}`);
        Object.values(FactionId).forEach(fid => {
            if (state.resources[fid]) {
                const income = state.locations.filter(l => l.faction === fid).reduce((sum, l) => sum + l.goldIncome, 0);
                state.resources[fid].gold += income;
            }
        });
        console.log(`[TURN PROCESSOR] Gold AFTER income: NOBLES=${state.resources.NOBLES?.gold}, REP=${state.resources.REPUBLICANS?.gold}, CONS=${state.resources.CONSPIRATORS?.gold}`);

        // 5.5b Governor Policies (STABILIZE_REGION, APPEASE_MINDS, etc.)
        const govPoliciesResult = processGovernorPolicies(
            state.locations,
            state.characters,
            state.armies,
            state.resources,
            state.turn,
            state.mapId
        );
        state.locations = govPoliciesResult.locations;
        logs.push(...govPoliciesResult.logs);

        // Deduct gold costs from faction treasuries
        Object.entries(govPoliciesResult.goldCosts).forEach(([faction, cost]) => {
            if (cost > 0 && state.resources[faction as FactionId]) {
                state.resources[faction as FactionId].gold = Math.max(0, state.resources[faction as FactionId].gold - cost);
            }
        });

        // Apply food costs to locations (reduces foodStock or production)
        // Food costs are tracked per-location and affect the linked rural area's contribution to the city
        // For now, we store them in location state for display purposes
        // The actual deduction happens during food stock updates (already calculated in territorialStats)
        Object.entries(govPoliciesResult.foodCosts).forEach(([locationId, cost]) => {
            if (cost > 0) {
                const locIndex = state.locations.findIndex(l => l.id === locationId);
                if (locIndex >= 0) {
                    // Store food cost for display in Granary & Supply
                    state.locations[locIndex] = {
                        ...state.locations[locIndex],
                        governorFoodCost: cost
                    };
                }
            }
        });

        // 5.6 Stability
        const stabilityResult = processStability(state.locations, state.characters, state.turn);
        state.locations = stabilityResult.locations;
        logs.push(...stabilityResult.logs);

        // 5.6b Resentment Processing (New system)
        // Shortage & Famine
        state.locations = processShortageResentment(state.locations);

        // Very High Taxes ongoing resentment
        state.locations = processHighTaxResentment(state.locations);

        // Embargo Resentment - DISABLED per user request
        // const windwardLoc = state.locations.find(l => l.id === 'windward');
        // Note: isGrainTradeActive=true means NO embargo. isGrainTradeActive=false means EMBARGO ACTIVE (except at start where it might be undefined/true)
        // Default is active trade (no embargo) => isGrainTradeActive !== false
        // const isEmbargoActive = windwardLoc ? windwardLoc.isGrainTradeActive === false : false;

        // if (isEmbargoActive && windwardLoc) {
        //     state.locations = processEmbargoResentment(state.locations, true, windwardLoc.faction);
        // }

        // 5.7 Negotiations
        const negResult = processNegotiations(state);
        state.locations = negResult.locations;
        state.armies = negResult.armies;
        state.pendingNegotiations = negResult.pendingNegotiations;
        state.characters = negResult.characters;
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
        const activeFactions = [
            FactionId.REPUBLICANS, FactionId.CONSPIRATORS, FactionId.NOBLES,
            FactionId.LINEAGES_COUNCIL, FactionId.OATH_COALITION, FactionId.LARION_EXPEDITION
        ];
        for (const faction of activeFactions) {
            const ownedLocations = state.locations.filter(l => l.faction === faction);
            if (ownedLocations.length === state.locations.length) {
                let messageKey = "victory.messages.default";
                switch (faction) {
                    case FactionId.REPUBLICANS: messageKey = "victory.messages.REPUBLICANS"; break;
                    case FactionId.CONSPIRATORS: messageKey = "victory.messages.CONSPIRATORS"; break;
                    case FactionId.NOBLES: messageKey = "victory.messages.NOBLES"; break;
                    // Thyrakat factions use the thyrakat namespace
                    case FactionId.OATH_COALITION: messageKey = "thyrakat:victory.messages.OATH_COALITION"; break;
                    case FactionId.LINEAGES_COUNCIL: messageKey = "thyrakat:victory.messages.LINEAGES_COUNCIL"; break;
                    case FactionId.LARION_EXPEDITION: messageKey = "thyrakat:victory.messages.LARION_EXPEDITION"; break;
                }

                state.victory = {
                    winner: faction,
                    message: messageKey
                };
                break;
            }
        }

        return {
            ...state,
            locations: updatePreviousFaction(state.locations),
            combatState: playerBattles.length > 0 ? playerBattles[0] : null,
            combatQueue: playerBattles.length > 0 ? playerBattles.slice(1) : [],
            logs: [...state.logs, ...logs].slice(-100),
            isProcessing: false,
            famineNotification,
            insurrectionNotification: (insurrectionNotification as any),
            grainTradeNotification,
            leaderEliminatedNotification: (leaderEliminatedNotification as any)
        };
    } catch (error) {
        console.error('[TURN PROCESSOR] Critical Error:', error);
        // Ensure we unblock the UI even if turn failed
        return {
            ...initialState,
            isProcessing: false,
            logs: [...initialState.logs, {
                id: `error-${Date.now()}`,
                type: LogType.NARRATIVE,
                message: "Turn processing failed: " + (error instanceof Error ? error.message : String(error)),
                turn: initialState.turn,
                visibleToFactions: [initialState.playerFaction],
                baseSeverity: LogSeverity.CRITICAL
            } as any]
        };
    }
}