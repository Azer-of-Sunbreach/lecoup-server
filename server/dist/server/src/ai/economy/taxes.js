"use strict";
// Taxes Module - Tax and food collection slider optimization
Object.defineProperty(exports, "__esModule", { value: true });
exports.optimizeCityTaxes = optimizeCityTaxes;
exports.optimizeRuralCollection = optimizeRuralCollection;
const types_1 = require("./types");
/**
 * Optimize city tax levels based on stability and gold needs.
 *
 * @param cities - All cities controlled by the faction
 * @param isDesperateForGold - Whether faction urgently needs gold
 */
function optimizeCityTaxes(cities, isDesperateForGold) {
    for (const city of cities) {
        const currentTaxIdx = types_1.TAX_LEVELS.indexOf(city.taxLevel || 'NORMAL');
        const currentTradeTaxIdx = types_1.TAX_LEVELS.indexOf(city.tradeTaxLevel || 'NORMAL');
        let newTaxLevel = city.taxLevel || 'NORMAL';
        let newTradeTaxLevel = city.tradeTaxLevel || 'NORMAL';
        let stabilityChange = 0;
        // Personal taxes - adjust based on stability
        if (city.stability > 80 && currentTaxIdx < 4) {
            newTaxLevel = types_1.TAX_LEVELS[currentTaxIdx + 1];
            stabilityChange -= 30;
        }
        else if (city.stability > 60 && isDesperateForGold && currentTaxIdx < 3) {
            newTaxLevel = types_1.TAX_LEVELS[currentTaxIdx + 1];
            stabilityChange -= 30;
        }
        else if (city.stability < 40 && currentTaxIdx > 0) {
            newTaxLevel = types_1.TAX_LEVELS[currentTaxIdx - 1];
            stabilityChange += 30;
        }
        let projectedStability = Math.min(100, Math.max(0, city.stability + stabilityChange));
        // Trade taxes - more conservative
        if (projectedStability > 50 && currentTradeTaxIdx < 3) {
            newTradeTaxLevel = types_1.TAX_LEVELS[currentTradeTaxIdx + 1];
            projectedStability -= 5;
        }
        else if (projectedStability < 30 && currentTradeTaxIdx > 0) {
            newTradeTaxLevel = types_1.TAX_LEVELS[currentTradeTaxIdx - 1];
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
/**
 * Optimize rural food collection levels based on stability and food needs.
 *
 * @param rurals - All rural areas controlled by the faction
 * @param isDesperateForFood - Whether faction urgently needs food
 */
function optimizeRuralCollection(rurals, isDesperateForFood) {
    for (const rural of rurals) {
        const currentCollIdx = types_1.TAX_LEVELS.indexOf(rural.foodCollectionLevel || 'NORMAL');
        let newCollLevel = rural.foodCollectionLevel || 'NORMAL';
        let stabilityChange = 0;
        if (rural.stability > 70 && currentCollIdx < 4) {
            newCollLevel = types_1.TAX_LEVELS[currentCollIdx + 1];
            stabilityChange -= 20;
        }
        else if (rural.stability > 50 && isDesperateForFood && currentCollIdx < 4) {
            newCollLevel = types_1.TAX_LEVELS[currentCollIdx + 1];
            stabilityChange -= 20;
        }
        else if (rural.stability < 40 && currentCollIdx > 0) {
            newCollLevel = types_1.TAX_LEVELS[currentCollIdx - 1];
            stabilityChange += 20;
        }
        if (newCollLevel !== rural.foodCollectionLevel) {
            rural.foodCollectionLevel = newCollLevel;
            rural.stability = Math.min(100, Math.max(0, rural.stability + stabilityChange));
        }
    }
}
