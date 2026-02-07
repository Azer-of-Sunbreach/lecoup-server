"use strict";
/**
 * ClandestineAlertService
 *
 * Service for managing clandestine leader alert events.
 * Builds ClandestineAlert[] for display from Character.pendingAlertEvents.
 *
 * Clean Hexagonal: Pure domain logic, no UI dependencies.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.addLeaderAlertEvent = addLeaderAlertEvent;
exports.clearPendingAlerts = clearPendingAlerts;
exports.clearFactionPendingAlerts = clearFactionPendingAlerts;
exports.buildClandestineAlerts = buildClandestineAlerts;
exports.createInfiltrationEvent = createInfiltrationEvent;
exports.createHuntNetworksEvent = createHuntNetworksEvent;
exports.createThresholdExceededEvent = createThresholdExceededEvent;
exports.createParanoidGovernorEvent = createParanoidGovernorEvent;
exports.createCombinedParanoidHuntEvent = createCombinedParanoidHuntEvent;
exports.createExecutionEvent = createExecutionEvent;
exports.createEscapeEvent = createEscapeEvent;
const types_1 = require("../../../types");
const clandestineTypes_1 = require("../../../types/clandestineTypes");
const detectionLevelService_1 = require("./detectionLevelService");
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Add an alert event to a leader's pending events.
 * Returns updated character (immutable).
 */
function addLeaderAlertEvent(character, event) {
    const newEvent = {
        ...event,
        timestamp: Date.now()
    };
    const existingEvents = character.pendingAlertEvents || [];
    return {
        ...character,
        pendingAlertEvents: [...existingEvents, newEvent]
    };
}
/**
 * Clear pending alert events after they have been displayed.
 * Returns updated character (immutable).
 */
function clearPendingAlerts(character) {
    return {
        ...character,
        pendingAlertEvents: [],
        isDetectedOnArrival: undefined // Also clear the arrival detection flag
    };
}
/**
 * Clear pending alerts for all characters of a faction.
 * Returns updated characters array (immutable).
 */
function clearFactionPendingAlerts(characters, faction) {
    return characters.map(c => c.faction === faction ? clearPendingAlerts(c) : c);
}
// ============================================================================
// MAIN BUILD FUNCTION
// ============================================================================
/**
 * Build ClandestineAlert array from current game state.
 * Filters by player faction and aggregates events per leader.
 *
 * @param characters All game characters
 * @param locations All game locations
 * @param armies All armies (for risk calculation)
 * @param playerFaction Faction to filter alerts for
 * @returns Array of alerts ready for display
 */
