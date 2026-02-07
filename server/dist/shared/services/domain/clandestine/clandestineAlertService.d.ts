/**
 * ClandestineAlertService
 *
 * Service for managing clandestine leader alert events.
 * Builds ClandestineAlert[] for display from Character.pendingAlertEvents.
 *
 * Clean Hexagonal: Pure domain logic, no UI dependencies.
 */
import { Character, Location, FactionId, Army } from '../../../types';
import { LeaderAlertEvent, ClandestineAlertEventType } from '../../../types/clandestineTypes';
/**
 * Alert ready for display in ClandestineAlertsModal.
 * Aggregates multiple events per leader into stacked titles.
 */
export interface ClandestineAlert {
    leader: Character;
    location: Location;
    captureRisk: number;
    /** Current detection level (0 = undetected) */
    detectionLevel: number;
    /** Detection threshold (based on stealth level, halved by HUNT_NETWORKS) */
    detectionThreshold: number;
    eventType: ClandestineAlertEventType;
    /** Stacked event message keys (chronological, oldest first) */
    eventMessages: Array<{
        key: string;
        params?: Record<string, string>;
    }>;
    /** Subtitle from most recent event */
    eventSubMessage?: {
        key: string;
        params?: Record<string, string>;
    };
}
/**
 * Add an alert event to a leader's pending events.
 * Returns updated character (immutable).
 */
export declare function addLeaderAlertEvent(character: Character, event: Omit<LeaderAlertEvent, 'timestamp'>): Character;
/**
 * Clear pending alert events after they have been displayed.
 * Returns updated character (immutable).
 */
export declare function clearPendingAlerts(character: Character): Character;
/**
 * Clear pending alerts for all characters of a faction.
 * Returns updated characters array (immutable).
 */
export declare function clearFactionPendingAlerts(characters: Character[], faction: FactionId): Character[];
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
export declare function buildClandestineAlerts(characters: Character[], locations: Location[], armies: Army[], playerFaction: FactionId): ClandestineAlert[];
/**
 * Create an infiltration arrival event for a leader.
 */
export declare function createInfiltrationEvent(leader: Character, location: Location, wasDetected: boolean, turn: number): LeaderAlertEvent;
/**
 * Create a Hunt Networks activation event for a leader.
 */
export declare function createHuntNetworksEvent(leader: Character, location: Location, turn: number): LeaderAlertEvent;
/**
 * Create an event when a leader's detection level exceeds the threshold.
 */
export declare function createThresholdExceededEvent(leader: Character, location: Location, turn: number): LeaderAlertEvent;
/**
 * Create an event when a PARANOID governor is appointed in the agent's location.
 */
export declare function createParanoidGovernorEvent(leader: Character, location: Location, governorName: string, governorId: string, turn: number): LeaderAlertEvent;
/**
 * Create an event when both PARANOID governor and HUNT_NETWORKS are active same turn.
 */
export declare function createCombinedParanoidHuntEvent(leader: Character, location: Location, governorName: string, governorId: string, turn: number): LeaderAlertEvent;
/**
 * Create an event when a leader is executed.
 */
export declare function createExecutionEvent(leader: Character, location: Location, turn: number): LeaderAlertEvent;
/**
 * Create an event when a leader escapes capture.
 */
export declare function createEscapeEvent(leader: Character, oldLocation: Location, newLocation: Location, turn: number): LeaderAlertEvent;
