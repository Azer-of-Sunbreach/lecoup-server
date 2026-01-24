"use strict";
/**
 * Leader Pathfinding - Calculate travel time for leaders using hybrid routes
 *
 * Adapts convoy routing logic for leader travel. Supports:
 * - Direct naval routes (port-to-port)
 * - Land routes (via roads)
 * - Hybrid routes (naval + land combination)
 * - LOCAL roads (city-rural) are instant (0 turns)
 * - Undercover mission processing with infiltration risk
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateLeaderTravelTime = calculateLeaderTravelTime;
exports.applyLeaderTravelSpeedBonus = applyLeaderTravelSpeedBonus;
exports.getAvailableLeadersForMission = getAvailableLeadersForMission;
exports.processUndercoverMissionTravel = processUndercoverMissionTravel;
const types_1 = require("../../../types");
const gameConstants_1 = require("../../../data/gameConstants");
const ports_1 = require("../../../data/ports");
const infiltrationRisk_1 = require("./infiltrationRisk");
const logFactory_1 = require("../../logs/logFactory");
const types_2 = require("../../../types");
const clandestineAlertService_1 = require("../clandestine/clandestineAlertService");
// ============================================================================
// MAIN FUNCTION
// ============================================================================
/**
 * Calculate travel time for a leader from one location to another.
 * Uses hybrid routing: compares naval, land, and combination routes.
 *
 * @param fromLocationId - Starting location ID
 * @param toLocationId - Destination location ID
 * @param locations - All game locations
 * @param roads - All game roads
 * @returns Total travel time in turns
 */
