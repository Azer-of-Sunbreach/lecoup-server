// Combat Helpers - Shared utility functions for combat resolution

import { GameState, Army, CombatState, FactionId, Road, Location } from '../../types';
import { getRetreatPosition } from './retreatLogic';

/**
 * Get the name of the combat location for logging purposes
 */
export const getLocationName = (
    combat: CombatState,
    locations: Location[],
    roads: Road[]
): string => {
    if (combat.locationId) {
        return locations.find(l => l.id === combat.locationId)?.name || 'Unknown Location';
    }
    if (combat.roadId && combat.stageIndex !== undefined) {
        const road = roads.find(r => r.id === combat.roadId);
        return road?.stages[combat.stageIndex]?.name || 'Road Stage';
    }
    return 'Unknown Location';
};

/**
 * Get all armies of a faction at the combat location
 */
export const getArmiesAtCombatLocation = (
    faction: FactionId,
    armies: Army[],
    combat: CombatState
): Army[] => {
    return armies.filter(a => {
        const matchesFaction = a.faction === faction;
        if (!matchesFaction) return false;

        if (combat.locationId) {
            return a.locationType === 'LOCATION' && a.locationId === combat.locationId;
        }
        if (combat.roadId && combat.stageIndex !== undefined) {
            return a.locationType === 'ROAD' && a.roadId === combat.roadId && a.stageIndex === combat.stageIndex;
        }
        return false;
    });
};

/**
 * Create a retreat position calculator bound to current state
 */
export const calculateRetreatPosition = (
    army: Army,
    roads: Road[],
    locations: Location[]
): Partial<Army> => {
    return getRetreatPosition(army, roads, locations);
};

/**
 * Create an army positioned at the combat location (for retreat calculation)
 * The army's stored locationId may be stale, so we use combat position
 */
export const getArmyAtCombatPosition = (
    army: Army,
    combat: CombatState
): Army => {
    return {
        ...army,
        locationType: combat.locationId ? 'LOCATION' : 'ROAD',
        locationId: combat.locationId || null,
        roadId: combat.roadId || null,
        stageIndex: combat.stageIndex ?? army.stageIndex
    };
};

/**
 * Get fallback retreat position if calculated position is invalid
 */
export const getFallbackRetreatPosition = (
    army: Army,
    combat: CombatState
): Partial<Army> => {
    return {
        locationType: 'LOCATION',
        locationId: army.originLocationId || army.tripOriginId || combat.locationId,
        roadId: null,
        stageIndex: 0
    };
};

/**
 * Check if a retreat position is valid (has location data)
 */
export const isValidRetreatPosition = (retreatPos: Partial<Army>): boolean => {
    return !!(retreatPos.locationType || retreatPos.locationId || retreatPos.roadId);
};
