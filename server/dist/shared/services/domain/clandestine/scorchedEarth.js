"use strict";
/**
 * scorchedEarth.ts - Domain service for SCORCHED_EARTH character trait
 *
 * Leaders with this trait automatically execute burn and insurrection actions
 * when operating as clandestine agents in enemy territory.
 * These actions cannot be disabled by the player.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasScorchedEarth = hasScorchedEarth;
exports.getScorchedEarthActions = getScorchedEarthActions;
exports.isActionForcedByScorchedEarth = isActionForcedByScorchedEarth;
exports.getScorchedEarthCostPerTurn = getScorchedEarthCostPerTurn;
const clandestineTypes_1 = require("../../../types/clandestineTypes");
/**
 * Check if a character has the SCORCHED_EARTH trait
 */
function hasScorchedEarth(character) {
    return character.stats.traits?.includes('SCORCHED_EARTH') ?? false;
}
/**
 * Get the clandestine actions forced by SCORCHED_EARTH based on location type
 * - City: START_URBAN_FIRE + INCITE_NEUTRAL_INSURRECTIONS
 * - Rural: BURN_CROP_FIELDS + INCITE_NEUTRAL_INSURRECTIONS
 */
function getScorchedEarthActions(locationType) {
    if (locationType === 'CITY') {
        return [
            clandestineTypes_1.ClandestineActionId.START_URBAN_FIRE,
            clandestineTypes_1.ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS
        ];
    }
    else {
        // Rural area
        return [
            clandestineTypes_1.ClandestineActionId.BURN_CROP_FIELDS,
            clandestineTypes_1.ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS
        ];
    }
}
/**
 * Check if a specific action is forced by SCORCHED_EARTH trait
 */
function isActionForcedByScorchedEarth(character, actionId, locationType) {
    if (!hasScorchedEarth(character)) {
        return false;
    }
    const forcedActions = getScorchedEarthActions(locationType);
    return forcedActions.includes(actionId);
}
/**
 * Calculate the total cost per turn for scorched earth actions
 * Used to check if leader has enough budget
 */
function getScorchedEarthCostPerTurn(locationType) {
    // Based on CLANDESTINE_ACTION_COSTS:
    // START_URBAN_FIRE: 25, BURN_CROP_FIELDS: 25
    // INCITE_NEUTRAL_INSURRECTIONS: 50
    return 25 + 50; // 75 gold per turn
}
