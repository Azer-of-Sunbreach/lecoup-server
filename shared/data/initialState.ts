/**
 * Initial Game State Factory - Generates the starting state for a new game
 * Consolidates logic from useGameEngine.ts INITIAL_STATE
 */

import { GameState, FactionId, Army, LogType, LogSeverity } from '../types';
import { LARION_ALTERNATE_LOCATIONS, LARION_ALTERNATE_GARRISONS } from './maps/larion_alternate';
import { LARION_ALTERNATE_ROADS } from './maps/larion_alternate';
import { CHARACTERS_NEW as CHARACTERS } from './characters';
import { INITIAL_PLAYER_RESOURCES, INITIAL_AI_RESOURCES } from './gameConstants';

/**
 * Generate initial armies based on garrison data and locations
 */
export const generateInitialArmies = (): Army[] => {
    return Object.entries(LARION_ALTERNATE_GARRISONS).map(([locId, strength], index) => {
        const loc = LARION_ALTERNATE_LOCATIONS.find(l => l.id === locId);
        if (!loc) return null;
        return {
            id: `start_army_${index}`,
            faction: loc.faction,
            locationType: 'LOCATION' as const,
            locationId: locId,
            roadId: null,
            stageIndex: 0,
            direction: 'FORWARD' as const,
            originLocationId: locId,
            destinationId: null,
            turnsUntilArrival: 0,
            strength: strength,
            isInsurgent: false,
            isSpent: false,
            isSieging: false,
            foodSourceId: locId,
            lastSafePosition: { type: 'LOCATION' as const, id: locId }
        };
    }).filter(Boolean) as Army[];
};

/**
 * Generate initial resources based on player faction choice
 * AI factions receive boosted resources
 */
export const getInitialResources = (playerFaction: FactionId) => {
    return {
        [FactionId.REPUBLICANS]: {
            gold: playerFaction === FactionId.REPUBLICANS
                ? INITIAL_PLAYER_RESOURCES.REPUBLICANS
                : INITIAL_AI_RESOURCES.REPUBLICANS
        },
        [FactionId.CONSPIRATORS]: {
            gold: playerFaction === FactionId.CONSPIRATORS
                ? INITIAL_PLAYER_RESOURCES.CONSPIRATORS
                : INITIAL_AI_RESOURCES.CONSPIRATORS
        },
        [FactionId.NOBLES]: {
            gold: playerFaction === FactionId.NOBLES
                ? INITIAL_PLAYER_RESOURCES.NOBLES
                : INITIAL_AI_RESOURCES.NOBLES
        },
        [FactionId.NEUTRAL]: { gold: 0 },
    };
};

import { MapRegistry } from '../maps/MapRegistry';
import { MapId } from '../maps/types';

/**
 * Create the initial game state for starting a new game
 */
export const createInitialState = (playerFaction: FactionId, mapId: MapId = 'larion_alternate'): GameState => {
    // Get map definition rules
    const mapDef = MapRegistry.get(mapId);
    const initialCharacters = mapDef.rules ? mapDef.rules.getInitialCharacters() : [];

    return {
        turn: 1,
        // (NEW) Store mapId in state so economy calculator knows which rules to use
        mapId: mapId,
        playerFaction: playerFaction,
        locations: JSON.parse(JSON.stringify(LARION_ALTERNATE_LOCATIONS)), // Deep copy to prevent mutation persistence
        characters: JSON.parse(JSON.stringify(initialCharacters)),

        armies: generateInitialArmies(),
        convoys: [],
        navalConvoys: [],
        roads: JSON.parse(JSON.stringify(LARION_ALTERNATE_ROADS)),
        resources: {
            [FactionId.REPUBLICANS]: { gold: INITIAL_PLAYER_RESOURCES.REPUBLICANS },
            [FactionId.CONSPIRATORS]: { gold: INITIAL_PLAYER_RESOURCES.CONSPIRATORS },
            [FactionId.NOBLES]: { gold: INITIAL_PLAYER_RESOURCES.NOBLES },
            [FactionId.LOYALISTS]: { gold: 1000 },
            [FactionId.PRINCELY_ARMY]: { gold: 1000 },
            [FactionId.CONFEDERATE_CITIES]: { gold: 1000 },
            [FactionId.NEUTRAL]: { gold: 0 },
        },
        pendingNegotiations: [],
        logs: [
            { id: 'init_1', type: LogType.GAME_START, message: "The coup has begun. Count Rivenberg has claimed the regency for himself.", turn: 1, visibleToFactions: [], baseSeverity: LogSeverity.INFO },
            { id: 'init_2', type: LogType.GAME_START, message: "Baron Lekal has called on the great Dukes to defend their feudal rights.", turn: 1, visibleToFactions: [], baseSeverity: LogSeverity.INFO },
            { id: 'init_3', type: LogType.GAME_START, message: "Sir Azer and the Republicans took control of Sunbreach.", turn: 1, visibleToFactions: [], baseSeverity: LogSeverity.INFO },
            { id: 'init_4', type: LogType.GAME_START, message: "Civil war engulfs Larion.", turn: 1, visibleToFactions: [], baseSeverity: LogSeverity.INFO }
        ],
        stats: { deathToll: 0 },
        selectedType: null,
        selectedId: null,
        selectedStageIndex: null,
        selectedLocationId: null,
        isProcessing: false,
        combatQueue: [],
        combatState: null,
        showLeadersModal: false,
        showStartScreen: true,
        showStatsModal: false,
        showFactionModal: false,
        logsExpanded: true,
        grainTradeNotification: null,
        insurrectionNotification: null,
        famineNotification: null,
        siegeNotification: null,
        leaderEliminatedNotification: null,
        hasScannedBattles: false
    };
};
