/**
 * AI Stability Management Module
 * 
 * Handles:
 * - VERY_HIGH tax/collection detection and auto-reduction when no leader present
 * - Faction-specific stability thresholds (CONSPIRATORS: 60%, others: 50%)
 * - Emergency mode detection for threshold exceptions
 * 
 * @see shared/services/domain/clandestine/insurrectionFormulas.ts - Formulas
 * @see Application/services/ai/strategy/insurrectionDefense.ts - Threat detection
 * @module stabilityManagement
 */

import { Location, Character, CharacterStatus, FactionId, Army } from '../../../../types';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Minimum stability thresholds by faction.
 * CONSPIRATORS are more meticulous (70%), others use 50%.
 */
export const STABILITY_THRESHOLDS = {
    [FactionId.CONSPIRATORS]: {
        normal: 70,
        emergency: 50
    },
    [FactionId.REPUBLICANS]: {
        normal: 50,
        emergency: 40
    },
    [FactionId.NOBLES]: {
        normal: 50,
        emergency: 40
    },
    [FactionId.NEUTRAL]: {
        normal: 50,
        emergency: 40
    }
} as const;

// ============================================================================
// VERY_HIGH DETECTION & ENFORCEMENT
// ============================================================================

/**
 * Check if a location has VERY_HIGH taxes/collection without a leader.
 * This causes stability drain per turn and should be corrected.
 * 
 * @param location - Location to check
 * @param characters - All characters
 * @param faction - Controlling faction
 * @returns True if VERY_HIGH without leader
 */
export function hasVeryHighWithoutLeader(
    location: Location,
    characters: Character[],
    faction: FactionId
): boolean {
    // Check if any VERY_HIGH setting is active
    const hasVeryHigh = (
        (location.type === 'CITY' && location.taxLevel === 'VERY_HIGH') ||
        (location.type === 'CITY' && location.tradeTaxLevel === 'VERY_HIGH') ||
        (location.type === 'RURAL' && location.foodCollectionLevel === 'VERY_HIGH')
    );

    if (!hasVeryHigh) return false;

    // Check if a leader of the faction is present
    const hasLeader = characters.some(c =>
        c.faction === faction &&
        c.locationId === location.id &&
        (c.status === CharacterStatus.AVAILABLE || c.status === CharacterStatus.GOVERNING)
    );

    return !hasLeader;
}

/**
 * Reduce VERY_HIGH settings to HIGH for a location.
 * Called when no leader is present to prevent stability drain.
 * 
 * @param location - Location to modify (mutated in place)
 * @returns True if any changes were made
 */
export function reduceVeryHighToHigh(location: Location): boolean {
    let changed = false;

    if (location.type === 'CITY') {
        if (location.taxLevel === 'VERY_HIGH') {
            location.taxLevel = 'HIGH';
            location.stability = Math.min(100, location.stability + 30); // Refund stability
            changed = true;
        }
        if (location.tradeTaxLevel === 'VERY_HIGH') {
            location.tradeTaxLevel = 'HIGH';
            location.stability = Math.min(100, location.stability + 5); // Refund stability
            changed = true;
        }
    }

    if (location.type === 'RURAL') {
        if (location.foodCollectionLevel === 'VERY_HIGH') {
            location.foodCollectionLevel = 'HIGH';
            location.stability = Math.min(100, location.stability + 20); // Refund stability
            changed = true;
        }
    }

    return changed;
}

/**
 * Enforce HIGH tax limits for all locations without leaders.
 * Main entry point for AI stability management.
 * 
 * @param faction - Faction to process
 * @param locations - All locations (mutated in place)
 * @param characters - All characters
 * @returns List of locations that were modified
 */
export function enforceHighTaxLimits(
    faction: FactionId,
    locations: Location[],
    characters: Character[]
): string[] {
    const modifiedLocations: string[] = [];

    const ownedLocations = locations.filter(l => l.faction === faction);

    for (const location of ownedLocations) {
        if (hasVeryHighWithoutLeader(location, characters, faction)) {
            if (reduceVeryHighToHigh(location)) {
                modifiedLocations.push(location.name);
                console.log(`[AI STABILITY-MGMT ${faction}] Reduced VERY_HIGH to HIGH in ${location.name} (no leader)`);
            }
        }
    }

    return modifiedLocations;
}

// ============================================================================
// STABILITY THRESHOLD CHECKING
// ============================================================================

/**
 * Get minimum stability threshold for a faction.
 * 
 * @param faction - Faction to check
 * @param hasEmergency - True if in emergency mode (enemy attack, famine, etc.)
 * @returns Minimum stability threshold (0-100)
 */
