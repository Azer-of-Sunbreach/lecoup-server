/**
 * Negotiation Utilities
 * Helper functions for calculating negotiation success and valid food sources
 */

import { Location, FactionId, LocationType } from '../../../types';
import { Road } from '../../../types';
import { getNavalTravelTimeForMap, isPort, MapId } from '../../../data/ports';

/**
 * Calculate the success chance for a negotiation attempt (0-100%)
 * 
 * Formula: min(stability, 50) + (gold/5) + food - (resentment/5)
 * Result clamped to 0-100
 */
export function calculateNegotiationSuccessChance(
    stability: number,
    goldOffer: number,
    foodOffer: number,
    resentment: number
): number {
    const clampedStability = Math.min(stability, 50);
    const score = clampedStability + (goldOffer / 5) + foodOffer - (resentment / 5);
    return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Check if a location is coastal (for determining maritime food source eligibility)
 * - For rural areas: check isCoastal directly
 * - For cities: check if linked rural area is coastal
 */
export function isLocationCoastal(location: Location, allLocations: Location[]): boolean {
    if (location.type === LocationType.RURAL) {
        return location.isCoastal === true;
    }
    // City: check linked rural area
    if (location.linkedLocationId) {
        const linkedRural = allLocations.find(l => l.id === location.linkedLocationId);
        return linkedRural?.isCoastal === true;
    }
    return false;
}

/**
 * Food source with amount for multi-source negotiation
 */
export interface FoodSourceEntry {
    cityId: string;
    cityName: string;
    maxStock: number;
    amount: number;
    isPort: boolean;
    travelTime?: number; // Only for maritime sources
}

/**
 * Get valid food sources for negotiation with a target neutral zone
 * 
 * Land sources: Cities in rural areas directly adjacent (by road) to the target zone
 * Maritime sources: Ports controlled by player within 3 turns travel (if target is coastal)
 */
export function getValidFoodSourcesForNegotiation(
    targetLocation: Location,
    allLocations: Location[],
    roads: Road[],
    playerFaction: FactionId,
    mapId?: MapId
): { cityId: string; cityName: string; maxStock: number; isPort: boolean; travelTime?: number }[] {
    // Auto-detect map ID if not provided, based on presence of key cities
    // This fixes issues where travel times default to 2 because the correct map matrix isn't used
    if (!mapId) {
        const hasCathair = allLocations.some(l => l.id === 'cathair');
        const hasAntrustion = allLocations.some(l => l.id === 'antrustion');

        if (hasAntrustion) {
            mapId = 'larion_large';
        } else if (hasCathair) {
            mapId = 'larion_alternate';
        } else {
            mapId = 'larion_alternate'; // Default to larion_alternate
        }
    }

    const sources: { cityId: string; cityName: string; maxStock: number; isPort: boolean; travelTime?: number }[] = [];
    const addedCities = new Set<string>();

    // Helper to add a city source
    const addSource = (city: Location, isPortSource: boolean, travelTime?: number) => {
        if (!addedCities.has(city.id) && city.faction === playerFaction && city.type === LocationType.CITY) {
            addedCities.add(city.id);
            sources.push({
                cityId: city.id,
                cityName: city.name,
                maxStock: city.foodStock,
                isPort: isPortSource,
                travelTime
            });
        }
    };

    // --- LAND SOURCES ---
    // Find roads connected to target location
    const connectedRoads = roads.filter(r => r.from === targetLocation.id || r.to === targetLocation.id);

    // Get neighbor location IDs
    const neighborIds = connectedRoads.map(r => r.from === targetLocation.id ? r.to : r.from);

    // For each neighbor, find if it's a rural area with a linked city we control
    for (const neighborId of neighborIds) {
        const neighborLoc = allLocations.find(l => l.id === neighborId);
        if (!neighborLoc) continue;

        if (neighborLoc.type === LocationType.RURAL) {
            // Find the city linked to this rural area
            const linkedCity = allLocations.find(l =>
                l.type === LocationType.CITY && l.linkedLocationId === neighborLoc.id
            );
            if (linkedCity && linkedCity.faction === playerFaction) {
                addSource(linkedCity, false);
            }
        } else if (neighborLoc.type === LocationType.CITY && neighborLoc.faction === playerFaction) {
            // Direct city neighbor (rare but possible)
            addSource(neighborLoc, false);
        }
    }

    // If target is a city, also check its linked rural area's neighbors
    if (targetLocation.type === LocationType.CITY && targetLocation.linkedLocationId) {
        const linkedRural = allLocations.find(l => l.id === targetLocation.linkedLocationId);
        if (linkedRural) {
            const ruralRoads = roads.filter(r => r.from === linkedRural.id || r.to === linkedRural.id);
            const ruralNeighborIds = ruralRoads.map(r => r.from === linkedRural.id ? r.to : r.from);

            for (const neighborId of ruralNeighborIds) {
                const neighborLoc = allLocations.find(l => l.id === neighborId);
                if (!neighborLoc || neighborLoc.type !== LocationType.RURAL) continue;

                const linkedCity = allLocations.find(l =>
                    l.type === LocationType.CITY && l.linkedLocationId === neighborLoc.id
                );
                if (linkedCity && linkedCity.faction === playerFaction) {
                    addSource(linkedCity, false);
                }
            }
        }
    }

    // --- MARITIME SOURCES ---
    // Only if target is coastal (or target city's linked rural is coastal)
    const targetIsCoastal = isLocationCoastal(targetLocation, allLocations);

    if (targetIsCoastal) {
        // Find target port ID (for cities, it's the city itself if port; for rurals, it's the linked city)
        let targetPortId: string | null = null;

        if (targetLocation.type === LocationType.CITY && isPort(targetLocation.id)) {
            targetPortId = targetLocation.id;
        } else if (targetLocation.type === LocationType.RURAL) {
            // Find linked city that is a port
            const linkedCity = allLocations.find(l =>
                l.type === LocationType.CITY && l.linkedLocationId === targetLocation.id
            );
            if (linkedCity && isPort(linkedCity.id)) {
                targetPortId = linkedCity.id;
            }
        }

        // If we have a target port, find player's ports within 3 turns
        if (targetPortId) {
            const playerCities = allLocations.filter(l =>
                l.type === LocationType.CITY &&
                l.faction === playerFaction &&
                isPort(l.id) &&
                l.id !== targetPortId // Don't include target itself
            );

            for (const city of playerCities) {
                const travelTime = getNavalTravelTimeForMap(mapId, city.id, targetPortId);
                if (travelTime <= 3) {
                    addSource(city, true, travelTime);
                }
            }
        }
    }

    return sources;
}
