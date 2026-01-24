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
import { Location, Road, FactionId, Army, LogEntry, Character } from '../../../types';
/**
 * Result of undercover mission processing
 */
export interface UndercoverProcessingResult<T> {
    characters: T[];
    logs: LogEntry[];
    notifications: any[];
    infiltrationEvents: InfiltrationEvent[];
}
/**
 * Event for a leader successfully infiltrating a location
 */
export interface InfiltrationEvent {
    leaderId: string;
    leaderName: string;
    leaderFaction: FactionId;
    locationId: string;
    locationName: string;
    wasDetected: boolean;
}
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
export declare function calculateLeaderTravelTime(fromLocationId: string, toLocationId: string, locations: Location[], roads: Road[]): number;
/**
 * Apply leader travel speed bonus.
 * Leaders travel faster than armies: trips of 2+ turns are reduced by 1 turn.
 * This does NOT apply when leaders are attached to armies.
 *
 * @param travelTime - Base travel time in turns
 * @returns Adjusted travel time (reduced by 1 if >= 2)
 */
export declare function applyLeaderTravelSpeedBonus(travelTime: number): number;
/**
 * Get available leaders for undercover missions in a given faction.
 * Leaders must be AVAILABLE or UNDERCOVER status and not attached to an army.
 */
export declare function getAvailableLeadersForMission(characters: {
    id: string;
    name: string;
    status: string;
    faction: FactionId;
    armyId: string | null;
    locationId: string;
}[], faction: FactionId): typeof characters;
/**
 * Process undercover mission travel each turn.
 * Should be called during turn processing.
 *
 * - Decrements turnsRemaining for traveling leaders
 * - Moves leader to destination when turnsRemaining reaches 0
 * - Sets status to AVAILABLE when arrived
 * - Calculates infiltration risk and handles detection/elimination
 */
export declare function processUndercoverMissionTravel<T extends Character>(characters: T[], locations: Location[], armies: Army[], turn: number): UndercoverProcessingResult<T>;