export function getMinimumStabilityThreshold(
    faction: FactionId,
    hasEmergency: boolean = false
): number {
    const thresholds = STABILITY_THRESHOLDS[faction] || STABILITY_THRESHOLDS[FactionId.NEUTRAL];
    return hasEmergency ? thresholds.emergency : thresholds.normal;
}

/**
 * Check if a location's stability is below faction threshold.
 * 
 * @param location - Location to check
 * @param faction - Faction to check against
 * @param hasEmergency - True if in emergency mode
 * @returns True if below threshold
 */
export function isBelowStabilityThreshold(
    location: Location,
    faction: FactionId,
    hasEmergency: boolean = false
): boolean {
    const threshold = getMinimumStabilityThreshold(faction, hasEmergency);
    return location.stability < threshold;
}

// ============================================================================
// EMERGENCY DETECTION
// ============================================================================

/**
 * Detect if a faction is in emergency mode.
 * Emergencies allow dropping below normal stability thresholds.
 * 
 * Types of emergencies:
 * - Famine threat (city food stock <= 0 or very low)
 * - Enemy army approaching
 * - Insurrection imminent (turns remaining <= 1)
 * 
 * @param faction - Faction to check
 * @param locations - All locations
 * @param armies - All armies
 * @returns True if emergency detected
 */
export function detectEmergency(
    faction: FactionId,
    locations: Location[],
    armies: Army[]
): boolean {
    const ownedLocations = locations.filter(l => l.faction === faction);

    // Check for famine threat
    const hasFamineThreat = ownedLocations.some(l =>
        l.type === 'CITY' && (l.foodStock || 0) <= 500
    );
    if (hasFamineThreat) return true;

    // Check for enemy armies in our territory or adjacent
    const hasEnemyThreat = armies.some(a => {
        if (a.faction === faction || a.faction === FactionId.NEUTRAL) return false;
        if (a.locationType !== 'LOCATION') return false;

        const location = locations.find(l => l.id === a.locationId);
        if (!location) return false;

        // Enemy in our territory
        if (location.faction === faction) return true;

        // Enemy in territory adjacent to ours (check linked locations)
        if (location.linkedLocationId) {
            const linked = locations.find(l => l.id === location.linkedLocationId);
            if (linked && linked.faction === faction) return true;
        }

        return false;
    });
    if (hasEnemyThreat) return true;

    return false;
}

// ============================================================================
// STABILIZATION VALUE ASSESSMENT
// ============================================================================

/**
 * Evaluate if spending resources on stabilization is worth it.
 * Compares cost of stabilization vs cost of losing territory to insurrection.
 * 
 * @param location - Location to evaluate
 * @param estimatedInsurgents - Estimated insurgent count if no stabilization
 * @param stabilityGainPerAction - How much stability we can gain per action
 * @param insurgentReductionPerStability - How many fewer insurgents per +1 stability
 * @returns True if stabilization is worthwhile
 */
export function evaluateStabilizationValue(
    location: Location,
    estimatedInsurgents: number,
    stabilityGainPerAction: number = 10,
    insurgentReductionPerStability: number = 10
): boolean {
    // If we can reduce insurgents significantly, it's worth it
    const potentialReduction = stabilityGainPerAction * insurgentReductionPerStability;

    // Worth it if we can reduce by 30% or more
    return potentialReduction >= estimatedInsurgents * 0.3;
}

// ============================================================================
// TAX OPTIMIZATION FOR STABILITY
// ============================================================================

/**
 * Calculate how much stability can be gained by reducing taxes.
 * 
 * Personal taxes: +30 per level reduction
 * Trade taxes: +5 per level reduction
 * Food collection: +20 per level reduction
 * 
 * @param location - Location to check
 * @returns Maximum stability gain possible
 */
export function calculatePotentialStabilityGain(location: Location): number {
    let gain = 0;

    if (location.type === 'CITY') {
        // Personal taxes
        const taxLevel = location.taxLevel || 'NORMAL';
        if (taxLevel === 'VERY_HIGH') gain += 60; // 2 levels
        else if (taxLevel === 'HIGH') gain += 30;

        // Trade taxes
        const tradeTaxLevel = location.tradeTaxLevel || 'NORMAL';
        if (tradeTaxLevel === 'VERY_HIGH') gain += 10;
        else if (tradeTaxLevel === 'HIGH') gain += 5;
    }

    if (location.type === 'RURAL') {
        const collLevel = location.foodCollectionLevel || 'NORMAL';
        if (collLevel === 'VERY_HIGH') gain += 40; // 2 levels
        else if (collLevel === 'HIGH') gain += 20;
    }

    return gain;
}
