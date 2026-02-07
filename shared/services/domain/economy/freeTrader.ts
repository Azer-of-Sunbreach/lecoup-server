/**
 * Free Trader Domain Service
 * 
 * Implements the FREE_TRADER character trait logic.
 * Each FREE_TRADER leader in a region lowers the maximum tax and food collection levels by one.
 * 
 * Pattern: Reactive/polling approach (same as MANAGER/SMUGGLER)
 * - Effects are computed at calculation time by querying current character state
 * - No event-driven triggers on leader movement needed
 */

import { Location, Character, FactionId, ManagementLevel, CharacterStatus } from '../../../types';
import { CharacterTrait } from '../../../types/leaderTypes';
import {
    applyTaxChangeResentment,
    LEVEL_VALUES
} from '../politics/resentmentTaxEvents';

// Stability change deltas (match UI manual adjustment values)
const PERSONAL_TAX_STABILITY_DELTA = 30; // 30 per level (UI mismatch with resentment's 15)
const TRADE_TAX_STABILITY_DELTA = 5;
const FOOD_COLLECTION_STABILITY_DELTA = 20;

// Management level order (from lowest to highest)
const MANAGEMENT_LEVELS: ManagementLevel[] = ['VERY_LOW', 'LOW', 'NORMAL', 'HIGH', 'VERY_HIGH'];

/**
 * Count FREE_TRADER leaders from a given faction present at a location.
 * Mirrors MANAGER/SMUGGLER detection pattern from territorialStats.ts.
 * 
 * Only counts leaders who are:
 * - At the specified location
 * - Of the specified faction
 * - Not DEAD or MOVING (in transit)
 * - Have the FREE_TRADER trait
 */
export function countFreeTradersAtLocation(
    locationId: string,
    faction: FactionId,
    characters: Character[]
): number {
    return characters.filter(c =>
        c.locationId === locationId &&
        c.faction === faction &&
        c.status !== CharacterStatus.DEAD &&
        c.status !== CharacterStatus.MOVING &&
        (c.stats as any).traits?.includes(CharacterTrait.FREE_TRADER)
    ).length;
}

/**
 * Get the maximum ManagementLevel allowed based on FREE_TRADER count.
 * 
 * 0 FREE_TRADERS: VERY_HIGH (index 4)
 * 1 FREE_TRADER: HIGH (index 3)
 * 2 FREE_TRADERS: NORMAL (index 2)
 * 3 FREE_TRADERS: LOW (index 1)
 * 4+ FREE_TRADERS: VERY_LOW (index 0, floor)
 */
export function getMaxManagementLevel(freeTraderCount: number): ManagementLevel {
    const maxIndex = Math.max(0, MANAGEMENT_LEVELS.length - 1 - freeTraderCount);
    return MANAGEMENT_LEVELS[maxIndex];
}

/**
 * Clamp a given level to the max allowed by FREE_TRADER count.
 * If the current level exceeds the cap, returns the capped level.
 * Otherwise, returns the current level unchanged.
 */
export function clampToMaxLevel(
    currentLevel: ManagementLevel,
    freeTraderCount: number
): ManagementLevel {
    const currentIndex = MANAGEMENT_LEVELS.indexOf(currentLevel);
    const maxLevel = getMaxManagementLevel(freeTraderCount);
    const maxIndex = MANAGEMENT_LEVELS.indexOf(maxLevel);

    // If current level exceeds max, clamp it
    if (currentIndex > maxIndex) {
        return maxLevel;
    }

    return currentLevel;
}

/**
 * Get the effective tax level for a location, considering FREE_TRADER caps.
 * This is a convenience function for use in revenue calculations.
 */
export function getEffectiveTaxLevel(
    location: Location,
    characters: Character[]
): ManagementLevel {
    const freeTraderCount = countFreeTradersAtLocation(
        location.id,
        location.faction,
        characters
    );
    const currentLevel = location.taxLevel || 'NORMAL';
    return clampToMaxLevel(currentLevel, freeTraderCount);
}

/**
 * Get the effective trade tax level for a location, considering FREE_TRADER caps.
 */
export function getEffectiveTradeTaxLevel(
    location: Location,
    characters: Character[]
): ManagementLevel {
    const freeTraderCount = countFreeTradersAtLocation(
        location.id,
        location.faction,
        characters
    );
    const currentLevel = location.tradeTaxLevel || 'NORMAL';
    return clampToMaxLevel(currentLevel, freeTraderCount);
}

/**
 * Get the effective food collection level for a location, considering FREE_TRADER caps.
 */
