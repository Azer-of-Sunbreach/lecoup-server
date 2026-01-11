// Taxes Module - Tax and food collection slider optimization

import { Location, LocationType, FactionId } from '../../../../shared/types';
import { TAX_LEVELS } from './types';

// ============================================================================
// STABILITY THRESHOLDS
// ============================================================================

/**
 * Minimum stability thresholds by faction.
 * CONSPIRATORS are more meticulous (70%), others use 50%.
 */
const STABILITY_THRESHOLDS: Record<FactionId, { normal: number; emergency: number }> = {
    [FactionId.CONSPIRATORS]: { normal: 70, emergency: 50 },
    [FactionId.REPUBLICANS]: { normal: 50, emergency: 40 },
    [FactionId.NOBLES]: { normal: 50, emergency: 40 },
    [FactionId.NEUTRAL]: { normal: 50, emergency: 40 },
};

function getMinimumStabilityThreshold(faction: FactionId, hasEmergency: boolean = false): number {
    const thresholds = STABILITY_THRESHOLDS[faction] || STABILITY_THRESHOLDS[FactionId.NEUTRAL];
    return hasEmergency ? thresholds.emergency : thresholds.normal;
}

// ============================================================================
// CITY TAX OPTIMIZATION
// ============================================================================

/**
 * Optimize city tax levels based on stability thresholds and gold needs.
 * 
 * @param cities - All cities controlled by the faction
 * @param isDesperateForGold - Whether faction urgently needs gold
 * @param faction - Faction ID for threshold lookup
 * @param hasEmergency - Whether in emergency mode
 */
export function optimizeCityTaxes(
    cities: Location[],
    isDesperateForGold: boolean,
    faction: FactionId = FactionId.NEUTRAL,
    hasEmergency: boolean = false
): void {
    const threshold = getMinimumStabilityThreshold(faction, hasEmergency);

    for (const city of cities) {
        const currentTaxIdx = TAX_LEVELS.indexOf(city.taxLevel || 'NORMAL');
        const currentTradeTaxIdx = TAX_LEVELS.indexOf(city.tradeTaxLevel || 'NORMAL');
        let newTaxLevel = city.taxLevel || 'NORMAL';
        let newTradeTaxLevel = city.tradeTaxLevel || 'NORMAL';
        let stabilityChange = 0;

        // Personal taxes - only raise if projected stays above threshold
        const projectedAfterTaxRaise = city.stability - 30;
        if (projectedAfterTaxRaise >= threshold && currentTaxIdx < 4) {
            // Only raise if stability high enough to stay above threshold after penalty
            newTaxLevel = TAX_LEVELS[currentTaxIdx + 1];
            stabilityChange -= 30;
        } else if (city.stability < threshold && currentTaxIdx > 0) {
            // Lower if below threshold (recovery mode)
            newTaxLevel = TAX_LEVELS[currentTaxIdx - 1];
            stabilityChange += 30;
        }

        let projectedStability = Math.min(100, Math.max(0, city.stability + stabilityChange));

        // Trade taxes - more conservative, only if has buffer above threshold
        const projectedAfterTradeRaise = projectedStability - 5;
        if (projectedAfterTradeRaise > threshold + 10 && currentTradeTaxIdx < 3) {
            newTradeTaxLevel = TAX_LEVELS[currentTradeTaxIdx + 1];
            projectedStability -= 5;
        } else if (projectedStability < 30 && currentTradeTaxIdx > 0) {
            newTradeTaxLevel = TAX_LEVELS[currentTradeTaxIdx - 1];
            projectedStability += 5;
        }

        // Apply changes
        if (newTaxLevel !== city.taxLevel || newTradeTaxLevel !== city.tradeTaxLevel) {
            city.taxLevel = newTaxLevel;
            city.tradeTaxLevel = newTradeTaxLevel;
            city.stability = projectedStability;
        }
    }
}

// ============================================================================
// RURAL COLLECTION OPTIMIZATION
// ============================================================================

/**
 * Optimize rural food collection levels based on stability thresholds.
 * 
 * @param rurals - All rural areas controlled by the faction
 * @param isDesperateForFood - Whether faction urgently needs food
 * @param faction - Faction ID for threshold lookup
 * @param hasEmergency - Whether in emergency mode
 */
export function optimizeRuralCollection(
    rurals: Location[],
    isDesperateForFood: boolean,
    faction: FactionId = FactionId.NEUTRAL,
    hasEmergency: boolean = false
): void {
    const threshold = getMinimumStabilityThreshold(faction, hasEmergency);

    for (const rural of rurals) {
        const currentCollIdx = TAX_LEVELS.indexOf(rural.foodCollectionLevel || 'NORMAL');
        let newCollLevel = rural.foodCollectionLevel || 'NORMAL';
        let stabilityChange = 0;

        // Only raise if projected stays above threshold
        const projectedAfterRaise = rural.stability - 20;
        if (projectedAfterRaise >= threshold && currentCollIdx < 4) {
            newCollLevel = TAX_LEVELS[currentCollIdx + 1];
            stabilityChange -= 20;
        } else if (rural.stability < threshold && currentCollIdx > 0) {
            // Lower if below threshold (recovery mode)
            newCollLevel = TAX_LEVELS[currentCollIdx - 1];
            stabilityChange += 20;
        }

        if (newCollLevel !== rural.foodCollectionLevel) {
            rural.foodCollectionLevel = newCollLevel;
            rural.stability = Math.min(100, Math.max(0, rural.stability + stabilityChange));
        }
    }
}
