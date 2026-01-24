"use strict";
// State Utilities - Conversion between legacy GameState and new CoreGameState/UIState
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPlayerTurn = exports.getNextTurnFaction = exports.calculateTurnOrder = exports.createInitialUIState = exports.combineToLegacyState = exports.extractUIState = exports.extractCoreState = void 0;
const types_1 = require("../types");
/**
 * Extract CoreGameState from legacy GameState
 * Used when sending state over network
 */
const extractCoreState = (state, gameId = 'solo') => {
    // Use currentTurnFaction if it exists (multiplayer), otherwise playerFaction (solo)
    const currentFaction = state.currentTurnFaction || state.playerFaction;
    const humanFactions = state.humanFactions || [state.playerFaction];
    const aiFactionValue = state.aiFaction !== undefined ? state.aiFaction : null;
    const turnOrderValue = state.turnOrder || [types_1.FactionId.REPUBLICANS, types_1.FactionId.CONSPIRATORS, types_1.FactionId.NOBLES];
    return {
        gameId,
        turn: state.turn,
        currentPlayerFaction: currentFaction,
        turnOrder: turnOrderValue,
        playerFactions: humanFactions,
        aiFaction: aiFactionValue,
        locations: state.locations,
        armies: state.armies,
        characters: state.characters,
        roads: state.roads,
        convoys: state.convoys,
        navalConvoys: state.navalConvoys,
        resources: state.resources,
        pendingNegotiations: state.pendingNegotiations,
        combatState: state.combatState,
        combatQueue: state.combatQueue,
        aiState: state.aiState,
        stats: state.stats,
        logs: state.logs,
        victory: state.victory
    };
};
exports.extractCoreState = extractCoreState;
/**
 * Extract UIState from legacy GameState
 * Used for local client state
 */
const extractUIState = (state) => {
    return {
        myFaction: state.playerFaction,
        selectedType: state.selectedType,
        selectedId: state.selectedId,
        selectedStageIndex: state.selectedStageIndex,
        selectedLocationId: state.selectedLocationId,
        isProcessing: state.isProcessing,
        showStartScreen: state.showStartScreen,
        showLeadersModal: state.showLeadersModal,
        showStatsModal: state.showStatsModal,
        showFactionModal: state.showFactionModal,
        logsExpanded: state.logsExpanded,
        grainTradeNotification: state.grainTradeNotification,
        insurrectionNotification: state.insurrectionNotification,
        famineNotification: state.famineNotification,
        siegeNotification: state.siegeNotification,
        leaderEliminatedNotification: state.leaderEliminatedNotification,
        hasScannedBattles: state.hasScannedBattles
    };
};
exports.extractUIState = extractUIState;
/**
 * Combine CoreGameState and UIState back into legacy GameState
 * Used for backwards compatibility with existing components
 */
const combineToLegacyState = (core, ui) => {
    return {
        turn: core.turn,
        playerFaction: ui.myFaction,
        locations: core.locations,
        armies: core.armies,
        convoys: core.convoys,
        navalConvoys: core.navalConvoys,
        roads: core.roads,
        characters: core.characters,
        resources: core.resources,
        pendingNegotiations: core.pendingNegotiations,
        logs: core.logs,
        stats: core.stats,
        aiState: core.aiState,
        selectedType: ui.selectedType,
        selectedId: ui.selectedId,
        selectedStageIndex: ui.selectedStageIndex,
        selectedLocationId: ui.selectedLocationId,
        isProcessing: ui.isProcessing,
        combatQueue: core.combatQueue,
        combatState: core.combatState,
        showStartScreen: ui.showStartScreen,
        showLeadersModal: ui.showLeadersModal,
        showStatsModal: ui.showStatsModal,
        showFactionModal: ui.showFactionModal,
        logsExpanded: ui.logsExpanded,
        grainTradeNotification: ui.grainTradeNotification,
        insurrectionNotification: ui.insurrectionNotification,
        famineNotification: ui.famineNotification,
        siegeNotification: ui.siegeNotification,
        leaderEliminatedNotification: ui.leaderEliminatedNotification,
        victory: core.victory,
        hasScannedBattles: ui.hasScannedBattles
    };
};
exports.combineToLegacyState = combineToLegacyState;
/**
 * Create initial UIState
 */
const createInitialUIState = (faction) => ({
    myFaction: faction,
    selectedType: null,
    selectedId: null,
    selectedStageIndex: null,
    selectedLocationId: null,
    isProcessing: false,
    showStartScreen: true,
    showLeadersModal: false,
    showStatsModal: false,
    showFactionModal: false,
    logsExpanded: false,
    grainTradeNotification: null,
    insurrectionNotification: null,
    famineNotification: null,
    siegeNotification: null,
    leaderEliminatedNotification: null,
    hasScannedBattles: false
});
exports.createInitialUIState = createInitialUIState;
/**
 * Determine turn order based on human players
 * Humans play before AI, in faction order: Republicans -> Conspirators -> Nobles
 */
const calculateTurnOrder = (playerFactions, aiFaction) => {
    const factionOrder = [types_1.FactionId.REPUBLICANS, types_1.FactionId.CONSPIRATORS, types_1.FactionId.NOBLES];
    // Sort human factions by natural order
    const humanTurns = factionOrder.filter(f => playerFactions.includes(f));
    // Add AI faction at the end if present
    if (aiFaction) {
        return [...humanTurns, aiFaction];
    }
    return humanTurns;
};
exports.calculateTurnOrder = calculateTurnOrder;
/**
 * Get next faction in turn order
 */
const getNextTurnFaction = (currentFaction, turnOrder) => {
    const currentIndex = turnOrder.indexOf(currentFaction);
    const nextIndex = (currentIndex + 1) % turnOrder.length;
    return turnOrder[nextIndex];
};
exports.getNextTurnFaction = getNextTurnFaction;
/**
 * Check if it's a specific player's turn
 */
const isPlayerTurn = (currentFaction, myFaction) => {
    return currentFaction === myFaction;
};
exports.isPlayerTurn = isPlayerTurn;