function calculateLeaderTravelTime(fromLocationId, toLocationId, locations, roads) {
    if (fromLocationId === toLocationId)
        return 0;
    const fromLoc = locations.find(l => l.id === fromLocationId);
    const toLoc = locations.find(l => l.id === toLocationId);
    if (!fromLoc || !toLoc)
        return 999;
    // Check for linked city-rural (LOCAL road = instant)
    if (fromLoc.linkedLocationId === toLocationId || toLoc.linkedLocationId === fromLocationId) {
        return 0;
    }
    // Get the rural/city pair for each location
    const fromRuralId = fromLoc.type === types_1.LocationType.CITY ? fromLoc.linkedLocationId : fromLoc.id;
    const toRuralId = toLoc.type === types_1.LocationType.CITY ? toLoc.linkedLocationId : toLoc.id;
    const fromCityId = fromLoc.type === types_1.LocationType.CITY ? fromLoc.id : fromLoc.linkedLocationId;
    const toCityId = toLoc.type === types_1.LocationType.CITY ? toLoc.id : toLoc.linkedLocationId;
    const isFromPort = !!fromCityId && (0, ports_1.isPort)(fromCityId);
    const isToPort = !!toCityId && (0, ports_1.isPort)(toCityId);
    let bestTime = Infinity;
    // Option 1: Direct naval (both are ports or their cities are ports)
    if (isFromPort && isToPort && fromCityId && toCityId) {
        const navalTime = (0, gameConstants_1.getNavalTravelTime)(fromCityId, toCityId);
        if (navalTime < bestTime) {
            bestTime = navalTime;
        }
    }
    // Option 2: Pure land route
    if (fromRuralId && toRuralId) {
        const landPath = findLandPath(fromRuralId, toRuralId, roads);
        if (landPath) {
            const landTime = calculateLandTravelTime(landPath, roads);
            if (landTime < bestTime) {
                bestTime = landTime;
            }
        }
    }
    // Option 3: Hybrid - naval to intermediate port, then land
    if (isFromPort && !isToPort && fromCityId && toRuralId) {
        for (const transitPortId of ports_1.ALL_PORTS) {
            if (transitPortId === fromCityId)
                continue;
            const transitCity = locations.find(l => l.id === transitPortId);
            if (!transitCity)
                continue;
            const transitRuralId = transitCity.linkedLocationId;
            if (!transitRuralId)
                continue;
            const navalTime = (0, gameConstants_1.getNavalTravelTime)(fromCityId, transitPortId);
            const landPath = findLandPath(transitRuralId, toRuralId, roads);
            if (landPath) {
                const landTime = calculateLandTravelTime(landPath, roads);
                const totalTime = navalTime + landTime;
                if (totalTime < bestTime) {
                    bestTime = totalTime;
                }
            }
        }
    }
    // Option 4: Hybrid - land to intermediate port, then naval
    if (!isFromPort && isToPort && fromRuralId && toCityId) {
        for (const transitPortId of ports_1.ALL_PORTS) {
            if (transitPortId === toCityId)
                continue;
            const transitCity = locations.find(l => l.id === transitPortId);
            if (!transitCity)
                continue;
            const transitRuralId = transitCity.linkedLocationId;
            if (!transitRuralId)
                continue;
            const landPath = findLandPath(fromRuralId, transitRuralId, roads);
            if (landPath) {
                const landTime = calculateLandTravelTime(landPath, roads);
                const navalTime = (0, gameConstants_1.getNavalTravelTime)(transitPortId, toCityId);
                const totalTime = landTime + navalTime;
                if (totalTime < bestTime) {
                    bestTime = totalTime;
                }
            }
        }
    }
    // Option 5: Double hybrid - land to port A, naval to port B, land to destination
    if (!isFromPort && !isToPort && fromRuralId && toRuralId) {
        for (const startPortId of ports_1.ALL_PORTS) {
            const startPortCity = locations.find(l => l.id === startPortId);
            if (!startPortCity)
                continue;
            const startPortRuralId = startPortCity.linkedLocationId;
            if (!startPortRuralId)
                continue;
            const landToPort = findLandPath(fromRuralId, startPortRuralId, roads);
            if (!landToPort)
                continue;
            const landToPortTime = calculateLandTravelTime(landToPort, roads);
            for (const endPortId of ports_1.ALL_PORTS) {
                if (endPortId === startPortId)
                    continue;
                const endPortCity = locations.find(l => l.id === endPortId);
                if (!endPortCity)
                    continue;
                const endPortRuralId = endPortCity.linkedLocationId;
                if (!endPortRuralId)
                    continue;
                const navalTime = (0, gameConstants_1.getNavalTravelTime)(startPortId, endPortId);
                const landFromPort = findLandPath(endPortRuralId, toRuralId, roads);
                if (landFromPort) {
                    const landFromPortTime = calculateLandTravelTime(landFromPort, roads);
                    const totalTime = landToPortTime + navalTime + landFromPortTime;
                    if (totalTime < bestTime) {
                        bestTime = totalTime;
                    }
                }
            }
        }
    }
    return bestTime === Infinity ? 999 : applyLeaderTravelSpeedBonus(bestTime);
}
/**
 * Apply leader travel speed bonus.
 * Leaders travel faster than armies: trips of 2+ turns are reduced by 1 turn.
 * This does NOT apply when leaders are attached to armies.
 *
 * @param travelTime - Base travel time in turns
 * @returns Adjusted travel time (reduced by 1 if >= 2)
 */
