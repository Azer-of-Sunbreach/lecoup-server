/**
 * Stability Prediction Module
 * 
 * Calculates stability impact BEFORE taking destabilizing actions.
 * Ensures AI doesn't accidentally drop below faction thresholds.
 * 
 * @see stabilityManagement.ts - Threshold constants and emergency detection
 * @see taxes.ts - Tax optimization that uses this module
 * @module stabilityPredictor
 */

import { Location, Character, CharacterStatus, FactionId } from '../../../../types';
import {
    getMinimumStabilityThreshold,
    isBelowStabilityThreshold,
    STABILITY_THRESHOLDS
} from '../../economy/stabilityManagement';

// ============================================================================
// CONSTANTS - STABILITY IMPACT PER ACTION
// ============================================================================

/**
 * Stability changes for tax level modifications.
 * Positive = increase, Negative = decrease when RAISING tax level.
 */
export const TAX_STABILITY_IMPACT = {
    // Personal taxes (city)
    personalTax: {
        VERY_LOW_TO_LOW: -10,      // Raising from VERY_LOW
        LOW_TO_NORMAL: -15,
        NORMAL_TO_HIGH: -30,
        HIGH_TO_VERY_HIGH: -30,
        // Reverse (lowering)
        VERY_HIGH_TO_HIGH: +30,
        HIGH_TO_NORMAL: +30,
        NORMAL_TO_LOW: +15,
        LOW_TO_VERY_LOW: +10
    },
    // Trade taxes (city)
    tradeTax: {
        UP: -5,
        DOWN: +5
    },
    // Food collection (rural)
    foodCollection: {
        UP: -20,
        DOWN: +20
    }
} as const;

// ============================================================================
// PREDICTION FUNCTIONS
// ============================================================================

/**
 * Predict stability after changing tax level.
 * 
 * @param location - Location to check
 * @param newTaxLevel - Proposed new tax level
 * @param taxType - 'personal' | 'trade' | 'food'
 * @returns Predicted stability after change
 */
export function predictStabilityAfterTaxChange(
    location: Location,
    newTaxLevel: string,
    taxType: 'personal' | 'trade' | 'food'
): number {
    const currentLevel = getCurrentTaxLevel(location, taxType);
    if (currentLevel === newTaxLevel) return location.stability;

    const impact = calculateTaxChangeImpact(currentLevel, newTaxLevel, taxType);
    return Math.max(0, Math.min(100, location.stability + impact));
}

/**
 * Get current tax level for a location.
 */
function getCurrentTaxLevel(location: Location, taxType: 'personal' | 'trade' | 'food'): string {
    switch (taxType) {
        case 'personal':
            return location.taxLevel || 'NORMAL';
        case 'trade':
            return location.tradeTaxLevel || 'NORMAL';
        case 'food':
            return location.foodCollectionLevel || 'NORMAL';
    }
}

/**
 * Calculate stability impact of a tax change.
 */
function calculateTaxChangeImpact(
    currentLevel: string,
    newLevel: string,
    taxType: 'personal' | 'trade' | 'food'
): number {
    const levels = ['VERY_LOW', 'LOW', 'NORMAL', 'HIGH', 'VERY_HIGH'];
    const currentIdx = levels.indexOf(currentLevel);
    const newIdx = levels.indexOf(newLevel);

    if (currentIdx === -1 || newIdx === -1) return 0;

    const isRaising = newIdx > currentIdx;
    let impact = 0;

    if (taxType === 'personal') {
        // Personal taxes have specific impacts per transition
        const levelChange = Math.abs(newIdx - currentIdx);
        impact = isRaising ? -30 * levelChange : +30 * levelChange;
    } else if (taxType === 'trade') {
        const levelChange = Math.abs(newIdx - currentIdx);
        impact = isRaising ? -5 * levelChange : +5 * levelChange;
    } else {
        // Food collection
        const levelChange = Math.abs(newIdx - currentIdx);
        impact = isRaising ? -20 * levelChange : +20 * levelChange;
    }

    return impact;
}

// ============================================================================
// THRESHOLD CHECKING
// ============================================================================

/**
 * Check if a proposed tax change would drop stability below faction threshold.
 * 
 * @param location - Location to check
 * @param faction - Controlling faction
 * @param newTaxLevel - Proposed tax level
 * @param taxType - Type of tax
 * @param hasEmergency - Whether in emergency mode
 * @returns Object with allowed flag and projected stability
 */
