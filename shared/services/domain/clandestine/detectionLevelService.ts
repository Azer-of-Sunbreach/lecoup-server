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

import { Character, Location, FactionId, CharacterStatus } from '../../../types';
import { CLANDESTINE_ACTIONS, ClandestineActionId, ActiveClandestineAction } from '../../../types/clandestineTypes';
import { GovernorPolicy } from '../../../types/governorTypes';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Base detection threshold (for stealthLevel = 0, though minimum is 1) */
const BASE_THRESHOLD = 20;

/** Threshold bonus per stealth level point */
const THRESHOLD_PER_STEALTH = 10;

/** Capture risk bonus from PARANOID governor */
const PARANOID_CAPTURE_BONUS = 15;

/** Default stealth level if not set on character */
const DEFAULT_STEALTH_LEVEL = 2;

// ============================================================================
// DETECTION THRESHOLD CALCULATION
// ============================================================================

/**
 * Calculate the detection threshold for a leader.
 * Formula: 20 + (10 × stealthLevel)
 * Uses the leader's discretion stat (1-5) as the stealth level.
 * 
 * @param leader - The clandestine agent
 * @param location - The location where the agent is operating (for HUNT_NETWORKS check)
 * @returns The effective detection threshold
 */
export function calculateDetectionThreshold(
    leader: Character,
    location: Location
): number {
    // Use discretion stat as stealth level (both are 1-5 scale)
    // Fall back to stealthLevel if explicitly set, otherwise use discretion
    const stealthLevel = leader.stealthLevel ?? leader.stats?.discretion ?? DEFAULT_STEALTH_LEVEL;
    const baseThreshold = BASE_THRESHOLD + (THRESHOLD_PER_STEALTH * stealthLevel);

    // HUNT_NETWORKS halves the threshold
    const isHuntNetworksActive = location.governorPolicies?.[GovernorPolicy.HUNT_NETWORKS] === true;

    return isHuntNetworksActive ? Math.floor(baseThreshold / 2) : baseThreshold;
}

/**
 * Get the base threshold without HUNT_NETWORKS modifier.
 * Useful for displaying "normal" vs "reduced" threshold.
 */
export function getBaseDetectionThreshold(leader: Character): number {
    const stealthLevel = leader.stealthLevel ?? leader.stats?.discretion ?? DEFAULT_STEALTH_LEVEL;
    return BASE_THRESHOLD + (THRESHOLD_PER_STEALTH * stealthLevel);
}

// ============================================================================
// CAPTURE RISK CALCULATION
// ============================================================================

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
export function calculateCaptureRisk(
    leader: Character,
    location: Location,
    governor: Character | undefined
): number {
    const detectionLevel = leader.detectionLevel ?? 0;
    const threshold = calculateDetectionThreshold(leader, location);

    // Base risk from exceeding threshold
    let risk = Math.max(0, detectionLevel - threshold);

    // PARANOID governor adds flat 15%
    const isParanoidGovernor = governor?.stats?.ability?.includes('PARANOID') ?? false;
    if (isParanoidGovernor) {
        risk += PARANOID_CAPTURE_BONUS;
    }

    return risk;
}

/**
 * Check if the leader's detection level has exceeded the threshold.
 */
export function isThresholdExceeded(leader: Character, location: Location): boolean {
    const detectionLevel = leader.detectionLevel ?? 0;
    const threshold = calculateDetectionThreshold(leader, location);
    return detectionLevel >= threshold;
}

// ============================================================================
// DETECTION LEVEL UPDATES
// ============================================================================

/**
 * Calculate the detection level increase from active actions.
 * Only counts actions with detectionType === 'per_turn'.
 * 
 * @param actions - Active clandestine actions
 * @returns Total detection increase to apply this turn
 */
export function calculateTurnDetectionIncrease(
    actions: ActiveClandestineAction[]
): number {
    let totalIncrease = 0;

    for (const action of actions) {
        const actionDef = CLANDESTINE_ACTIONS[action.actionId as ClandestineActionId];
        if (actionDef && actionDef.detectionType === 'per_turn') {
            totalIncrease += actionDef.detectionIncrease;
        }
    }

    return totalIncrease;
}

/**
 * Apply detection level increase from a one-time action.
 * Called when a one-time action is first activated.
 * 
 * @param leader - The leader to update
 * @param actionId - The one-time action being activated
 * @returns Updated leader with increased detection level
 */
