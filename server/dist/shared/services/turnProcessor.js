"use strict";
// Turn Processor - Main turn orchestration logic
// Shared module: Used by both client (solo) and server (multiplayer)
// AI functions are injected to allow client-specific AI logic
Object.defineProperty(exports, "__esModule", { value: true });
exports.processTurn = void 0;
const types_1 = require("../types");
const economy_1 = require("../utils/economy");
const combatDetection_1 = require("./combatDetection");
// Import from turnLogic
const movement_1 = require("./turnLogic/movement");
const actions_1 = require("./turnLogic/actions");
// Import from turnProcessor modules
const index_1 = require("./turnProcessor/index");
// Import log factory
const logFactory_1 = require("./logs/logFactory");
// Import undercover mission processing
const leaders_1 = require("./domain/leaders");
// Import clandestine action processing
const clandestine_1 = require("./domain/clandestine");
// Import resentment processing
const resentmentProcessing_1 = require("./domain/politics/resentmentProcessing");
// Default stubs (used by server)
const defaultProcessAITurn = (state) => state;
const defaultGenerateTurnNarrative = async (_turn, _events, _faction) => "The war continues...";
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
const processTurn = async (initialState, options = {}) => {
    const { processAITurn = defaultProcessAITurn, generateTurnNarrative = defaultGenerateTurnNarrative } = options;
    let state = { ...initialState };
    const logs = [];
    // --- PHASE 1: AI PLANNING & EXECUTION ---
    state = processAITurn(state);
    // --- PHASE 2: TURN ADVANCEMENT & RESET ---
    state.turn += 1;
    // Add turn separator log
    logs.push((0, logFactory_1.createTurnMarkerLog)(state.turn));
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
    const moveResult = (0, movement_1.resolveMovements)(state);
    state.armies = moveResult.armies;
    state.characters = moveResult.characters;
    logs.push(...moveResult.logs);
    // Reset justMoved AFTER movement resolution to prevent double-move bug
    state.armies = state.armies.map(a => ({ ...a, justMoved: false }));
    // Process undercover leader travel
    const missionResult = (0, leaders_1.processUndercoverMissionTravel)(state.characters, state.locations, state.armies, state.turn);
    state.characters = missionResult.characters;
    logs.push(...missionResult.logs);
    // --- PHASE 3b: CLANDESTINE ACTIONS ---
    // Process active clandestine operations (costs deducted at turn start, effects applied)
    const clandestineResult = (0, clandestine_1.processClandestineActions)(state.characters, state.locations, state.armies, state.turn);
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
            if (amount && amount > 0 && state.resources[faction]) {
                state.resources[faction].gold += amount;
            }
        });
    }
    // Extract leader elimination notification (take the first one if multiple)
    const leaderEliminatedNotification = missionResult.notifications.find((n) => n.type === 'LEADER_ELIMINATED');
    // --- PHASE 4: EVENTS & ACTIONS ---
    console.log('[TURN] Phase 4: Processing insurrections...');
    const revoltResult = (0, actions_1.processInsurrections)(state.locations, state.characters, state.armies, state.playerFaction, state.turn);
    state.locations = revoltResult.locations;
    state.characters = revoltResult.characters;
    state.armies = revoltResult.armies;
    logs.push(...revoltResult.logs);
    let insurrectionNotification = revoltResult.notification;
    const insurgentArmies = state.armies.filter(a => a.isInsurgent);
    console.log(`[TURN] After insurrections: ${insurgentArmies.length} insurgent armies exist`);
    if (revoltResult.refunds) {
        Object.entries(revoltResult.refunds).forEach(([faction, amount]) => {
            if (amount && amount > 0)
                state.resources[faction].gold += amount;
        });
    }
    const buildResult = (0, actions_1.processConstruction)(state);
    state.locations = buildResult.locations;
    state.roads = buildResult.roads;
    state.armies = buildResult.armies;
    logs.push(...buildResult.logs);
    const captureResult = (0, actions_1.processAutoCapture)(state.locations, state.roads, state.armies, state.characters, state.playerFaction, state.turn);
    state.locations = captureResult.locations;
    state.roads = captureResult.roads;
    state.characters = captureResult.characters;
    logs.push(...captureResult.logs);
    const grainTradeNotification = state.grainTradeNotification || captureResult.tradeNotification;
    // --- PHASE 5: LOGISTICS ---
    // 5.1 Land Convoys
    const convoyResult = (0, index_1.processConvoys)(state.convoys, state.roads, state.locations, state.turn);
    state.convoys = convoyResult.convoys;
    state.locations = convoyResult.locations;
    logs.push(...convoyResult.logs);
    // 5.2 Naval Convoys
    const navalResult = (0, index_1.processNavalConvoys)(state.navalConvoys, state.locations, state.turn);
    state.navalConvoys = navalResult.navalConvoys;
    state.locations = navalResult.locations;
    logs.push(...navalResult.logs);
    // 5.3 Economy
    state.locations = (0, economy_1.calculateEconomyAndFood)(state.locations, state.armies, state.characters, state.roads);
    // 5.4 Famine
    const famineResult = (0, index_1.processFamine)(state);
    state.locations = famineResult.locations;
    state.armies = famineResult.armies;
    state.stats = famineResult.stats;
    logs.push(...famineResult.logs);
    const famineNotification = famineResult.famineNotification;
    // 5.5 Gold Income
    console.log(`[TURN PROCESSOR] Gold BEFORE income: NOBLES=${state.resources.NOBLES.gold}, REP=${state.resources.REPUBLICANS.gold}, CONS=${state.resources.CONSPIRATORS.gold}`);
    Object.values(types_1.FactionId).forEach(fid => {
        const income = state.locations.filter(l => l.faction === fid).reduce((sum, l) => sum + l.goldIncome, 0);
        state.resources[fid].gold += income;
    });
    console.log(`[TURN PROCESSOR] Gold AFTER income: NOBLES=${state.resources.NOBLES.gold}, REP=${state.resources.REPUBLICANS.gold}, CONS=${state.resources.CONSPIRATORS.gold}`);
    // 5.5b Governor Policies (STABILIZE_REGION, APPEASE_MINDS, etc.)
    const govPoliciesResult = (0, index_1.processGovernorPolicies)(state.locations, state.characters, state.armies, state.resources, state.turn);
    state.locations = govPoliciesResult.locations;
    logs.push(...govPoliciesResult.logs);
    // Deduct gold costs from faction treasuries
    Object.entries(govPoliciesResult.goldCosts).forEach(([faction, cost]) => {
        if (cost > 0 && state.resources[faction]) {
            state.resources[faction].gold = Math.max(0, state.resources[faction].gold - cost);
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
    const stabilityResult = (0, index_1.processStability)(state.locations, state.characters, state.turn);
    state.locations = stabilityResult.locations;
    logs.push(...stabilityResult.logs);
    // 5.6b Resentment Processing (New system)
    // Shortage & Famine
    state.locations = (0, resentmentProcessing_1.processShortageResentment)(state.locations);
    // Very High Taxes ongoing resentment
    state.locations = (0, resentmentProcessing_1.processHighTaxResentment)(state.locations);
    // Embargo Resentment - DISABLED per user request
    // const windwardLoc = state.locations.find(l => l.id === 'windward');
    // Note: isGrainTradeActive=true means NO embargo. isGrainTradeActive=false means EMBARGO ACTIVE (except at start where it might be undefined/true)
    // Default is active trade (no embargo) => isGrainTradeActive !== false
    // const isEmbargoActive = windwardLoc ? windwardLoc.isGrainTradeActive === false : false;
    // if (isEmbargoActive && windwardLoc) {
    //     state.locations = processEmbargoResentment(state.locations, true, windwardLoc.faction);
    // }
    // 5.7 Negotiations
    const negResult = (0, index_1.processNegotiations)(state);
    state.locations = negResult.locations;
    state.armies = negResult.armies;
    state.pendingNegotiations = negResult.pendingNegotiations;
    state.characters = negResult.characters;
    logs.push(...negResult.logs);
    // --- PHASE 6: AI BATTLE RESOLUTION ---
    const battleResult = (0, index_1.resolveAIBattles)(state, insurrectionNotification);
    state.locations = battleResult.locations;
    state.roads = battleResult.roads;
    state.armies = battleResult.armies;
    state.characters = battleResult.characters;
    state.stats = battleResult.stats;
    logs.push(...battleResult.logs);
    insurrectionNotification = battleResult.insurrectionNotification;
    // Detect player battles
    console.log('[TURN] Detecting battles...');
    const battles = (0, combatDetection_1.detectBattles)(state.locations, state.armies, state.roads);
    console.log(`[TURN] detectBattles returned ${battles.length} total battles`);
    let playerBattles = [];
    const humanFactions = state.humanFactions;
    const isServerMode = Array.isArray(humanFactions) && humanFactions.length > 0;
    if (isServerMode) {
        playerBattles = battles.filter(b => humanFactions.includes(b.attackerFaction) ||
            humanFactions.includes(b.defenderFaction));
    }
    else {
        playerBattles = (0, index_1.getPlayerBattles)(battles, state.playerFaction);
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
    const activeFactions = [types_1.FactionId.REPUBLICANS, types_1.FactionId.CONSPIRATORS, types_1.FactionId.NOBLES];
    for (const faction of activeFactions) {
        const ownedLocations = state.locations.filter(l => l.faction === faction);
        if (ownedLocations.length === state.locations.length) {
            let message = "Your armies are victorious... ";
            switch (faction) {
                case types_1.FactionId.REPUBLICANS:
                    message += "but at what cost?";
                    break;
                case types_1.FactionId.CONSPIRATORS:
                    message += "and Larion can finally enter a new era.";
                    break;
                case types_1.FactionId.NOBLES:
                    message += "and order is restored, for good.";
                    break;
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
        locations: (0, resentmentProcessing_1.updatePreviousFaction)(state.locations),
        combatState: playerBattles.length > 0 ? playerBattles[0] : null,
        combatQueue: playerBattles.length > 0 ? playerBattles.slice(1) : [],
        logs: [...state.logs, ...logs].slice(-100),
        isProcessing: false,
        famineNotification,
        insurrectionNotification: insurrectionNotification,
        grainTradeNotification,
        leaderEliminatedNotification: leaderEliminatedNotification
    };
};
exports.processTurn = processTurn;
