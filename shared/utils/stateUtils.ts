// State Utilities - Conversion between legacy GameState and new CoreGameState/UIState

import {
    GameState,
    CoreGameState,
    UIState,
    FactionId,
    GameMode,
    CombinedGameState
} from '../types';

/**
 * Extract CoreGameState from legacy GameState
 * Used when sending state over network
 */
export const extractCoreState = (state: GameState, gameId: string = 'solo'): CoreGameState => {
    return {
        gameId,
        turn: state.turn,
        currentPlayerFaction: state.playerFaction,
        turnOrder: [FactionId.REPUBLICANS, FactionId.CONSPIRATORS, FactionId.NOBLES],
        playerFactions: [state.playerFaction], // Solo: only one human
        aiFaction: null, // Will be set properly in multiplayer

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

/**
 * Extract UIState from legacy GameState
 * Used for local client state
 */
export const extractUIState = (state: GameState): UIState => {
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
        hasScannedBattles: state.hasScannedBattles
    };
};

/**
 * Combine CoreGameState and UIState back into legacy GameState
 * Used for backwards compatibility with existing components
 */
export const combineToLegacyState = (
    core: CoreGameState,
    ui: UIState
): GameState => {
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

        victory: core.victory,
        hasScannedBattles: ui.hasScannedBattles
    };
};

/**
 * Create initial UIState
 */
export const createInitialUIState = (faction: FactionId): UIState => ({
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
    hasScannedBattles: false
});

/**
 * Determine turn order based on human players
 * Humans play before AI, in faction order: Republicans -> Conspirators -> Nobles
 */
export const calculateTurnOrder = (
    playerFactions: FactionId[],
    aiFaction: FactionId | null
): FactionId[] => {
    const factionOrder = [FactionId.REPUBLICANS, FactionId.CONSPIRATORS, FactionId.NOBLES];

    // Sort human factions by natural order
    const humanTurns = factionOrder.filter(f => playerFactions.includes(f));

    // Add AI faction at the end if present
    if (aiFaction) {
        return [...humanTurns, aiFaction];
    }

    return humanTurns;
};

/**
 * Get next faction in turn order
 */
export const getNextTurnFaction = (
    currentFaction: FactionId,
    turnOrder: FactionId[]
): FactionId => {
    const currentIndex = turnOrder.indexOf(currentFaction);
    const nextIndex = (currentIndex + 1) % turnOrder.length;
    return turnOrder[nextIndex];
};

/**
 * Check if it's a specific player's turn
 */
export const isPlayerTurn = (
    currentFaction: FactionId,
    myFaction: FactionId
): boolean => {
    return currentFaction === myFaction;
};
