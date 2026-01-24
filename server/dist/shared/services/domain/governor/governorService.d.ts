/**
 * Governor Service - Domain logic for appointing governors
 *
 * Handles:
 * - Leader appointment as governor
 * - Travel time calculation for distant leaders
 * - Replacing existing governors
 * - Governor mission travel processing
 */
import { Character, FactionId, Location, Road, LogEntry } from '../../../types';
export interface AppointGovernorResult {
    success: boolean;
    error?: string;
    updatedCharacters?: Character[];
    updatedLocations?: Location[];
}
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
export declare function executeAppointGovernor(characters: Character[], leaderId: string, targetLocationId: string, locations: Location[], roads: Road[], playerFaction: FactionId): AppointGovernorResult;
/**
 * Cancel a pending governor appointment.
 * Leader continues MOVING to destination but clears governorMission.
 * Status remains MOVING until arrival.
 *
 * @param characters - All characters
 * @param leaderId - Leader whose appointment to cancel
 * @returns Updated characters
 */
export declare function executeCancelGovernorAppointment(characters: Character[], leaderId: string): Character[];
/**
 * Get the current governor for a location.
 *
 * @param characters - All characters
 * @param locationId - Location to check
 * @param faction - Faction to filter by
 * @returns The governor character or undefined
 */
export declare function getGovernorForLocation(characters: Character[], locationId: string, faction: FactionId): Character | undefined;
/**
 * Get leader traveling to become governor of a location.
 *
 * @param characters - All characters
 * @param locationId - Destination location
 * @param faction - Faction to filter by
 * @returns The traveling leader or undefined
 */
export declare function getTravelingGovernor(characters: Character[], locationId: string, faction: FactionId): Character | undefined;
/**
 * Process governor mission travel each turn.
 * - Decrements turnsRemaining
 * - On arrival: set status to GOVERNING if region still friendly, UNDERCOVER if enemy
 *
 * @param characters - All characters
 * @param locations - All locations
 * @returns Updated characters and any logs
 */
export declare function processGovernorMissionTravel<T extends Character>(characters: T[], locations: Location[]): {
    characters: T[];
    locations: Location[];
    logs: LogEntry[];
};
export interface GovernorValidationResult {
    character: Character;
    log?: LogEntry;
    isValid: boolean;
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
export declare function validateGovernorStatus(governor: Character, location: Location, allLocations: Location[], roads: Road[], turn: number): GovernorValidationResult;