export function canAffordTaxIncrease(
    location: Location,
    faction: FactionId,
    newTaxLevel: string,
    taxType: 'personal' | 'trade' | 'food',
    hasEmergency: boolean = false
): { allowed: boolean; projectedStability: number; threshold: number; reason?: string } {
    const projected = predictStabilityAfterTaxChange(location, newTaxLevel, taxType);
    const threshold = getMinimumStabilityThreshold(faction, hasEmergency);

    if (projected >= threshold) {
        return { allowed: true, projectedStability: projected, threshold };
    }

    // Already below threshold? Allow if it doesn't make things worse
    if (location.stability < threshold) {
        return {
            allowed: projected >= location.stability,
            projectedStability: projected,
            threshold,
            reason: 'already_below_threshold'
        };
    }

    return {
        allowed: false,
        projectedStability: projected,
        threshold,
        reason: `would_drop_below_${threshold}`
    };
}

/**
 * Find the maximum tax level that stays above threshold.
 * 
 * @param location - Location to check
 * @param faction - Controlling faction  
 * @param taxType - Type of tax
 * @param hasEmergency - Whether in emergency mode
 * @returns Maximum allowed tax level
 */
export function getMaxAllowedTaxLevel(
    location: Location,
    faction: FactionId,
    taxType: 'personal' | 'trade' | 'food',
    hasEmergency: boolean = false
): string {
    const levels = ['VERY_LOW', 'LOW', 'NORMAL', 'HIGH', 'VERY_HIGH'];
    const currentLevel = getCurrentTaxLevel(location, taxType);
    const currentIdx = levels.indexOf(currentLevel);

    // Try each level above current
    for (let i = levels.length - 1; i >= currentIdx; i--) {
        const result = canAffordTaxIncrease(location, faction, levels[i], taxType, hasEmergency);
        if (result.allowed) {
            return levels[i];
        }
    }

    return currentLevel; // Can't raise at all
}

// ============================================================================
// RECOVERY RATE CALCULATION
// ============================================================================

/**
 * Calculate how fast stability can recover at a location.
 * Factors: Governor STABILIZE_REGION, leader stabilityPerTurn, low taxes.
 * 
 * @param location - Location to check
 * @param characters - All characters
 * @returns Stability points gained per turn
 */
export function calculateRecoveryRate(
    location: Location,
    characters: Character[]
): number {
    let rate = 0;

    // Governor with STABILIZE_REGION policy
    const governor = characters.find(c =>
        c.locationId === location.id &&
        c.faction === location.faction &&
        c.status === CharacterStatus.GOVERNING
    );

    if (governor && location.governorPolicies?.STABILIZE_REGION) {
        rate += governor.stats.statesmanship || 1;
    }

    // Leader passive stabilityPerTurn
    const leadersAtLocation = characters.filter(c =>
        c.locationId === location.id &&
        c.faction === location.faction &&
        (c.status === CharacterStatus.AVAILABLE || c.status === CharacterStatus.GOVERNING)
    );

    for (const leader of leadersAtLocation) {
        if (leader.stats.stabilityPerTurn > 0) {
            rate += leader.stats.stabilityPerTurn;
        }
    }

    // Low tax recovery (passive)
    if (location.type === 'CITY' && location.taxLevel === 'VERY_LOW') {
        rate += location.stability < 25 ? 5 : (location.stability < 52 ? 3 : 0);
    }
    if (location.type === 'RURAL' && location.foodCollectionLevel === 'VERY_LOW') {
        rate += location.stability < 25 ? 4 : (location.stability < 52 ? 3 : 0);
    }

    return rate;
}

/**
 * Estimate turns needed to recover to target stability.
 * 
 * @param currentStability - Current stability
 * @param targetStability - Target stability
 * @param recoveryRate - Points per turn
 * @returns Estimated turns (Infinity if recovery rate is 0)
 */
export function estimateRecoveryTurns(
    currentStability: number,
    targetStability: number,
    recoveryRate: number
): number {
    if (currentStability >= targetStability) return 0;
    if (recoveryRate <= 0) return Infinity;

    return Math.ceil((targetStability - currentStability) / recoveryRate);
}
