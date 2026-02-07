/**
 * Nobles Leader Availability Service
 *
 * Handles the progressive availability of Nobles recruitable leaders.
 * Leaders become available at specific turns, creating strategic timing choices.
 *
 * @module shared/services/domain/leaders
 */
import { Character } from '../../../types';
/**
 * Turn at which each Nobles leader becomes recruitable.
 * Leaders start with isRecruitableLeader: false and become true at their designated turn.
 */
export declare const NOBLES_LEADER_AVAILABILITY: Record<string, number>;
/**
 * All Nobles recruitable leader IDs (for reference).
 */
export declare const NOBLES_RECRUITABLE_LEADER_IDS: string[];
/**
 * Get the leader IDs that should become available at a specific turn.
 */
export declare function getLeadersAvailableAtTurn(turn: number): string[];
/**
 * Check if a leader should be available based on the current turn.
 */
export declare function isLeaderAvailableAtTurn(leaderId: string, currentTurn: number): boolean;
/**
 * Process leader availability for a turn.
 * Activates leaders whose turn has come (sets isRecruitableLeader to true).
 *
 * @param characters - All characters in the game
 * @param currentTurn - The current turn number
 * @returns Updated characters array and list of newly available leaders
 */
export declare function processNoblesLeaderAvailability(characters: Character[], currentTurn: number): {
    characters: Character[];
    newlyAvailable: string[];
};
/**
 * Get all currently available Nobles recruitable leaders.
 * Filters by isRecruitableLeader flag (already activated and not yet recruited).
 */
export declare function getAvailableNoblesRecruitableLeaders(characters: Character[], currentTurn: number): Character[];
