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

import { GameState, Location, Road, FactionId, LocationType, Army, LogEntry, CharacterStatus, Character, GovernorPolicy } from '../../../types';
import { PORT_SEQUENCE, getNavalTravelTime } from '../../../data/gameConstants';
import { calculateTotalInfiltrationRisk } from './infiltrationRisk';
import {
    createGenericLog,
    createInfiltrationSuccessLog,
    createInfiltrationDetectedLog,
    createInfiltrationEliminatedLog,
    createInfiltrationRiskDebugLog,
    createLeaderDepartureSpottedLog
} from '../../logs/logFactory'; // Corrected path: shared/services/domain/leaders -> shared/services/logs
import { FACTION_NAMES } from '../../../types';

// ============================================================================
// TYPES
// ============================================================================

interface PathResult {
    totalTurns: number;
    routeType: 'NAVAL' | 'LAND' | 'HYBRID' | 'DIRECT';
    path?: string[];  // Road IDs for land portion
}

/**
 * Result of undercover mission processing
 */
export interface UndercoverProcessingResult<T> {
    characters: T[];
    logs: LogEntry[];
    notifications: any[]; // For modal notifications (death)
}

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
export function calculateLeaderTravelTime(
    fromLocationId: string,
    toLocationId: string,
    locations: Location[],
    roads: Road[]
): number {
    if (fromLocationId === toLocationId) return 0;

    const fromLoc = locations.find(l => l.id === fromLocationId);
    const toLoc = locations.find(l => l.id === toLocationId);
    if (!fromLoc || !toLoc) return 999;

    // Check for linked city-rural (LOCAL road = instant)
    if (fromLoc.linkedLocationId === toLocationId || toLoc.linkedLocationId === fromLocationId) {
        return 0;
    }

    // Get the rural/city pair for each location
    const fromRuralId = fromLoc.type === LocationType.CITY ? fromLoc.linkedLocationId : fromLoc.id;
    const toRuralId = toLoc.type === LocationType.CITY ? toLoc.linkedLocationId : toLoc.id;
    const fromCityId = fromLoc.type === LocationType.CITY ? fromLoc.id : fromLoc.linkedLocationId;
    const toCityId = toLoc.type === LocationType.CITY ? toLoc.id : toLoc.linkedLocationId;

    const isFromPort = !!fromCityId && PORT_SEQUENCE.includes(fromCityId);
    const isToPort = !!toCityId && PORT_SEQUENCE.includes(toCityId);

    let bestTime = Infinity;

    // Option 1: Direct naval (both are ports or their cities are ports)
    if (isFromPort && isToPort && fromCityId && toCityId) {
        const navalTime = getNavalTravelTime(fromCityId, toCityId);
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
        for (const transitPortId of PORT_SEQUENCE) {
            if (transitPortId === fromCityId) continue;

            const transitCity = locations.find(l => l.id === transitPortId);
            if (!transitCity) continue;

            const transitRuralId = transitCity.linkedLocationId;
            if (!transitRuralId) continue;

            const navalTime = getNavalTravelTime(fromCityId, transitPortId);
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
        for (const transitPortId of PORT_SEQUENCE) {
            if (transitPortId === toCityId) continue;

            const transitCity = locations.find(l => l.id === transitPortId);
            if (!transitCity) continue;

            const transitRuralId = transitCity.linkedLocationId;
            if (!transitRuralId) continue;

            const landPath = findLandPath(fromRuralId, transitRuralId, roads);
            if (landPath) {
                const landTime = calculateLandTravelTime(landPath, roads);
                const navalTime = getNavalTravelTime(transitPortId, toCityId);
                const totalTime = landTime + navalTime;
                if (totalTime < bestTime) {
                    bestTime = totalTime;
                }
            }
        }
    }

    // Option 5: Double hybrid - land to port A, naval to port B, land to destination
    if (!isFromPort && !isToPort && fromRuralId && toRuralId) {
        for (const startPortId of PORT_SEQUENCE) {
            const startPortCity = locations.find(l => l.id === startPortId);
            if (!startPortCity) continue;
            const startPortRuralId = startPortCity.linkedLocationId;
            if (!startPortRuralId) continue;

            const landToPort = findLandPath(fromRuralId, startPortRuralId, roads);
            if (!landToPort) continue;
            const landToPortTime = calculateLandTravelTime(landToPort, roads);

            for (const endPortId of PORT_SEQUENCE) {
                if (endPortId === startPortId) continue;

                const endPortCity = locations.find(l => l.id === endPortId);
                if (!endPortCity) continue;
                const endPortRuralId = endPortCity.linkedLocationId;
                if (!endPortRuralId) continue;

                const navalTime = getNavalTravelTime(startPortId, endPortId);
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
export function applyLeaderTravelSpeedBonus(travelTime: number): number {
    return travelTime >= 2 ? travelTime - 1 : travelTime;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Find a land path between two rural locations using BFS.
 * Leaders can traverse any road (no faction restriction for undercover missions).
 */
function findLandPath(
    startId: string,
    endId: string,
    roads: Road[]
): string[] | null {
    if (startId === endId) return [];

    const queue: { id: string; path: string[] }[] = [{ id: startId, path: [] }];
    const visited = new Set<string>([startId]);

    while (queue.length > 0) {
        const { id, path } = queue.shift()!;

        const connectedRoads = roads.filter(r => r.from === id || r.to === id);
        for (const road of connectedRoads) {
            const nextId = road.from === id ? road.to : road.from;

            if (visited.has(nextId)) continue;
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
function calculateLandTravelTime(roadPath: string[], roads: Road[]): number {
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
export function getAvailableLeadersForMission(
    characters: { id: string; name: string; status: string; faction: FactionId; armyId: string | null; locationId: string }[],
    faction: FactionId
): typeof characters {
    return characters.filter(c =>
        c.faction === faction &&
        (c.status === 'AVAILABLE' || c.status === 'UNDERCOVER') &&
        !c.armyId
    );
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
export function processUndercoverMissionTravel<T extends Character>(
    characters: T[],
    locations: Location[],
    armies: Army[],
    turn: number
): UndercoverProcessingResult<T> {
    const logs: LogEntry[] = [];
    const notifications: any[] = [];

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
        if (
            sourceLocation &&
            sourceLocation.governorPolicies?.[GovernorPolicy.HUNT_NETWORKS] &&
            !c.stats.ability.includes('GHOST') &&
            sourceLocation.faction !== c.faction
        ) {
            // Check if we should log departure (only log once per journey)
            // ... (logging logic) ...

            const destination = locationMap.get(mission.destinationId);
            if (destination) {
                logs.push(createLeaderDepartureSpottedLog(
                    c.name,
                    FACTION_NAMES[c.faction],
                    sourceLocation.name,
                    sourceLocation.id,
                    destination.name,
                    turn,
                    sourceLocation.faction
                ));
            }
        }

        // START OF TURN CHECK
        // If mission started this turn, do not decrement yet (simulate travel time correctly)
        // BUT allow instant travel (0 turns) to process immediately
        if (mission.turnStarted === turn && mission.turnsRemaining > 0) {
            return c;
        }

        if (mission.turnsRemaining > 0) {
            // Still traveling - continue (turnsRemaining 1 -> 0 means arrive next turn)
            return {
                ...c,
                undercoverMission: {
                    ...mission,
                    turnsRemaining: mission.turnsRemaining - 1
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
                status: CharacterStatus.UNDERCOVER, // Arrived in enemy territory
                undercoverMission: undefined
            };
        }

        // --- RISK CALCULATION ---
        // If destination controlled by enemy, calculate risk
        let isSuccess = true;
        let isEliminated = false;

        // Assuming FactionId values are strings, check inequality
        // Neutrals don't detect (risk is 0 anyway, but safe check)
        if (destination.faction !== c.faction && destination.faction !== FactionId.NEUTRAL) {

            // Find governor in destination region
            const governor = characters.find(char =>
                char.locationId === destination.id &&
                char.faction === destination.faction &&
                char.status === CharacterStatus.GOVERNING
            );

            // Check if Hunt Networks policy is active
            const isHuntNetworkActive = destination.governorPolicies?.[GovernorPolicy.HUNT_NETWORKS] === true;

            // Calculate Risk (includes Hunt Networks modifier if active)
            const risk = calculateTotalInfiltrationRisk(
                destination,
                armies,
                c,
                governor,
                isHuntNetworkActive
            );

            // LOG DEBUG RISK (shows final risk after all modifiers including Hunt Networks)
            logs.push(createInfiltrationRiskDebugLog(
                c.name,
                destination.name,
                risk,
                turn,
                c.faction
            ));

            // Roll risk (0.0 - 1.0)
            const roll = Math.random();

            if (roll < risk) {
                // DETECTED
                isSuccess = false;

                // Second roll for Elimination (50/50)
                const eliminationRoll = Math.random();

                if (eliminationRoll < 0.5) {
                    // ELIMINATED (50% chance if detected)
                    isEliminated = true;
                }
            }
        }

        // --- CONSEQUENCES ---

        // Helper for pronouns
        const isFemale = c.name === 'Alia' || c.name === 'Lady Ethell'; // Simplified check based on names mentioned in spec
        const pronounObj = isFemale ? 'her' : 'him';
        const pronounPossessive = isFemale ? 'her' : 'his';
        const pronounSubj = isFemale ? 'she' : 'he'; // used in eliminated log

        const factionName = c.faction; // Simplified, ideally map to full name

        if (isEliminated) {
            // 1. Log for owner (Good news!)
            logs.push(createInfiltrationEliminatedLog(
                c.name,
                factionName,
                destination.name,
                destination.id,
                turn,
                destination.faction,
                pronounSubj
            ));

            // 2. Notification Modal for sender ("We will mourn him")
            notifications.push({
                type: 'LEADER_ELIMINATED',
                leaderId: c.id,
                leaderName: c.name,
                locationName: destination.name,
                message: `Our valorous ${c.name} has been identified and killed by the enemy while entering ${destination.name}.`,
                buttonText: `We will mourn ${pronounObj}.`
            });

            // 3. Kill Leader
            return {
                ...c,
                status: CharacterStatus.DEAD,
                locationId: 'graveyard',
                undercoverMission: undefined,
                armyId: null // detach if any (shouldn't be, but safe)
            };

        } else if (!isSuccess) { // Detected but not eliminated
            // 1. Log for owner (Spotted)
            logs.push(createInfiltrationDetectedLog(
                c.name,
                factionName,
                destination.name,
                destination.id,
                turn,
                destination.faction,
                true, // Owner message
                pronounPossessive
            ));

            // 2. Log for sender (Spotted)
            logs.push(createInfiltrationDetectedLog(
                c.name,
                factionName,
                destination.name,
                destination.id,
                turn,
                c.faction,
                false, // Sender message
                pronounPossessive
            ));

            // Leader still arrives and becomes UNDERCOVER (was detected but not eliminated)
            return {
                ...c,
                locationId: mission.destinationId,
                status: CharacterStatus.UNDERCOVER, // Arrived in enemy territory
                undercoverMission: undefined
            };

        } else {
            // SUCCESS
            // 1. Log for sender (Infiltrated - Good news)
            // Destination faction doesn't know
            if (c.faction !== destination.faction) {
                logs.push(createInfiltrationSuccessLog(
                    c.name,
                    destination.name,
                    destination.id,
                    turn,
                    c.faction
                ));
            }

            // Leader arrives and becomes UNDERCOVER for clandestine operations
            return {
                ...c,
                locationId: mission.destinationId,
                status: CharacterStatus.UNDERCOVER, // Arrived in enemy territory
                undercoverMission: undefined
            };
        }
    });

    return {
        characters: processedCharacters,
        logs,
        notifications
    };
}
