/**
 * Conspirators Recruitment Domain Service
 *
 * Pure functions for handling Conspirators faction leader recruitment.
 * Part of the Clean Hexagonal architecture - domain logic only, no UI dependencies.
 */
import { Character, Location } from '../../../types';
/** Maximum number of living leaders for Conspirators faction */
export declare const CONSPIRATORS_MAX_LEADERS = 5;
/** Gold cost to recruit a new leader */
export declare const CONSPIRATORS_RECRUITMENT_COST = 150;
/**
 * Ordered list of recruitable Conspirator leader IDs.
 * Leaders appear in this order in the Prospective Leaders panel.
 */
export declare const CONSPIRATORS_RECRUITABLE_ORDER: string[];
/**
 * Get the default recruitment location for a leader.
 */
export declare function getDefaultRecruitmentLocation(leaderId: string): string;
/**
 * Get all living (not DEAD) Conspirator leaders.
 */
export declare function getLivingConspiratorLeaders(characters: Character[]): Character[];
/**
 * Get recruitable leaders for Conspirators (isRecruitableLeader=true AND in CONSPIRATORS_RECRUITABLE_ORDER).
 * Returns them in the specified display order.
 */
export declare function getRecruitableConspiratorLeaders(characters: Character[]): Character[];
/**
 * Check if Conspirators can recruit a new leader.
 * Returns { canRecruit, reason } where reason explains why not if canRecruit is false.
 */
export declare function canRecruitLeader(characters: Character[], playerGold: number, playerLocations: Location[]): {
    canRecruit: boolean;
    reason?: 'MAX_LEADERS' | 'NO_TERRITORY' | 'NOT_ENOUGH_GOLD' | 'NO_RECRUITABLE';
};
/**
 * Determine the actual recruitment destination for a leader.
 *
 * Priority:
 * 1. Default location (stormbay/windward) if controlled by Conspirators
 * 2. Most populous CITY controlled by Conspirators
 * 3. Most populous RURAL area controlled by Conspirators
 */
export declare function getRecruitmentDestination(leaderId: string, allLocations: Location[], conspiratorLocations: Location[]): string | null;
export interface RecruitLeaderResult {
    success: boolean;
    error?: string;
    updatedCharacters?: Character[];
    goldCost?: number;
    destinationId?: string;
}
/**
 * Execute leader recruitment for Conspirators.
 *
 * Effects:
 * - Leader status changes from DEAD to AVAILABLE
 * - Leader faction changes from NEUTRAL to CONSPIRATORS
 * - Leader moves to recruitment destination
 * - isRecruitableLeader flag set to false
 * - Gold cost deducted (handled by caller)
 */
export declare function executeRecruitLeader(characters: Character[], leaderId: string, allLocations: Location[], conspiratorLocations: Location[], playerGold: number): RecruitLeaderResult;
