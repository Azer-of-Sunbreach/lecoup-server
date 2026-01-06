"use strict";
// Combat Helpers - Shared utility functions for combat resolution
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidRetreatPosition = exports.getFallbackRetreatPosition = exports.getArmyAtCombatPosition = exports.calculateRetreatPosition = exports.getArmiesAtCombatLocation = exports.getLocationName = void 0;
const retreatLogic_1 = require("./retreatLogic");
/**
 * Get the name of the combat location for logging purposes
 */
const getLocationName = (combat, locations, roads) => {
    if (combat.locationId) {
        return locations.find(l => l.id === combat.locationId)?.name || 'Unknown Location';
    }
    if (combat.roadId && combat.stageIndex !== undefined) {
        const road = roads.find(r => r.id === combat.roadId);
        return road?.stages[combat.stageIndex]?.name || 'Road Stage';
    }
    return 'Unknown Location';
};
exports.getLocationName = getLocationName;
/**
 * Get all armies of a faction at the combat location
 */
const getArmiesAtCombatLocation = (faction, armies, combat) => {
    return armies.filter(a => {
        const matchesFaction = a.faction === faction;
        if (!matchesFaction)
            return false;
        if (combat.locationId) {
            return a.locationType === 'LOCATION' && a.locationId === combat.locationId;
        }
        if (combat.roadId && combat.stageIndex !== undefined) {
            return a.locationType === 'ROAD' && a.roadId === combat.roadId && a.stageIndex === combat.stageIndex;
        }
        return false;
    });
};
exports.getArmiesAtCombatLocation = getArmiesAtCombatLocation;
/**
 * Create a retreat position calculator bound to current state
 */
const calculateRetreatPosition = (army, roads, locations) => {
    return (0, retreatLogic_1.getRetreatPosition)(army, roads, locations);
};
exports.calculateRetreatPosition = calculateRetreatPosition;
/**
 * Create an army positioned at the combat location (for retreat calculation)
 * The army's stored locationId may be stale, so we use combat position
 */
const getArmyAtCombatPosition = (army, combat) => {
    return {
        ...army,
        locationType: combat.locationId ? 'LOCATION' : 'ROAD',
        locationId: combat.locationId || null,
        roadId: combat.roadId || null,
        stageIndex: combat.stageIndex ?? army.stageIndex
    };
};
exports.getArmyAtCombatPosition = getArmyAtCombatPosition;
/**
 * Get fallback retreat position if calculated position is invalid
 */
const getFallbackRetreatPosition = (army, combat) => {
    return {
        locationType: 'LOCATION',
        locationId: army.originLocationId || army.tripOriginId || combat.locationId,
        roadId: null,
        stageIndex: 0
    };
};
exports.getFallbackRetreatPosition = getFallbackRetreatPosition;
/**
 * Check if a retreat position is valid (has location data)
 */
const isValidRetreatPosition = (retreatPos) => {
    return !!(retreatPos.locationType || retreatPos.locationId || retreatPos.roadId);
};
exports.isValidRetreatPosition = isValidRetreatPosition;