export function getEffectiveFoodCollectionLevel(
    location: Location,
    characters: Character[]
): ManagementLevel {
    const freeTraderCount = countFreeTradersAtLocation(
        location.id,
        location.faction,
        characters
    );
    const currentLevel = location.foodCollectionLevel || 'NORMAL';
    return clampToMaxLevel(currentLevel, freeTraderCount);
}

/**
 * Result of enforcing Free Trader limits
 */
export interface FreeTraderEnforcementResult {
    location: Location;
    modified: boolean;
    modifications: string[]; // Descriptions of what changed (e.g., "Tax Level lowered")
}

/**
 * Enforce Free Trader limits on a location.
 * If current levels exceed the max allowed by present Free Traders, clamp them down.
 * 
 * Used:
 * 1. After movement phase in turn processing (for arriving leaders)
 * 2. After immediate leader move
 */
export function enforceFreeTraderLimits(
    location: Location,
    characters: Character[]
): FreeTraderEnforcementResult {
    const freeTraderCount = countFreeTradersAtLocation(location.id, location.faction, characters);

    // Optimization: If no free traders, no limits to enforce (assuming standard limits are checked elsewhere)
    // Actually, we only care if levels are *lowered* by presence. 
    // If count is 0, max is VERY_HIGH, so we rarely need to clamp unless we support auto-raising (we don't).
    if (freeTraderCount === 0) {
        return { location, modified: false, modifications: [] };
    }

    let modified = false;
    const modifications: string[] = [];
    let newLocation = { ...location };

    // Check Personal Tax (CITY only)
    if (newLocation.type === 'CITY') {
        const currentTax = newLocation.taxLevel || 'NORMAL';
        const clampedTax = clampToMaxLevel(currentTax, freeTraderCount);
        if (currentTax !== clampedTax) {
            // 1. Apply Resentment change
            newLocation = applyTaxChangeResentment(newLocation, currentTax, clampedTax, 'PERSONAL');

            // 2. Apply Stability change (Inverse of resentment change)
            // 2. Apply Stability change (Decoupled from Resentment)
            const diff = LEVEL_VALUES[clampedTax] - LEVEL_VALUES[currentTax];
            // Negative diff (lowering tax) = Positive stability
            // diff is -2. we want +60. -2 * -30 = +60.
            const stabilityChange = diff * -PERSONAL_TAX_STABILITY_DELTA;
            newLocation.stability = Math.min(100, Math.max(0, newLocation.stability + stabilityChange));

            newLocation.taxLevel = clampedTax;
            modified = true;
            modifications.push(`Personal Tax clamped to ${clampedTax}`);
        }

        // Check Trade Tax (CITY only)
        const currentTradeTax = newLocation.tradeTaxLevel || 'NORMAL';
        const clampedTradeTax = clampToMaxLevel(currentTradeTax, freeTraderCount);
        if (currentTradeTax !== clampedTradeTax) {
            // 1. Apply Resentment change
            newLocation = applyTaxChangeResentment(newLocation, currentTradeTax, clampedTradeTax, 'TRADE');

            // 2. Apply Stability change
            // 2. Apply Stability change
            const diff = LEVEL_VALUES[clampedTradeTax] - LEVEL_VALUES[currentTradeTax];
            const stabilityChange = diff * -TRADE_TAX_STABILITY_DELTA;
            newLocation.stability = Math.min(100, Math.max(0, newLocation.stability + stabilityChange));

            newLocation.tradeTaxLevel = clampedTradeTax;
            modified = true;
            modifications.push(`Trade Tax clamped to ${clampedTradeTax}`);
        }
    }

    // Check Food Collection (RURAL only)
    if (newLocation.type === 'RURAL') {
        const currentCollection = newLocation.foodCollectionLevel || 'NORMAL';
        const clampedCollection = clampToMaxLevel(currentCollection, freeTraderCount);
        if (currentCollection !== clampedCollection) {
            // 1. Apply Resentment change
            newLocation = applyTaxChangeResentment(newLocation, currentCollection, clampedCollection, 'FOOD_COLLECTION');

            // 2. Apply Stability change
            // 2. Apply Stability change
            const diff = LEVEL_VALUES[clampedCollection] - LEVEL_VALUES[currentCollection];
            const stabilityChange = diff * -FOOD_COLLECTION_STABILITY_DELTA;
            newLocation.stability = Math.min(100, Math.max(0, newLocation.stability + stabilityChange));

            newLocation.foodCollectionLevel = clampedCollection;
            modified = true;
            modifications.push(`Food Collection clamped to ${clampedCollection}`);
        }
    }

    return {
        location: newLocation,
        modified,
        modifications
    };
}
