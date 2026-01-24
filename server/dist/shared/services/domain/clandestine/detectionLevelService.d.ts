/**
 * Detection Level Service
 *
 * Core service for the detection level system that replaces the old capture risk mechanics.
 *
 * Key Concepts:
 * - Detection Level: Starts at 0, increases with clandestine actions
 * - Detection Threshold: 20 + (10 × stealthLevel), halved by HUNT_NETWORKS
 * - Capture Risk: (detectionLevel - threshold) when over threshold, + PARANOID bonus
 *
 * @module shared/services/domain/clandestine/detectionLevelService
 */
import { Character, Location, CharacterStatus } from '../../../types';
import { ClandestineActionId, ActiveClandestineAction } from '../../../types/clandestineTypes';
/**
 * Calculate the detection threshold for a leader.
 * Formula: 20 + (10 × stealthLevel)
 * Uses the leader's discretion stat (1-5) as the stealth level.
 *
 * @param leader - The clandestine agent
 * @param location - The location where the agent is operating (for HUNT_NETWORKS check)
 * @returns The effective detection threshold
 */
export declare function calculateDetectionThreshold(leader: Character, location: Location): number;
/**
 * Get the base threshold without HUNT_NETWORKS modifier.
 * Useful for displaying "normal" vs "reduced" threshold.
 */
export declare function getBaseDetectionThreshold(leader: Character): number;
/**
 * Calculate the capture risk percentage for a leader.
 *
 * Risk = (detectionLevel - effectiveThreshold) + PARANOID bonus
 * Only applies when detection level exceeds threshold OR PARANOID governor present.
 *
 * @param leader - The clandestine agent
 * @param location - The location where agent operates
 * @param governor - The governor of the location (if any)
 * @returns Capture risk as percentage (0-100+)
 */
export declare function calculateCaptureRisk(leader: Character, location: Location, governor: Character | undefined): number;
/**
 * Check if the leader's detection level has exceeded the threshold.
 */
export declare function isThresholdExceeded(leader: Character, location: Location): boolean;
/**
 * Calculate the detection level increase from active actions.
 * Only counts actions with detectionType === 'per_turn'.
 *
 * @param actions - Active clandestine actions
 * @returns Total detection increase to apply this turn
 */
export declare function calculateTurnDetectionIncrease(actions: ActiveClandestineAction[]): number;
/**
 * Apply detection level increase from a one-time action.
 * Called when a one-time action is first activated.
 *
 * @param leader - The leader to update
 * @param actionId - The one-time action being activated
 * @returns Updated leader with increased detection level
 */
export declare function applyOneTimeDetectionIncrease(leader: Character, actionId: ClandestineActionId): Character;
/**
 * Apply per-turn detection level increases for all active actions.
 * Called during turn processing.
 *
 * @param leader - The leader to update
 * @returns Updated leader with increased detection level
 */
export declare function applyTurnDetectionIncrease(leader: Character): Character;
/**
 * Get the color class for the detection gauge based on current level vs threshold.
 *
 * @param detectionLevel - Current detection level
 * @param threshold - Current detection threshold
 * @returns 'green' | 'orange' | 'red'
 */
export declare function getDetectionGaugeColor(detectionLevel: number, threshold: number): 'green' | 'orange' | 'red';
/**
 * Calculate the gauge fill percentage (capped at 100%).
 */
export declare function getDetectionGaugeFill(detectionLevel: number, threshold: number): number;
/**
 * Check if PARANOID/HUNT_NETWORKS effects should apply for capture roll.
 * Effects only apply after the player has been notified (acknowledged).
 *
 * For AI players, effects are considered immediately acknowledged.
 *
 * @param leader - The clandestine agent
 * @param isAIControlled - Whether the agent's faction is AI-controlled
 * @returns Object with boolean flags for each effect
 */
export declare function shouldEffectsApply(leader: Character, isAIControlled: boolean): {
    paranoidApplies: boolean;
    huntNetworksApplies: boolean;
};
/**
 * Mark effects as notified after player sees the alert modal.
 */
export declare function markEffectsNotified(leader: Character, options: {
    paranoid?: boolean;
    huntNetworks?: boolean;
    thresholdExceeded?: boolean;
}): Character;
/**
 * Clear all pending detection effects (e.g., when leader leaves the location).
 */
export declare function clearPendingDetectionEffects(leader: Character): Character;
/**
 * Determine whether a leader's detection level should reset to 0.
 *
 * Reset occurs when:
 * 1. Status changes FROM clandestine (UNDERCOVER/ON_MISSION) TO non-clandestine
 * 2. LocationId changes while IN clandestine status (e.g., LOCAL road instant travel)
 *
 * Does NOT reset when:
 * - Switching between UNDERCOVER and ON_MISSION (same region, still clandestine)
 *
 * @param oldStatus - Previous status
 * @param newStatus - New status
 * @param oldLocationId - Previous location ID
 * @param newLocationId - New location ID
 * @returns true if detectionLevel should be reset to 0
 */
export declare function shouldResetDetectionLevel(oldStatus: CharacterStatus, newStatus: CharacterStatus, oldLocationId: string, newLocationId: string): boolean;
/**
 * Apply detection level reset if conditions are met.
 * Returns updated character with detectionLevel set to 0 if reset is needed.
 *
 * @param leader - The character being updated
 * @param oldStatus - Previous status
 * @param newStatus - New status
 * @param oldLocationId - Previous location ID
 * @param newLocationId - New location ID
 * @returns Updated character (potentially with detectionLevel: 0)
 */
export declare function applyDetectionLevelReset(leader: Character, oldStatus: CharacterStatus, newStatus: CharacterStatus, oldLocationId: string, newLocationId: string): Character;
