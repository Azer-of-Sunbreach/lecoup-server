"use strict";
/**
 * Governor Service - Domain logic for appointing governors
 *
 * Handles:
 * - Leader appointment as governor
 * - Travel time calculation for distant leaders
 * - Replacing existing governors
 * - Governor mission travel processing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeAppointGovernor = executeAppointGovernor;
exports.executeCancelGovernorAppointment = executeCancelGovernorAppointment;
exports.getGovernorForLocation = getGovernorForLocation;
exports.getTravelingGovernor = getTravelingGovernor;
exports.processGovernorMissionTravel = processGovernorMissionTravel;
exports.validateGovernorStatus = validateGovernorStatus;
const types_1 = require("../../../types");
const leaders_1 = require("../leaders");
const makeExamples_1 = require("./makeExamples");
// ============================================================================
// MAIN FUNCTIONS
// ============================================================================
/**
 * Appoint a leader as governor of a region.
 * - If leader is in region: immediately GOVERNING
 * - If leader is distant: MOVING with governorMission
 * - Removes GOVERNING from any previous governor in the region
 *
 * @param characters - All characters
 * @param leaderId - Leader to appoint
 * @param targetLocationId - Target region (must be friendly)
 * @param locations - All locations
 * @param roads - All roads
 * @param playerFaction - Player's faction
 * @returns Result with updated characters or error
 */
function executeAppointGovernor(characters, leaderId, targetLocationId, locations, roads, playerFaction) {
    // Validate leader exists and belongs to player
    const leader = characters.find(c => c.id === leaderId);
    if (!leader) {
        return { success: false, error: 'Leader not found' };
    }
    if (leader.faction !== playerFaction) {
        return { success: false, error: 'Leader does not belong to your faction' };
    }
    if (leader.armyId && leader.locationId !== targetLocationId) {
        return { success: false, error: 'Leader is attached to an army' };
    }
    if (leader.status !== types_1.CharacterStatus.AVAILABLE &&
        leader.status !== types_1.CharacterStatus.UNDERCOVER &&
        leader.status !== types_1.CharacterStatus.GOVERNING) {
        return { success: false, error: 'Leader is not available' };
    }
    // Check if leader was governing elsewhere - we'll need to clear policies on that location
    const wasGoverning = leader.status === types_1.CharacterStatus.GOVERNING;
    const previousLocationId = wasGoverning ? leader.locationId : null;
    // Validate target location
    const targetLocation = locations.find(l => l.id === targetLocationId);
    if (!targetLocation) {
        return { success: false, error: 'Target location not found' };
    }
    if (targetLocation.faction !== playerFaction) {
        return { success: false, error: 'Cannot appoint governor in enemy territory' };
    }
    // Calculate travel time
    const travelTime = (0, leaders_1.calculateLeaderTravelTime)(leader.locationId, targetLocationId, locations, roads);
    // Update characters
    const updatedCharacters = characters.map(c => {
        // Remove GOVERNING status from any previous governor in this region
        // FIX: Reset governors from ANY faction, not just playerFaction
        // This handles cases where territory changed hands (e.g., insurrection/negotiation)
        if (c.id !== leaderId &&
            c.locationId === targetLocationId &&
            c.status === types_1.CharacterStatus.GOVERNING) {
            // If the displaced governor is from a different faction, they become UNDERCOVER
            // If same faction, they become AVAILABLE (just demoted, not in enemy territory)
            const isEnemyFaction = c.faction !== playerFaction;
            return {
                ...c,
                status: isEnemyFaction ? types_1.CharacterStatus.UNDERCOVER : types_1.CharacterStatus.AVAILABLE,
                detectionLevel: isEnemyFaction ? 0 : c.detectionLevel,
                activeClandestineActions: isEnemyFaction ? [] : c.activeClandestineActions
            };
        }
        // Update the appointed leader
        if (c.id === leaderId) {
            if (travelTime === 0) {
                // Leader is in the region - immediately become GOVERNING
                // Reset detection if was clandestine
                const wasClandestine = c.status === types_1.CharacterStatus.UNDERCOVER || c.status === types_1.CharacterStatus.ON_MISSION;
                return {
                    ...c,
                    locationId: targetLocationId,
                    status: types_1.CharacterStatus.GOVERNING,
                    governorMission: undefined,
                    // Clear clandestine actions if was UNDERCOVER
                    activeClandestineActions: undefined,
                    ...(wasClandestine ? { detectionLevel: 0, pendingDetectionEffects: undefined } : {})
                };
            }
            else {
                // Leader is distant - start traveling
                // Reset detection if was clandestine
                const wasClandestine = c.status === types_1.CharacterStatus.UNDERCOVER || c.status === types_1.CharacterStatus.ON_MISSION;
                return {
                    ...c,
                    status: types_1.CharacterStatus.MOVING,
                    destinationId: targetLocationId,
                    turnsUntilArrival: travelTime,
                    governorMission: {
                        destinationId: targetLocationId,
                        turnsRemaining: travelTime
                    },
                    // Clear clandestine actions if was UNDERCOVER
                    activeClandestineActions: undefined,
                    ...(wasClandestine ? { detectionLevel: 0, pendingDetectionEffects: undefined } : {})
                };
            }
        }
        return c;
    });
    // Clear governor policies on previous location if leader was governing elsewhere
    let updatedLocations = locations;
    if (wasGoverning && previousLocationId && previousLocationId !== targetLocationId) {
        updatedLocations = locations.map(loc => loc.id === previousLocationId
            ? { ...loc, governorPolicies: {} }
            : loc);
    }
    return {
        success: true,
        updatedCharacters,
        updatedLocations
    };
}
/**
 * Cancel a pending governor appointment.
 * Leader continues MOVING to destination but clears governorMission.
 * Status remains MOVING until arrival.
 *
 * @param characters - All characters
 * @param leaderId - Leader whose appointment to cancel
 * @returns Updated characters
 */
