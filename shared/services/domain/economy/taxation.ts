/**
 * Taxation Service
 * Handles city management updates including grain trade embargo
 * Extracted from App.tsx handleUpdateCityManagement()
 */

import { GameState, Location, FactionId } from '../../../types';
import { calculateEconomyAndFood } from '../../../utils/economy';

export interface TaxationResult {
    success: boolean;
    newState: Partial<GameState>;
    message: string;
}

/**
 * Update city management settings (taxes, grain trade, etc.)
 */
import { applyTaxChangeResentment } from '../politics/resentmentTaxEvents';

export const executeUpdateCityManagement = (
    state: GameState,
    locId: string,
    updates: Partial<Location>
): TaxationResult => {
    let tempLocs = state.locations.map(l => {
        if (l.id !== locId) return l;

        // Apply base updates first
        let updatedLoc = { ...l, ...updates };

        // Calculate and apply resentment changes
        if ('taxLevel' in updates && updates.taxLevel) {
            updatedLoc = applyTaxChangeResentment(updatedLoc, l.taxLevel, updates.taxLevel, 'PERSONAL');
        }
        if ('tradeTaxLevel' in updates && updates.tradeTaxLevel) {
            updatedLoc = applyTaxChangeResentment(updatedLoc, l.tradeTaxLevel, updates.tradeTaxLevel, 'TRADE');
        }
        if ('foodCollectionLevel' in updates && updates.foodCollectionLevel) {
            updatedLoc = applyTaxChangeResentment(updatedLoc, l.foodCollectionLevel, updates.foodCollectionLevel, 'FOOD_COLLECTION');
        }

        return updatedLoc;
    });

    // Fix: Embargo Logic side-effects (Spec 4.1.1)
    // If Grain Trade is toggled, immediate stability hit/bonus to Windward and Great Plains
    if (locId === 'windward' && 'isGrainTradeActive' in updates) {
        const isActive = updates.isGrainTradeActive;
        const stabilityMod = isActive ? 20 : -20; // +20 if restoring, -20 if embargoing

        tempLocs = tempLocs.map(l => {
            if (l.id === 'windward' || l.id === 'great_plains') {
                const newStab = Math.min(100, Math.max(0, l.stability + stabilityMod));
                return { ...l, stability: newStab };
            }
            return l;
        });
    }

    // IMMEDIATE REACTIVITY: Recalculate economy/food for ALL locations
    tempLocs = calculateEconomyAndFood(tempLocs, state.armies, state.characters, state.roads);

    return {
        success: true,
        newState: { locations: tempLocs },
        message: 'City management updated'
    };
};