function buildClandestineAlerts(characters, locations, armies, playerFaction) {
    const locationMap = new Map(locations.map(l => [l.id, l]));
    const alerts = [];
    // DEBUG: Log all undercover leaders for this faction
    const undercoverLeaders = characters.filter(c => c.faction === playerFaction &&
        (c.status === types_1.CharacterStatus.UNDERCOVER || c.status === types_1.CharacterStatus.ON_MISSION));
    console.log(`[BUILD_ALERTS] Found ${undercoverLeaders.length} undercover/on_mission leaders for faction ${playerFaction}`);
    undercoverLeaders.forEach(l => {
        console.log(`[BUILD_ALERTS] Leader ${l.name}: pendingAlertEvents=${l.pendingAlertEvents?.length ?? 0}, isDetectedOnArrival=${l.isDetectedOnArrival}`);
    });
    // Process leaders with pending events OR who just arrived
    const leaderCandidates = characters.filter(c => c.faction === playerFaction &&
        // Status can be UNDERCOVER, ON_MISSION, or DEAD (Executed), AVAILABLE (Escaped)
        (c.status === types_1.CharacterStatus.UNDERCOVER ||
            c.status === types_1.CharacterStatus.ON_MISSION ||
            // Must have pending events to be relevant if not active undercover
            ((c.status === types_1.CharacterStatus.DEAD || c.status === types_1.CharacterStatus.AVAILABLE) && c.pendingAlertEvents && c.pendingAlertEvents.length > 0)) &&
        // Must have pending events or implicit arrival
        ((c.pendingAlertEvents && c.pendingAlertEvents.length > 0) ||
            c.isDetectedOnArrival !== undefined));
    console.log(`[BUILD_ALERTS] ${leaderCandidates.length} leaders have pending events or arrival flag`);
    for (const leader of leaderCandidates) {
        let location = locationMap.get(leader.locationId);
        if (!location && (leader.status === types_1.CharacterStatus.DEAD || leader.status === types_1.CharacterStatus.AVAILABLE)) {
            // For dead/escaped leaders, try to find the location from the event if possible
            const relevantEvent = leader.pendingAlertEvents?.find(e => e.eventType === clandestineTypes_1.ClandestineAlertEventType.EXECUTION ||
                e.eventType === clandestineTypes_1.ClandestineAlertEventType.ESCAPE);
            if (relevantEvent?.locationId) {
                location = locations.find(l => l.id === relevantEvent.locationId);
            }
        }
        if (!location)
            continue;
        // Sort events by timestamp (oldest first for stacking)
        const events = [...(leader.pendingAlertEvents || [])].sort((a, b) => a.timestamp - b.timestamp);
        // If no explicit events but has arrival flag, create implicit event
        if (events.length === 0 && leader.isDetectedOnArrival !== undefined) {
            const isDetected = leader.isDetectedOnArrival;
            events.push({
                leaderId: leader.id,
                turn: 0, // Placeholder
                eventType: isDetected
                    ? clandestineTypes_1.ClandestineAlertEventType.INFILTRATION_DETECTED
                    : clandestineTypes_1.ClandestineAlertEventType.INFILTRATION_SUCCESS,
                messageKey: isDetected
                    ? 'clandestineAlerts.infiltrationDetected'
                    : 'clandestineAlerts.infiltrationSuccess',
                messageParams: {
                    leader: leader.name,
                    leaderId: leader.id,
                    location: location.name,
                    locationId: location.id
                },
                subMessageKey: isDetected
                    ? 'clandestineAlerts.infiltrationDetectedSub'
                    : 'clandestineAlerts.infiltrationSuccessSub',
                subMessageParams: {
                    leader: leader.name,
                    leaderId: leader.id
                },
                targetFaction: playerFaction,
                timestamp: Date.now()
            });
        }
        if (events.length === 0)
            continue;
        // Find governor in this location for risk calculation
        const governor = characters.find(c => c.locationId === leader.locationId &&
            c.faction === location.faction &&
            c.status === types_1.CharacterStatus.GOVERNING);
        // Check if Hunt Networks is active
        const isHuntNetworksActive = location.governorPolicies?.HUNT_NETWORKS === true;
        // Calculate current capture risk using new detection level system
        const detectionLevel = leader.detectionLevel ?? 0;
        const detectionThreshold = (0, detectionLevelService_1.calculateDetectionThreshold)(leader, location);
        const captureRisk = (0, detectionLevelService_1.calculateCaptureRisk)(leader, location, governor);
        // Aggregate events into stacked messages
        const eventMessages = events.map(e => ({
            key: e.messageKey,
            params: e.messageParams
        }));
        // Get subtitle from most recent event
        const mostRecent = events[events.length - 1];
        const eventSubMessage = mostRecent.subMessageKey
            ? {
                key: mostRecent.subMessageKey,
                params: mostRecent.subMessageParams
            }
            : undefined;
        alerts.push({
            leader,
            location,
            captureRisk,
            detectionLevel,
            detectionThreshold,
            eventType: mostRecent.eventType,
            eventMessages,
            eventSubMessage
        });
    }
    return alerts;
}
/**
 * Create an infiltration arrival event for a leader.
 */
function createInfiltrationEvent(leader, location, wasDetected, turn) {
    return {
        leaderId: leader.id,
        turn,
        eventType: wasDetected
            ? clandestineTypes_1.ClandestineAlertEventType.INFILTRATION_DETECTED
            : clandestineTypes_1.ClandestineAlertEventType.INFILTRATION_SUCCESS,
        messageKey: wasDetected
            ? 'clandestineAlerts.infiltrationDetected'
            : 'clandestineAlerts.infiltrationSuccess',
        messageParams: {
            leader: leader.name,
            leaderId: leader.id,
            location: location.name,
            locationId: location.id
        },
        subMessageKey: wasDetected
            ? 'clandestineAlerts.infiltrationDetectedSub'
            : 'clandestineAlerts.infiltrationSuccessSub',
        subMessageParams: {
            leader: leader.name,
            leaderId: leader.id
        },
        targetFaction: leader.faction,
        timestamp: Date.now()
    };
}
/**
 * Create a Hunt Networks activation event for a leader.
 */