export function applyOneTimeDetectionIncrease(
    leader: Character,
    actionId: ClandestineActionId
): Character {
    const actionDef = CLANDESTINE_ACTIONS[actionId];
    if (!actionDef || actionDef.detectionType !== 'one_time') {
        return leader;
    }

    const currentLevel = leader.detectionLevel ?? 0;
    return {
        ...leader,
        detectionLevel: currentLevel + actionDef.detectionIncrease
    };
}

/**
 * Apply per-turn detection level increases for all active actions.
 * Called during turn processing.
 * 
 * @param leader - The leader to update
 * @returns Updated leader with increased detection level
 */
export function applyTurnDetectionIncrease(leader: Character): Character {
    const actions = leader.activeClandestineActions ?? [];
    const increase = calculateTurnDetectionIncrease(actions);

    if (increase === 0) {
        return leader;
    }

    const currentLevel = leader.detectionLevel ?? 0;
    return {
        ...leader,
        detectionLevel: currentLevel + increase
    };
}

// ============================================================================
// UI HELPERS
// ============================================================================

/**
 * Get the color class for the detection gauge based on current level vs threshold.
 * 
 * @param detectionLevel - Current detection level
 * @param threshold - Current detection threshold
 * @returns 'green' | 'orange' | 'red'
 */
export function getDetectionGaugeColor(
    detectionLevel: number,
    threshold: number
): 'green' | 'orange' | 'red' {
    if (detectionLevel === 0) return 'green';
    if (detectionLevel < threshold) return 'orange';
    return 'red';
}

/**
 * Calculate the gauge fill percentage (capped at 100%).
 */
export function getDetectionGaugeFill(
    detectionLevel: number,
    threshold: number
): number {
    if (threshold <= 0) return 100;
    return Math.min(100, (detectionLevel / threshold) * 100);
}

// ============================================================================
// EFFECT TIMING HELPERS
// ============================================================================

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
export function shouldEffectsApply(
    leader: Character,
    isAIControlled: boolean
): { paranoidApplies: boolean; huntNetworksApplies: boolean } {
    // AI players are immediately notified
    if (isAIControlled) {
        return {
            paranoidApplies: true,
            huntNetworksApplies: true
        };
    }

    // Human players need to have been notified
    const effects = leader.pendingDetectionEffects;
    return {
        paranoidApplies: effects?.paranoidGovernorNotified ?? false,
        huntNetworksApplies: effects?.huntNetworksNotified ?? false
    };
}

/**
 * Mark effects as notified after player sees the alert modal.
 */
export function markEffectsNotified(
    leader: Character,
    options: {
        paranoid?: boolean;
        huntNetworks?: boolean;
        thresholdExceeded?: boolean;
    }
): Character {
    const current = leader.pendingDetectionEffects ?? {};

    return {
        ...leader,
        pendingDetectionEffects: {
            ...current,
            paranoidGovernorNotified: options.paranoid ?? current.paranoidGovernorNotified,
            huntNetworksNotified: options.huntNetworks ?? current.huntNetworksNotified,
            thresholdExceededNotified: options.thresholdExceeded ?? current.thresholdExceededNotified
        }
    };
}

/**
 * Clear all pending detection effects (e.g., when leader leaves the location).
 */
export function clearPendingDetectionEffects(leader: Character): Character {
    return {
        ...leader,
        pendingDetectionEffects: undefined
    };
}

// ============================================================================
// DETECTION LEVEL RESET LOGIC
// ============================================================================



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
export function shouldResetDetectionLevel(
    oldStatus: CharacterStatus,
    newStatus: CharacterStatus,
    oldLocationId: string,
    newLocationId: string
): boolean {
    const clandestineStatuses = [CharacterStatus.UNDERCOVER, CharacterStatus.ON_MISSION];
    const wasUndercover = clandestineStatuses.includes(oldStatus);
    const stillUndercover = clandestineStatuses.includes(newStatus);

    // Case 1: Leaving clandestine status (e.g., becoming MOVING, AVAILABLE, GOVERNING, DEAD)
    if (wasUndercover && !stillUndercover) {
        return true;
    }

    // Case 2: Changing location while clandestine (e.g., LOCAL road instant travel)
    if (wasUndercover && oldLocationId !== newLocationId) {
        return true;
    }

    return false;
}

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
export function applyDetectionLevelReset(
    leader: Character,
    oldStatus: CharacterStatus,
    newStatus: CharacterStatus,
    oldLocationId: string,
    newLocationId: string
): Character {
    if (shouldResetDetectionLevel(oldStatus, newStatus, oldLocationId, newLocationId)) {
        return {
            ...leader,
            detectionLevel: 0,
            pendingDetectionEffects: undefined // Also clear any pending effects
        };
    }
    return leader;
}
