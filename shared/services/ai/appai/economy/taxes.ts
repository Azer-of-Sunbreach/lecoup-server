/**
 * Taxes Module - Tax and food collection slider optimization
 * 
 * Uses faction-aware stability thresholds and prediction to avoid
 * destabilizing territories below safe levels.
 * 
 * @see stabilityPredictor.ts - Prediction functions
 * @see stabilityManagement.ts - Threshold constants
 * @module taxes
 */

import { Location, LocationType, FactionId } from '../../../../types';
import { TAX_LEVELS } from './types';
import {
    canAffordTaxIncrease,
    getMaxAllowedTaxLevel,
    predictStabilityAfterTaxChange
} from './stabilityPredictor';
import { getMinimumStabilityThreshold } from '../../economy/stabilityManagement';

/**
 * Optimize city tax levels based on stability thresholds and gold needs.
 * 
 * Logic:
 * 1. If stability high enough, consider raising taxes
 * 2. Check if raise would drop below faction threshold
 * 3. If allowed, raise. If not, lower instead if below threshold
 * 
 * @param cities - All cities controlled by the faction
 * @param isDesperateForGold - Whether faction urgently needs gold
 * @param faction - Faction ID for threshold lookup
 * @param hasEmergency - Whether in emergency mode (allows lower thresholds)
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

        // =====================================================================
        // PERSONAL TAXES
        // =====================================================================

        // Try to raise taxes if we have room
        if (currentTaxIdx < 4) { // Not at VERY_HIGH
            const candidateLevel = TAX_LEVELS[currentTaxIdx + 1];
            const result = canAffordTaxIncrease(city, faction, candidateLevel, 'personal', hasEmergency);

            // Conditions for raising:
            // - Projected stays above threshold AND
            // - (stability > 80) OR (stability > threshold + 10 and desperate)
            const comfortBuffer = hasEmergency ? 5 : 15;
            const hasBuffer = city.stability > threshold + comfortBuffer;

            if (result.allowed && (city.stability > 80 || (hasBuffer && isDesperateForGold))) {
                newTaxLevel = candidateLevel;
                console.log(`[AI TAX ${faction}] ${city.name}: Raising personal tax to ${candidateLevel} (${city.stability}% → ${result.projectedStability}%)`);
            }
        }

        // Lower taxes if below threshold (recovery mode)
        if (city.stability < threshold && currentTaxIdx > 0) {
            newTaxLevel = TAX_LEVELS[currentTaxIdx - 1];
            console.log(`[AI TAX ${faction}] ${city.name}: Lowering personal tax to ${newTaxLevel} (recovery: ${city.stability}% < ${threshold}%)`);
        }

        // =====================================================================
        // TRADE TAXES (more conservative)
        // =====================================================================

        // Calculate projected stability after personal tax change
        const projectedAfterPersonal = predictStabilityAfterTaxChange(
            { ...city, taxLevel: newTaxLevel } as Location,
            city.tradeTaxLevel || 'NORMAL',
            'trade'
        );

        if (currentTradeTaxIdx < 3 && projectedAfterPersonal > threshold + 10) { // Max HIGH, not VERY_HIGH
            const candidateTradeLevel = TAX_LEVELS[currentTradeTaxIdx + 1];
            const result = canAffordTaxIncrease(
                { ...city, taxLevel: newTaxLevel, stability: projectedAfterPersonal } as Location,
                faction,
                candidateTradeLevel,
                'trade',
                hasEmergency
            );

            if (result.allowed && projectedAfterPersonal > 50) {
                newTradeTaxLevel = candidateTradeLevel;
            }
        } else if (projectedAfterPersonal < 30 && currentTradeTaxIdx > 0) {
            newTradeTaxLevel = TAX_LEVELS[currentTradeTaxIdx - 1];
        }

        // =====================================================================
        // APPLY CHANGES
        // =====================================================================

        if (newTaxLevel !== city.taxLevel || newTradeTaxLevel !== city.tradeTaxLevel) {
            // Calculate total stability change
            let stabilityChange = 0;

            // Personal tax change
            const oldTaxIdx = TAX_LEVELS.indexOf(city.taxLevel || 'NORMAL');
            const newTaxIdx = TAX_LEVELS.indexOf(newTaxLevel);
            stabilityChange += (oldTaxIdx - newTaxIdx) * 30; // +30 per level lowered, -30 per level raised

            // Trade tax change
            const oldTradeIdx = TAX_LEVELS.indexOf(city.tradeTaxLevel || 'NORMAL');
            const newTradeIdx = TAX_LEVELS.indexOf(newTradeTaxLevel);
            stabilityChange += (oldTradeIdx - newTradeIdx) * 5;

            city.taxLevel = newTaxLevel;
            city.tradeTaxLevel = newTradeTaxLevel;
            city.stability = Math.min(100, Math.max(0, city.stability + stabilityChange));
        }
    }
}

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

        // Try to raise collection
        if (currentCollIdx < 4) {
            const candidateLevel = TAX_LEVELS[currentCollIdx + 1];
            const result = canAffordTaxIncrease(rural, faction, candidateLevel, 'food', hasEmergency);

            const comfortBuffer = hasEmergency ? 5 : 15;
            const hasBuffer = rural.stability > threshold + comfortBuffer;

            if (result.allowed && (rural.stability > 70 || (hasBuffer && isDesperateForFood))) {
                newCollLevel = candidateLevel;
                console.log(`[AI TAX ${faction}] ${rural.name}: Raising food collection to ${candidateLevel}`);
            }
        }

        // Lower collection if below threshold (recovery mode)
        if (rural.stability < threshold && currentCollIdx > 0) {
            newCollLevel = TAX_LEVELS[currentCollIdx - 1];
            console.log(`[AI TAX ${faction}] ${rural.name}: Lowering food collection to ${newCollLevel} (recovery)`);
        }

        // Apply changes
        if (newCollLevel !== rural.foodCollectionLevel) {
            const oldIdx = TAX_LEVELS.indexOf(rural.foodCollectionLevel || 'NORMAL');
            const newIdx = TAX_LEVELS.indexOf(newCollLevel);
            const stabilityChange = (oldIdx - newIdx) * 20;

            rural.foodCollectionLevel = newCollLevel;
            rural.stability = Math.min(100, Math.max(0, rural.stability + stabilityChange));
        }
    }
}