function createHuntNetworksEvent(leader, location, turn) {
    return {
        leaderId: leader.id,
        turn,
        eventType: clandestineTypes_1.ClandestineAlertEventType.HUNT_NETWORKS_ACTIVATED,
        messageKey: 'clandestineAlerts.huntNetworksActivated',
        messageParams: {
            leader: leader.name,
            leaderId: leader.id,
            location: location.name,
            locationId: location.id
        },
        targetFaction: leader.faction,
        timestamp: Date.now()
    };
}
// ============================================================================
// DETECTION LEVEL SYSTEM EVENTS (2026-01-10)
// ============================================================================
/**
 * Create an event when a leader's detection level exceeds the threshold.
 */
function createThresholdExceededEvent(leader, location, turn) {
    const isFemale = leader.name === 'Alia' || leader.name === 'Lady Ethell';
    return {
        leaderId: leader.id,
        turn,
        eventType: clandestineTypes_1.ClandestineAlertEventType.THRESHOLD_EXCEEDED,
        messageKey: 'clandestineAlerts.thresholdExceeded',
        messageParams: {
            leader: leader.name,
            leaderId: leader.id,
            location: location.name,
            locationId: location.id
        },
        subMessageKey: isFemale
            ? 'clandestineAlerts.thresholdExceededSubFemale'
            : 'clandestineAlerts.thresholdExceededSub',
        subMessageParams: {
            leader: leader.name,
            leaderId: leader.id
        },
        targetFaction: leader.faction,
        timestamp: Date.now()
    };
}
/**
 * Create an event when a PARANOID governor is appointed in the agent's location.
 */
function createParanoidGovernorEvent(leader, location, governorName, governorId, turn) {
    return {
        leaderId: leader.id,
        turn,
        eventType: clandestineTypes_1.ClandestineAlertEventType.PARANOID_GOVERNOR_APPOINTED,
        messageKey: 'clandestineAlerts.paranoidGovernor',
        messageParams: {
            leader: leader.name,
            leaderId: leader.id,
            location: location.name,
            locationId: location.id,
            governor: governorName,
            governorId: governorId
        },
        targetFaction: leader.faction,
        timestamp: Date.now()
    };
}
/**
 * Create an event when both PARANOID governor and HUNT_NETWORKS are active same turn.
 */
function createCombinedParanoidHuntEvent(leader, location, governorName, governorId, turn) {
    return {
        leaderId: leader.id,
        turn,
        eventType: clandestineTypes_1.ClandestineAlertEventType.COMBINED_PARANOID_HUNT,
        messageKey: 'clandestineAlerts.combinedParanoidHunt',
        messageParams: {
            leader: leader.name,
            leaderId: leader.id,
            location: location.name,
            locationId: location.id,
            governor: governorName,
            governorId: governorId
        },
        targetFaction: leader.faction,
        timestamp: Date.now()
    };
}
/**
 * Create an event when a leader is executed.
 */
function createExecutionEvent(leader, location, turn) {
    return {
        leaderId: leader.id,
        turn,
        eventType: clandestineTypes_1.ClandestineAlertEventType.EXECUTION,
        messageKey: 'clandestineAlerts.execution',
        messageParams: {
            leader: leader.name,
            leaderId: leader.id,
            location: location.name,
            locationId: location.id
        },
        subMessageKey: 'clandestineAlerts.executionSub',
        subMessageParams: {
            leader: leader.name,
            leaderId: leader.id,
            location: location.name,
            locationId: location.id
        },
        targetFaction: leader.faction,
        timestamp: Date.now(),
        locationId: location.id
    };
}
/**
 * Create an event when a leader escapes capture.
 */
function createEscapeEvent(leader, oldLocation, newLocation, turn) {
    return {
        leaderId: leader.id,
        turn,
        eventType: clandestineTypes_1.ClandestineAlertEventType.ESCAPE,
        messageKey: 'clandestineAlerts.escape',
        messageParams: {
            leader: leader.name,
            leaderId: leader.id,
            location: oldLocation.name,
            locationId: oldLocation.id,
            destination: newLocation.name,
            destinationId: newLocation.id
        },
        subMessageKey: 'clandestineAlerts.escapeSub',
        subMessageParams: {},
        targetFaction: leader.faction,
        timestamp: Date.now(),
        locationId: oldLocation.id // Incident happened at oldLocation
    };
}
