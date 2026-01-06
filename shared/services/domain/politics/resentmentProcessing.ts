/**
 * Resentment Processing - Turn-based resentment effects
 * 
 * Handles resentment changes that occur each turn:
 * - Shortage/Famine: Food stock levels cause resentment
 * - Very High taxes: Ongoing resentment from high taxation
 * - Embargo: Grain embargo causes resentment in all Larion locations
 */

import { Location, FactionId } from '../../../types';
import { modifyResentment, hasRecentlyChangedOwner, initializeResentment } from './resentment';

// Resentment delta constants
const SHORTAGE_RESENTMENT = 5;      // 0 < foodStock < 50
const FAMINE_RESENTMENT = 10;       // foodStock === 0
const FAMINE_RURAL_SIEGE_RESENTMENT = 5;  // Rural when different from city controller

const PERSONAL_TAX_VERY_HIGH_PER_TURN = 5;
const TRADE_TAX_VERY_HIGH_PER_TURN = 3;
const FOOD_COLLECTION_VERY_HIGH_PER_TURN = 5;

const EMBARGO_RESENTMENT_PER_TURN = 10;

const SHORTAGE_THRESHOLD = 50;

/**
 * Process shortage and famine resentment for all locations
 * Called once per turn during turn processing
 */
export function processShortageResentment(locations: Location[]): Location[] {
    // Build a map for quick lookup
    const locationMap = new Map(locations.map(loc => [loc.id, loc]));

    return locations.map(location => {
        // Only process cities for shortage/famine
        if (location.type !== 'CITY') {
            return location;
        }

        // Skip if location recently changed owner
        if (hasRecentlyChangedOwner(location)) {
            return location;
        }

        // Skip neutral locations
        if (location.faction === FactionId.NEUTRAL) {
            return location;
        }

        const foodStock = location.foodStock;

        // No shortage
        if (foodStock >= SHORTAGE_THRESHOLD) {
            return location;
        }

        // Determine resentment amount based on severity
        const isFamine = foodStock === 0;
        const baseResentment = isFamine ? FAMINE_RESENTMENT : SHORTAGE_RESENTMENT;

        // Initialize resentment if needed
        let result = initializeResentment(location);

        // Add resentment against city controller
        result = modifyResentment(result, location.faction, baseResentment);

        // Find linked rural area
        const ruralArea = location.linkedLocationId
            ? locationMap.get(location.linkedLocationId)
            : undefined;

        // Handle siege situation: different controller for rural area
        if (ruralArea && ruralArea.faction !== location.faction && ruralArea.faction !== FactionId.NEUTRAL) {
            // Resentment against rural controller in the city
            result = modifyResentment(result, ruralArea.faction, baseResentment);
        }

        return result;
    }).map((location, index, processedLocations) => {
        // Second pass: update rural areas based on city status
        if (location.type !== 'RURAL') {
            return location;
        }

        // Find the linked city
        const linkedCity = processedLocations.find(loc =>
            loc.type === 'CITY' && loc.linkedLocationId === location.id
        );

        if (!linkedCity) {
            return location;
        }

        // Skip if rural recently changed owner
        if (hasRecentlyChangedOwner(location)) {
            return location;
        }

        // Skip neutral rural areas
        if (location.faction === FactionId.NEUTRAL) {
            return location;
        }

        const foodStock = linkedCity.foodStock;

        // No shortage in city
        if (foodStock >= SHORTAGE_THRESHOLD) {
            return location;
        }

        const isFamine = foodStock === 0;

        // Same controller: full resentment
        if (location.faction === linkedCity.faction) {
            const resentmentDelta = isFamine ? FAMINE_RESENTMENT : SHORTAGE_RESENTMENT;
            let result = initializeResentment(location);
            result = modifyResentment(result, location.faction, resentmentDelta);
            return result;
        }

        // Different controller during famine: rural gets lesser resentment
        if (isFamine) {
            let result = initializeResentment(location);
            result = modifyResentment(result, location.faction, FAMINE_RURAL_SIEGE_RESENTMENT);
            return result;
        }

        return location;
    });
}

/**
 * Process ongoing resentment from VERY_HIGH tax levels
 * Called once per turn during turn processing
 */
export function processHighTaxResentment(locations: Location[]): Location[] {
    return locations.map(location => {
        // Skip neutral locations
        if (location.faction === FactionId.NEUTRAL) {
            return location;
        }

        let result = location;
        let hasChanges = false;

        // Personal taxes VERY_HIGH in cities
        if (location.type === 'CITY' && location.taxLevel === 'VERY_HIGH') {
            result = initializeResentment(result);
            result = modifyResentment(result, location.faction, PERSONAL_TAX_VERY_HIGH_PER_TURN);
            hasChanges = true;
        }

        // Trade taxes VERY_HIGH in cities
        if (location.type === 'CITY' && location.tradeTaxLevel === 'VERY_HIGH') {
            result = hasChanges ? result : initializeResentment(result);
            result = modifyResentment(result, location.faction, TRADE_TAX_VERY_HIGH_PER_TURN);
            hasChanges = true;
        }

        // Food collection VERY_HIGH in rural areas
        if (location.type === 'RURAL' && location.foodCollectionLevel === 'VERY_HIGH') {
            result = initializeResentment(result);
            result = modifyResentment(result, location.faction, FOOD_COLLECTION_VERY_HIGH_PER_TURN);
        }

        return result;
    });
}

/**
 * Process embargo resentment for all Larion locations
 * Called once per turn during turn processing
 * 
 * @param locations All game locations
 * @param isEmbargoActive Whether grain embargo is currently active
 * @param embargoFactionId Faction that activated the embargo (controls Windward)
 */
export function processEmbargoResentment(
    locations: Location[],
    isEmbargoActive: boolean,
    embargoFactionId: FactionId | null
): Location[] {
    // No embargo or no faction responsible
    if (!isEmbargoActive || !embargoFactionId || embargoFactionId === FactionId.NEUTRAL) {
        return locations;
    }

    return locations.map(location => {
        // Skip neutral locations
        if (location.faction === FactionId.NEUTRAL) {
            return location;
        }

        // All Larion locations get resentment against embargo faction
        let result = initializeResentment(location);
        result = modifyResentment(result, embargoFactionId, EMBARGO_RESENTMENT_PER_TURN);

        return result;
    });
}

/**
 * Update previousFaction for all locations at end of turn
 * This captures the current faction before any changes next turn
 */
export function updatePreviousFaction(locations: Location[]): Location[] {
    return locations.map(location => ({
        ...location,
        previousFaction: location.faction,
    }));
}