function executeCancelGovernorAppointment(characters, leaderId) {
    return characters.map(c => {
        if (c.id === leaderId && c.governorMission) {
            return {
                ...c,
                governorMission: undefined
                // Keep MOVING status and destination - leader continues traveling
            };
        }
        return c;
    });
}
/**
 * Get the current governor for a location.
 *
 * @param characters - All characters
 * @param locationId - Location to check
 * @param faction - Faction to filter by
 * @returns The governor character or undefined
 */
function getGovernorForLocation(characters, locationId, faction) {
    return characters.find(c => c.locationId === locationId &&
        c.status === types_1.CharacterStatus.GOVERNING &&
        c.faction === faction);
}
/**
 * Get leader traveling to become governor of a location.
 *
 * @param characters - All characters
 * @param locationId - Destination location
 * @param faction - Faction to filter by
 * @returns The traveling leader or undefined
 */
function getTravelingGovernor(characters, locationId, faction) {
    return characters.find(c => c.governorMission?.destinationId === locationId &&
        c.status === types_1.CharacterStatus.MOVING &&
        c.faction === faction);
}
/**
 * Process governor mission travel each turn.
 * - Decrements turnsRemaining
 * - On arrival: set status to GOVERNING if region still friendly, UNDERCOVER if enemy
 *
 * @param characters - All characters
 * @param locations - All locations
 * @returns Updated characters and any logs
 */
function processGovernorMissionTravel(characters, locations) {
    const logs = [];
    const updatedLocationsMap = new Map();
    const locationMap = new Map(locations.map(l => [l.id, l]));
    const processedCharacters = characters.map(c => {
        // Only process leaders traveling for governor mission
        if (c.status !== types_1.CharacterStatus.MOVING || !c.governorMission) {
            return c;
        }
        const mission = c.governorMission;
        if (mission.turnsRemaining > 1) {
            // Still traveling - decrement counter
            return {
                ...c,
                turnsUntilArrival: c.turnsUntilArrival - 1,
                governorMission: {
                    ...mission,
                    turnsRemaining: mission.turnsRemaining - 1
                }
            };
        }
        // Arrived (turnsRemaining === 1 means this is the final turn)
        const destination = locationMap.get(mission.destinationId);
        if (!destination) {
            // Fallback - should not happen
            return {
                ...c,
                locationId: mission.destinationId,
                status: types_1.CharacterStatus.AVAILABLE,
                governorMission: undefined,
                destinationId: null,
                turnsUntilArrival: 0
            };
        }
        // Check if region is still controlled by the leader's faction
        if (destination.faction === c.faction) {
            // Region is friendly - become governor
            // First, we need to demote any existing governor in this region
            // This is handled by removing GOVERNING from others after this map
            // If governor has Iron Fist trait, auto-enable MAKE_EXAMPLES
            if ((0, makeExamples_1.hasIronFistTrait)(c)) {
                updatedLocationsMap.set(destination.id, (0, makeExamples_1.applyIronFistPolicy)(destination));
            }
            return {
                ...c,
                locationId: mission.destinationId,
                status: types_1.CharacterStatus.GOVERNING,
                governorMission: undefined,
                destinationId: null,
                turnsUntilArrival: 0
            };
        }
        else {
            // Region changed hands! Leader arrives as UNDERCOVER in enemy territory
            return {
                ...c,
                locationId: mission.destinationId,
                status: types_1.CharacterStatus.UNDERCOVER,
                governorMission: undefined,
                destinationId: null,
                turnsUntilArrival: 0
            };
        }
    });
    // Ensure only one governor per region per faction
    // If a new governor arrived, demote any existing ones
    const finalCharacters = processedCharacters.map(c => {
        if (c.status !== types_1.CharacterStatus.GOVERNING)
            return c;
        // Check if there's another governor in the same location
        const otherGovernors = processedCharacters.filter(other => other.id !== c.id &&
            other.locationId === c.locationId &&
            other.status === types_1.CharacterStatus.GOVERNING &&
            other.faction === c.faction);
        // If this character just arrived (had governorMission), they take priority
        // The original character (in characters array) had governorMission
        const originalChar = characters.find(oc => oc.id === c.id);
        const justArrived = originalChar?.governorMission?.turnsRemaining === 1;
        if (otherGovernors.length > 0 && !justArrived) {
            // This was the old governor, demote them
            return {
                ...c,
                status: types_1.CharacterStatus.AVAILABLE
            };
        }
        return c;
    });
    // Apply Iron Fist location updates
    const finalLocations = locations.map(loc => updatedLocationsMap.has(loc.id) ? updatedLocationsMap.get(loc.id) : loc);
    return {
        characters: finalCharacters,
        locations: finalLocations,
        logs
    };
}
/**
 * Validate that a governor is still allowed to govern their location.
 * Handles cases where territory control changes:
 * - Neutral: Demote to AVAILABLE
 * - Enemy: Flee to friendly territory OR Die
 *
 * @param governor - The governor to validate
 * @param location - The location they are governing
 * @param allLocations - All locations (for finding escape routes)
 * @param roads - All roads (for finding escape routes)
 * @param turn - Current turn number (for logging)
 */
