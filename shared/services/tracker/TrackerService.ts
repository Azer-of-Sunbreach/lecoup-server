/**
 * TrackerService - Collects faction metrics at each turn
 * Shared module: Used by both client (solo) and server (multiplayer)
 */

import { GameState, FactionId, CharacterStatus, Location, Army, Character, LocationType } from '../../types';
import { TurnSnapshot, FactionSnapshot, TrackerState } from '../../types/trackerTypes';
import { MapRegistry } from '../../maps/MapRegistry';
import { MapId } from '../../maps/types';
import { calculateFactionRevenue, calculateRuralFoodStats, calculateCityFoodStats } from '../domain/territorial/territorialStats';

/**
 * Calculate average stability of territories controlled by a faction
 */
const calculateAverageStability = (locations: Location[], faction: FactionId): number => {
    const controlled = locations.filter(l => l.faction === faction);
    if (controlled.length === 0) return 0;
    const totalStability = controlled.reduce((sum, l) => sum + l.stability, 0);
    return Math.round(totalStability / controlled.length);
};

/**
 * Calculate total troop strength for a faction
 */
const calculateTotalTroops = (armies: Army[], faction: FactionId): number => {
    return armies
        .filter(a => a.faction === faction)
        .reduce((sum, a) => sum + a.strength, 0);
};

/**
 * Count living leaders for a faction
 */
const countLivingLeaders = (characters: Character[], faction: FactionId): number => {
    return characters.filter(c => 
        c.faction === faction && 
        c.status !== CharacterStatus.DEAD &&
        !c.isRecruitableLeader // Exclude not-yet-recruited leaders
    ).length;
};

/**
 * Calculate total income for a faction
 */
const calculateTotalIncome = (
    locations: Location[],
    roads: GameState['roads'],
    characters: Character[],
    faction: FactionId
): number => {
    return calculateFactionRevenue(faction, locations, roads, characters);
};

/**
 * Calculate food balance (production - consumption) for a faction
 */
const calculateFoodBalance = (
    locations: Location[],
    armies: Army[],
    characters: Character[],
    faction: FactionId
): number => {
    const factionLocations = locations.filter(l => l.faction === faction);
    const cities = factionLocations.filter(l => l.type === LocationType.CITY);
    const rurals = factionLocations.filter(l => l.type === LocationType.RURAL);

    let totalProduction = 0;
    let totalConsumption = 0;

    // Calculate rural production
    rurals.forEach(rural => {
        const ruralStats = calculateRuralFoodStats(rural, locations, armies, characters);
        if (ruralStats) {
            totalProduction += Math.max(0, ruralStats.netProduction);
        }
    });

    // Calculate city consumption
    cities.forEach(city => {
        const cityStats = calculateCityFoodStats(city, locations, armies, characters);
        if (cityStats) {
            // Consumption = pop + army + governor actions + embargo - food imports - rationing
            const consumption = cityStats.populationConsumption + 
                               cityStats.armyConsumption + 
                               cityStats.governorActions + 
                               cityStats.embargoMalus - 
                               cityStats.foodImports - 
                               cityStats.rationingBonus;
            totalConsumption += consumption;
        }
    });

    return totalProduction - totalConsumption;
};

/**
 * Get playable factions for a map
 */
export const getPlayableFactions = (mapId?: string): FactionId[] => {
    const id = (mapId || 'larion_alternate') as MapId;
    const mapDef = MapRegistry.get(id);
    return mapDef.factions.filter(f => f !== FactionId.NEUTRAL);
};

/**
 * Capture a snapshot of all faction metrics at the current turn
 */
export const captureSnapshot = (state: GameState): TurnSnapshot => {
    const playableFactions = getPlayableFactions(state.mapId);
    
    const factionSnapshots: Partial<Record<FactionId, FactionSnapshot>> = {};
    
    for (const faction of playableFactions) {
        factionSnapshots[faction] = {
            gold: state.resources[faction]?.gold ?? 0,
            stability: calculateAverageStability(state.locations, faction),
            troops: calculateTotalTroops(state.armies, faction),
            leaders: countLivingLeaders(state.characters, faction),
            income: calculateTotalIncome(state.locations, state.roads, state.characters, faction),
            foodBalance: calculateFoodBalance(state.locations, state.armies, state.characters, faction)
        };
    }
    
    return {
        turn: state.turn,
        factions: factionSnapshots
    };
};

/**
 * Add a new snapshot to the tracker state
 * Returns a new TrackerState with the snapshot added
 */
export const addSnapshot = (trackerState: TrackerState, snapshot: TurnSnapshot): TrackerState => {
    // Prevent duplicates (same turn)
    const existingIndex = trackerState.snapshots.findIndex(s => s.turn === snapshot.turn);
    
    if (existingIndex >= 0) {
        // Replace existing snapshot for this turn
        const newSnapshots = [...trackerState.snapshots];
        newSnapshots[existingIndex] = snapshot;
        return { ...trackerState, snapshots: newSnapshots };
    }
    
    return {
        ...trackerState,
        snapshots: [...trackerState.snapshots, snapshot]
    };
};

/**
 * Process tracker data collection at end of turn
 * Should be called after turn processing is complete
 */
export const processTrackerSnapshot = (
    state: GameState,
    trackerState: TrackerState
): TrackerState => {
    if (!trackerState.enabled) {
        return trackerState;
    }
    
    const snapshot = captureSnapshot(state);
    return addSnapshot(trackerState, snapshot);
};
