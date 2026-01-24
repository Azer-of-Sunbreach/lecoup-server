"use strict";
/**
 * Taxation Service
 * Handles city management updates including grain trade embargo
 * Extracted from App.tsx handleUpdateCityManagement()
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeUpdateCityManagement = void 0;
const economy_1 = require("../../../utils/economy");
/**
 * Update city management settings (taxes, grain trade, etc.)
 */
const resentmentTaxEvents_1 = require("../politics/resentmentTaxEvents");
const executeUpdateCityManagement = (state, locId, updates) => {
    let tempLocs = state.locations.map(l => {
        if (l.id !== locId)
            return l;
        // Apply base updates first
        let updatedLoc = { ...l, ...updates };
        // Calculate and apply resentment changes
        if ('taxLevel' in updates && updates.taxLevel) {
            updatedLoc = (0, resentmentTaxEvents_1.applyTaxChangeResentment)(updatedLoc, l.taxLevel, updates.taxLevel, 'PERSONAL');
        }
        if ('tradeTaxLevel' in updates && updates.tradeTaxLevel) {
            updatedLoc = (0, resentmentTaxEvents_1.applyTaxChangeResentment)(updatedLoc, l.tradeTaxLevel, updates.tradeTaxLevel, 'TRADE');
        }
        if ('foodCollectionLevel' in updates && updates.foodCollectionLevel) {
            updatedLoc = (0, resentmentTaxEvents_1.applyTaxChangeResentment)(updatedLoc, l.foodCollectionLevel, updates.foodCollectionLevel, 'FOOD_COLLECTION');
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
    tempLocs = (0, economy_1.calculateEconomyAndFood)(tempLocs, state.armies, state.characters, state.roads);
    return {
        success: true,
        newState: { locations: tempLocs },
        message: 'City management updated'
    };
};
exports.executeUpdateCityManagement = executeUpdateCityManagement;
