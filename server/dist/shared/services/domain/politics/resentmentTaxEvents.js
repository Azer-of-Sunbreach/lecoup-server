"use strict";
/**
 * Resentment Tax Events - Immediate resentment effects from tax changes
 *
 * Handles immediate resentment changes when tax levels are modified:
 * - Personal taxes: ±15 per level change
 * - Trade taxes: ±5 per level change
 * - Food collection: ±20 per level change
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyTaxChangeResentment = applyTaxChangeResentment;
const types_1 = require("../../../types");
const resentment_1 = require("./resentment");
// Constants for resentment changes per level
const PERSONAL_TAX_CHANGE_DELTA = 15;
const TRADE_TAX_CHANGE_DELTA = 5;
const FOOD_COLLECTION_CHANGE_DELTA = 20;
// Mapping of levels to numeric values for delta calculation
const LEVEL_VALUES = {
    'VERY_LOW': 0,
    'LOW': 1,
    'NORMAL': 2,
    'HIGH': 3,
    'VERY_HIGH': 4
};
/**
 * Apply resentment changes resulting from a change in tax/management level
 * This should be called immediately when the tax level is changed in the UI/Action
 */
function applyTaxChangeResentment(location, oldLevel, newLevel, taxType) {
    // If no change or old level undefined (initialization), do nothing
    if (oldLevel === undefined || oldLevel === newLevel) {
        return location;
    }
    // Skip neutral locations
    if (location.faction === types_1.FactionId.NEUTRAL) {
        return location;
    }
    const oldVal = LEVEL_VALUES[oldLevel];
    const newVal = LEVEL_VALUES[newLevel];
    // Calculate level difference (positive if increasing tax, negative if decreasing)
    const levelsDiff = newVal - oldVal;
    // Calculate base resentment change
    let modifierPerLevel = 0;
    switch (taxType) {
        case 'PERSONAL':
            modifierPerLevel = PERSONAL_TAX_CHANGE_DELTA;
            break;
        case 'TRADE':
            modifierPerLevel = TRADE_TAX_CHANGE_DELTA;
            break;
        case 'FOOD_COLLECTION':
            modifierPerLevel = FOOD_COLLECTION_CHANGE_DELTA;
            break;
    }
    const totalDelta = levelsDiff * modifierPerLevel;
    // Apply change
    let result = (0, resentment_1.initializeResentment)(location);
    result = (0, resentment_1.modifyResentment)(result, location.faction, totalDelta);
    return result;
}
