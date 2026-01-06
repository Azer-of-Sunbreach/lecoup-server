/**
 * Resentment Tax Events - Immediate resentment effects from tax changes
 * 
 * Handles immediate resentment changes when tax levels are modified:
 * - Personal taxes: ±15 per level change
 * - Trade taxes: ±5 per level change
 * - Food collection: ±20 per level change
 */

import { Location, ManagementLevel, FactionId } from '../../../types';
import { modifyResentment, initializeResentment } from './resentment';

// Constants for resentment changes per level
const PERSONAL_TAX_CHANGE_DELTA = 15;
const TRADE_TAX_CHANGE_DELTA = 5;
const FOOD_COLLECTION_CHANGE_DELTA = 20;

// Mapping of levels to numeric values for delta calculation
const LEVEL_VALUES: Record<ManagementLevel, number> = {
    'VERY_LOW': 0,
    'LOW': 1,
    'NORMAL': 2,
    'HIGH': 3,
    'VERY_HIGH': 4
};

export type TaxType = 'PERSONAL' | 'TRADE' | 'FOOD_COLLECTION';

/**
 * Apply resentment changes resulting from a change in tax/management level
 * This should be called immediately when the tax level is changed in the UI/Action
 */
export function applyTaxChangeResentment(
    location: Location,
    oldLevel: ManagementLevel | undefined,
    newLevel: ManagementLevel,
    taxType: TaxType
): Location {
    // If no change or old level undefined (initialization), do nothing
    if (oldLevel === undefined || oldLevel === newLevel) {
        return location;
    }

    // Skip neutral locations
    if (location.faction === FactionId.NEUTRAL) {
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
    let result = initializeResentment(location);
    result = modifyResentment(result, location.faction, totalDelta);

    return result;
}