function validateGovernorStatus(governor, location, allLocations, roads, turn) {
    // 1. Valid case: Faction matches - governor stays
    if (governor.faction === location.faction) {
        return { character: governor, isValid: true };
    }
    // 2. Neutral case: Demote to AVAILABLE (stops governing, but not in enemy territory)
    if (location.faction === types_1.FactionId.NEUTRAL) {
        return {
            character: {
                ...governor,
                status: types_1.CharacterStatus.AVAILABLE,
                activeGovernorPolicies: [],
                activeClandestineActions: [] // Clear any active actions
            },
            isValid: false,
            log: {
                id: `gov-demote-${turn}-${governor.id}`,
                type: types_1.LogType.LEADER,
                message: `${governor.name} is no longer governor of ${location.name} as it has become neutral.`,
                turn,
                visibleToFactions: [governor.faction],
                baseSeverity: types_1.LogSeverity.WARNING,
                highlightTarget: { type: 'LOCATION', id: location.id }
            }
        };
    }
    // 3. Enemy case: Flee or Die
    // Find all friendly locations
    const friendlyLocations = allLocations.filter(l => l.faction === governor.faction);
    if (friendlyLocations.length === 0) {
        // NO ESCAPE - DIE
        return {
            character: {
                ...governor,
                status: types_1.CharacterStatus.DEAD,
                locationId: location.id, // Dies here
                activeGovernorPolicies: [],
                activeClandestineActions: [],
                detectionLevel: 0,
                pendingDetectionEffects: undefined
            },
            isValid: false,
            log: {
                id: `gov-death-${turn}-${governor.id}`,
                type: types_1.LogType.LEADER,
                message: `${governor.name} was captured and executed in ${location.name} after the region fell to the enemy. No allied territory remained for escape.`,
                turn,
                visibleToFactions: [governor.faction],
                baseSeverity: types_1.LogSeverity.CRITICAL,
                highlightTarget: { type: 'LOCATION', id: location.id }
            }
        };
    }
    // Attempt to flee
    let targetLocation;
    // Priority 1: Adjacent friendly locations
    const adjacentIds = new Set();
    // Check linked location
    if (location.linkedLocationId) {
        adjacentIds.add(location.linkedLocationId);
    }
    // Check roads
    roads.forEach(r => {
        if (r.from === location.id)
            adjacentIds.add(r.to);
        if (r.to === location.id)
            adjacentIds.add(r.from);
    });
    const adjacentFriendly = friendlyLocations.filter(l => adjacentIds.has(l.id));
    if (adjacentFriendly.length > 0) {
        // Pick random adjacent (or first)
        targetLocation = adjacentFriendly[Math.floor(Math.random() * adjacentFriendly.length)];
    }
    else {
        // Priority 2: Global random friendly
        targetLocation = friendlyLocations[Math.floor(Math.random() * friendlyLocations.length)];
    }
    if (targetLocation) {
        return {
            character: {
                ...governor,
                status: types_1.CharacterStatus.AVAILABLE,
                locationId: targetLocation.id,
                activeGovernorPolicies: [],
                activeClandestineActions: [],
                detectionLevel: 0,
                pendingDetectionEffects: undefined
            },
            isValid: false,
            log: {
                id: `gov-flee-${turn}-${governor.id}`,
                type: types_1.LogType.LEADER,
                message: `${governor.name} fled from ${location.name} to ${targetLocation.name} just before the enemy could capture them.`,
                turn,
                visibleToFactions: [governor.faction],
                baseSeverity: types_1.LogSeverity.WARNING,
                highlightTarget: { type: 'LOCATION', id: targetLocation.id }
            }
        };
    }
    // Fallback (should be covered by empty check above, but for safety)
    return {
        character: {
            ...governor,
            status: types_1.CharacterStatus.DEAD,
            activeGovernorPolicies: [],
            activeClandestineActions: []
        },
        isValid: false
    };
}
