"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processDistributePamphlets = processDistributePamphlets;
exports.shouldDisableDistributePamphlets = shouldDisableDistributePamphlets;
const types_1 = require("../../../types");
const leaderTypes_1 = require("../../../types/leaderTypes");
/**
 * Process the effects of distributing pamphlets.
 *
 * @param leader The undercover leader performing the action
 * @param location The location where the action takes place
 * @param turn Current game turn
 */
function processDistributePamphlets(leader, location, turn) {
    const controllerFaction = location.faction;
    // Cannot increase resentment against Neutral (mechanic not supported)
    if (controllerFaction === types_1.FactionId.NEUTRAL) {
        return { location, log: null };
    }
    // 1. Calculate Resentment Increase
    // Amount = 2 * Clandestine Ops Level (doubled for balance)
    const opsLevel = leader.stats.clandestineOps || leaderTypes_1.LeaderStatLevel.INEPT;
    const increaseAmount = 2 * opsLevel;
    // Apply resentment increase
    let updatedLocation = { ...location };
    // Initialize resentment object if missing
    if (!updatedLocation.resentment) {
        updatedLocation.resentment = {
            [types_1.FactionId.NOBLES]: 0,
            [types_1.FactionId.CONSPIRATORS]: 0,
            [types_1.FactionId.REPUBLICANS]: 0
        };
    }
    const factionKey = controllerFaction;
    // Check if valid faction key
    if (factionKey in updatedLocation.resentment) {
        const currentResentment = updatedLocation.resentment[factionKey] || 0;
        const newResentment = Math.min(100, currentResentment + increaseAmount);
        updatedLocation.resentment = {
            ...updatedLocation.resentment,
            [factionKey]: newResentment
        };
    }
    // 2. Check for Warning Log (25% chance)
    let log = null;
    if (Math.random() < 0.25) {
        log = {
            id: `pamphlets-warn-${turn}-${location.id}`,
            // Using LEADER type as it relates to clandestine actions (closest fit)
            type: types_1.LogType.LEADER,
            message: `Something is steering the people’s mind against us in ${location.name}…`,
            turn,
            visibleToFactions: [controllerFaction],
            baseSeverity: types_1.LogSeverity.WARNING,
            highlightTarget: {
                type: 'LOCATION',
                id: location.id
            }
        };
    }
    return {
        location: updatedLocation,
        log
    };
}
/**
 * Check if the action should be auto-disabled.
 * Conditions:
 * 1. Resentment against controller is 100
 * (Budget check handled by caller)
 */
function shouldDisableDistributePamphlets(location) {
    const controllerFaction = location.faction;
    if (controllerFaction === types_1.FactionId.NEUTRAL)
        return true; // Disable if neutral context
    if (!location.resentment)
        return false;
    const factionKey = controllerFaction;
    if (factionKey in location.resentment) {
        return (location.resentment[factionKey] || 0) >= 100;
    }
    return false;
}