function applyLeaderTravelSpeedBonus(travelTime) {
    return travelTime >= 2 ? travelTime - 1 : travelTime;
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Find a land path between two rural locations using BFS.
 * Leaders can traverse any road (no faction restriction for undercover missions).
 */
function findLandPath(startId, endId, roads) {
    if (startId === endId)
        return [];
    const queue = [{ id: startId, path: [] }];
    const visited = new Set([startId]);
    while (queue.length > 0) {
        const { id, path } = queue.shift();
        const connectedRoads = roads.filter(r => r.from === id || r.to === id);
        for (const road of connectedRoads) {
            const nextId = road.from === id ? road.to : road.from;
            if (visited.has(nextId))
                continue;
            visited.add(nextId);
            const newPath = [...path, road.id];
            if (nextId === endId) {
                return newPath;
            }
            queue.push({ id: nextId, path: newPath });
        }
    }
    return null;
}
/**
 * Calculate land travel time from a path of road IDs.
 * LOCAL roads (0 stages) = instant, other roads = number of stages.
 */
function calculateLandTravelTime(roadPath, roads) {
    let totalTime = 0;
    for (const roadId of roadPath) {
        const road = roads.find(r => r.id === roadId);
        if (road) {
            // LOCAL roads have 0 stages = instant travel
            // Other roads: each stage = 1 turn
            totalTime += road.stages.length;
        }
    }
    return totalTime;
}
/**
 * Get available leaders for undercover missions in a given faction.
 * Leaders must be AVAILABLE or UNDERCOVER status and not attached to an army.
 */
function getAvailableLeadersForMission(characters, faction) {
    return characters.filter(c => c.faction === faction &&
        (c.status === 'AVAILABLE' || c.status === 'UNDERCOVER') &&
        !c.armyId);
}
/**
 * Process undercover mission travel each turn.
 * Should be called during turn processing.
 *
 * - Decrements turnsRemaining for traveling leaders
 * - Moves leader to destination when turnsRemaining reaches 0
 * - Sets status to AVAILABLE when arrived
 * - Calculates infiltration risk and handles detection/elimination
 */
function processUndercoverMissionTravel(characters, locations, armies, turn) {
    const logs = [];
    const notifications = [];
    const infiltrationEvents = [];
    // Map for fast location lookup
    const locationMap = new Map(locations.map(l => [l.id, l]));
    const processedCharacters = characters.map(c => {
        // Only process leaders traveling to undercover missions (status: MOVING with undercoverMission)
        if (c.status !== 'MOVING' || !c.undercoverMission) {
            return c;
        }
        const mission = c.undercoverMission;
        // --- DEPARTURE DETECTION (Hunt Networks) ---
        // Check if leader is departing from a region with Hunt Networks active
        // Only generate log on FIRST turn of travel (when turnsRemaining equals original travel time - we detect this by checking source location)
        // We detect first turn by checking if source location (c.locationId) has Hunt Networks active
        // Note: locationId is the source region until leader arrives
        const sourceLocation = locationMap.get(c.locationId);
        if (sourceLocation &&
            sourceLocation.governorPolicies?.[types_1.GovernorPolicy.HUNT_NETWORKS] &&
            !c.stats.ability.includes('GHOST') &&
            sourceLocation.faction !== c.faction) {
            // Check if we should log departure (only log once per journey)
            // ... (logging logic) ...
            const destination = locationMap.get(mission.destinationId);
            if (destination) {
                logs.push((0, logFactory_1.createLeaderDepartureSpottedLog)(c.name, types_2.FACTION_NAMES[c.faction], sourceLocation.name, sourceLocation.id, destination.name, turn, sourceLocation.faction));
            }
        }
        // START OF TURN CHECK
        // If mission started this turn, do not decrement yet (simulate travel time correctly)
        // BUT allow instant travel (0 turns) to process immediately
        if (mission.turnStarted === turn && mission.turnsRemaining > 0) {
            return c;
        }
        // Decrement travel time
        let currentTurnsRemaining = mission.turnsRemaining;
        if (currentTurnsRemaining > 0) {
            currentTurnsRemaining--;
        }
        if (currentTurnsRemaining > 0) {
            // Still traveling - continue
            return {
                ...c,
                undercoverMission: {
                    ...mission,
                    turnsRemaining: currentTurnsRemaining
                }
            };
        }
        // Arrived (turnsRemaining === 0)
        // Leader arrives at destination
        const destination = locationMap.get(mission.destinationId);
        if (!destination) {
            // Should not happen, but safe fallback
            return {
                ...c,
                locationId: mission.destinationId,
                status: types_1.CharacterStatus.UNDERCOVER, // Arrived in enemy territory
                undercoverMission: undefined
            };
        }
        // --- RISK CALCULATION ---
        // If destination controlled by enemy, calculate risk
        let isSuccess = true;
        let isEliminated = false;
        // Assuming FactionId values are strings, check inequality
        // Neutrals don't detect (risk is 0 anyway, but safe check)
        if (destination.faction !== c.faction && destination.faction !== types_1.FactionId.NEUTRAL) {
            // Find governor in destination region
            const governor = characters.find(char => char.locationId === destination.id &&
                char.faction === destination.faction &&
                char.status === types_1.CharacterStatus.GOVERNING);
            // Check if Hunt Networks policy is active
            const isHuntNetworkActive = destination.governorPolicies?.[types_1.GovernorPolicy.HUNT_NETWORKS] === true;
            // Calculate Risk (includes Hunt Networks modifier if active)
            const risk = (0, infiltrationRisk_1.calculateTotalInfiltrationRisk)(destination, armies, c, governor, isHuntNetworkActive);
            // LOG DEBUG RISK (shows final risk after all modifiers including Hunt Networks)
            logs.push((0, logFactory_1.createInfiltrationRiskDebugLog)(c.name, destination.name, risk, turn, c.faction));
            // Roll risk (0.0 - 1.0)
            const roll = Math.random();
            if (roll < risk) {
                // DETECTED (but NOT eliminated - new system)
                isSuccess = false;
            }
            // NOTE: Elimination logic removed - detection only
        }
        // --- CONSEQUENCES ---
        // Helper for pronouns
        const isFemale = c.name === 'Alia' || c.name === 'Lady Ethell';
        const pronounPossessive = isFemale ? 'her' : 'his';
        const factionName = c.faction;
        if (!isSuccess) {
            // DETECTED - Leader arrives but enemy knows about them
            // 1. Log for defender (Spotted enemy agent)
            logs.push((0, logFactory_1.createInfiltrationDetectedLog)(c.name, factionName, destination.name, destination.id, turn, destination.faction, true, // Owner message
            pronounPossessive));
            // 2. Log for sender (Your agent was spotted)
            logs.push((0, logFactory_1.createInfiltrationDetectedLog)(c.name, factionName, destination.name, destination.id, turn, c.faction, false, // Sender message
            pronounPossessive));
            // Create infiltration event for UI
            const infiltrationEvent = (0, clandestineAlertService_1.createInfiltrationEvent)(c, destination, true, // wasDetected
            turn);
            // Leader arrives as UNDERCOVER but is detected
            return {
                ...c,
                locationId: mission.destinationId,
                status: types_1.CharacterStatus.UNDERCOVER,
                undercoverMission: undefined,
                isDetectedOnArrival: true, // NEW: Track detection for alerts
                pendingAlertEvents: c.pendingAlertEvents
                    ? [...c.pendingAlertEvents, { ...infiltrationEvent, timestamp: Date.now() }]
                    : [{ ...infiltrationEvent, timestamp: Date.now() }],
                // FORCE RESET detection on arrival (Safety net)
                detectionLevel: 0,
                pendingDetectionEffects: undefined
            };
        }
        else {
            // SUCCESS - Undetected infiltration
            // Log for sender only (Destination faction doesn't know)
            if (c.faction !== destination.faction) {
                logs.push((0, logFactory_1.createInfiltrationSuccessLog)(c.name, destination.name, destination.id, turn, c.faction));
            }
            // Create infiltration event for UI
            const infiltrationEvent = (0, clandestineAlertService_1.createInfiltrationEvent)(c, destination, false, // wasDetected
            turn);
            // Leader arrives as UNDERCOVER, undetected
            return {
                ...c,
                locationId: mission.destinationId,
                status: types_1.CharacterStatus.UNDERCOVER,
                undercoverMission: undefined,
                isDetectedOnArrival: false, // NEW: Track detection for alerts
                pendingAlertEvents: c.pendingAlertEvents
                    ? [...c.pendingAlertEvents, { ...infiltrationEvent, timestamp: Date.now() }]
                    : [{ ...infiltrationEvent, timestamp: Date.now() }],
                // FORCE RESET detection on arrival (Safety net)
                detectionLevel: 0,
                pendingDetectionEffects: undefined
            };
        }
    });
    // Build infiltration events for ClandestineAlertsModal from characters that just arrived
    processedCharacters.forEach(c => {
        // Only track characters that just arrived (have isDetectedOnArrival defined)
        if (typeof c.isDetectedOnArrival === 'boolean') {
            const location = locationMap.get(c.locationId);
            if (location && c.status === types_1.CharacterStatus.UNDERCOVER) {
                infiltrationEvents.push({
                    leaderId: c.id,
                    leaderName: c.name,
                    leaderFaction: c.faction,
                    locationId: location.id,
                    locationName: location.name,
                    wasDetected: c.isDetectedOnArrival
                });
            }
        }
    });
    return {
        characters: processedCharacters,
        logs,
        notifications,
        infiltrationEvents
    };
}
