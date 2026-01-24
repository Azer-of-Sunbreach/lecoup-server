"use strict";
/**
 * Negotiation Utilities
 * Helper functions for calculating negotiation success and valid food sources
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateNegotiationSuccessChance = calculateNegotiationSuccessChance;
exports.isLocationCoastal = isLocationCoastal;
exports.getValidFoodSourcesForNegotiation = getValidFoodSourcesForNegotiation;
const types_1 = require("../../../types");
const ports_1 = require("../../../data/ports");
/**
 * Calculate the success chance for a negotiation attempt (0-100%)
 *
 * Formula: min(stability, 50) + (gold/5) + food - (resentment/5)
 * Result clamped to 0-100
 */
function calculateNegotiationSuccessChance(stability, goldOffer, foodOffer, resentment) {
    const clampedStability = Math.min(stability, 50);
    const score = clampedStability + (goldOffer / 5) + foodOffer - (resentment / 5);
    return Math.max(0, Math.min(100, Math.round(score)));
}
/**
 * Check if a location is coastal (for determining maritime food source eligibility)
 * - For rural areas: check isCoastal directly
 * - For cities: check if linked rural area is coastal
 */
function isLocationCoastal(location, allLocations) {
    if (location.type === types_1.LocationType.RURAL) {
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
 * Get valid food sources for negotiation with a target neutral zone
 *
 * Land sources: Cities in rural areas directly adjacent (by road) to the target zone
 * Maritime sources: Ports controlled by player within 3 turns travel (if target is coastal)
 */
function getValidFoodSourcesForNegotiation(targetLocation, allLocations, roads, playerFaction, mapId) {
    // Auto-detect map ID if not provided, based on presence of key cities
    // This fixes issues where travel times default to 2 because the correct map matrix isn't used
    if (!mapId) {
        const hasCathair = allLocations.some(l => l.id === 'cathair');
        const hasAntrustion = allLocations.some(l => l.id === 'antrustion');
        if (hasAntrustion) {
            mapId = 'larion_large';
        }
        else if (hasCathair) {
            mapId = 'larion_alternate';
        }
        else {
            mapId = 'larion_alternate'; // Default to larion_alternate
        }
    }
    const sources = [];
    const addedCities = new Set();
    // Helper to add a city source
    const addSource = (city, isPortSource, travelTime) => {
        if (!addedCities.has(city.id) && city.faction === playerFaction && city.type === types_1.LocationType.CITY) {
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
        if (!neighborLoc)
            continue;
        if (neighborLoc.type === types_1.LocationType.RURAL) {
            // Find the city linked to this rural area
            const linkedCity = allLocations.find(l => l.type === types_1.LocationType.CITY && l.linkedLocationId === neighborLoc.id);
            if (linkedCity && linkedCity.faction === playerFaction) {
                addSource(linkedCity, false);
            }
        }
        else if (neighborLoc.type === types_1.LocationType.CITY && neighborLoc.faction === playerFaction) {
            // Direct city neighbor (rare but possible)
            addSource(neighborLoc, false);
        }
    }
    // If target is a city, also check its linked rural area's neighbors
    if (targetLocation.type === types_1.LocationType.CITY && targetLocation.linkedLocationId) {
        const linkedRural = allLocations.find(l => l.id === targetLocation.linkedLocationId);
        if (linkedRural) {
            const ruralRoads = roads.filter(r => r.from === linkedRural.id || r.to === linkedRural.id);
            const ruralNeighborIds = ruralRoads.map(r => r.from === linkedRural.id ? r.to : r.from);
            for (const neighborId of ruralNeighborIds) {
                const neighborLoc = allLocations.find(l => l.id === neighborId);
                if (!neighborLoc || neighborLoc.type !== types_1.LocationType.RURAL)
                    continue;
                const linkedCity = allLocations.find(l => l.type === types_1.LocationType.CITY && l.linkedLocationId === neighborLoc.id);
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
        let targetPortId = null;
        if (targetLocation.type === types_1.LocationType.CITY && (0, ports_1.isPort)(targetLocation.id)) {
            targetPortId = targetLocation.id;
        }
        else if (targetLocation.type === types_1.LocationType.RURAL) {
            // Find linked city that is a port
            const linkedCity = allLocations.find(l => l.type === types_1.LocationType.CITY && l.linkedLocationId === targetLocation.id);
            if (linkedCity && (0, ports_1.isPort)(linkedCity.id)) {
                targetPortId = linkedCity.id;
            }
        }
        // If we have a target port, find player's ports within 3 turns
        if (targetPortId) {
            const playerCities = allLocations.filter(l => l.type === types_1.LocationType.CITY &&
                l.faction === playerFaction &&
                (0, ports_1.isPort)(l.id) &&
                l.id !== targetPortId // Don't include target itself
            );
            for (const city of playerCities) {
                const travelTime = (0, ports_1.getNavalTravelTimeForMap)(mapId, city.id, targetPortId);
                if (travelTime <= 3) {
                    addSource(city, true, travelTime);
                }
            }
        }
    }
    return sources;
}
