"use strict";
// Seize Module - AI emergency requisition of food and gold
// Uses existing requisition logic from domain/economy/requisition.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSeizeActions = handleSeizeActions;
const types_1 = require("../../../types");
const data_1 = require("../../../data");
/**
 * Handle emergency seize actions for AI faction.
 *
 * Seize Food: When a city faces imminent famine (foodStock < 50 AND foodIncome < 0)
 * Seize Gold: When faction gold < 100 AND critical need (campaign active OR recruiting blocked)
 *
 * Rules:
 * - Stability must be >= 15% to seize
 * - Seize reduces stability by 15%
 * - Prioritize locations with stability > 65% for gold (>50% safety margin)
 * - 1 seize per location per turn
 *
 * @param faction - Faction executing
 * @param state - Current game state
 * @param locations - Locations array (will be modified)
 * @returns Updated locations and amounts seized
 */
function handleSeizeActions(faction, state, locations) {
    let goldGained = 0;
    let foodGained = 0;
    const logs = [];
    const myLocations = locations.filter(l => l.faction === faction);
    const factionName = types_1.FACTION_NAMES[faction];
    // 1. SEIZE FOOD - Check for starving cities
    for (const city of myLocations.filter(l => l.type === types_1.LocationType.CITY)) {
        // Famine imminent: low stock AND negative income
        const isFamineImminent = city.foodStock < 50 && city.foodIncome < 0;
        if (!isFamineImminent)
            continue;
        // Find linked rural area
        const rural = locations.find(l => l.id === city.linkedLocationId);
        if (!rural || rural.faction !== faction)
            continue;
        // Check seize eligibility
        if (rural.stability < 15)
            continue;
        if (rural.actionsTaken?.seizeFood)
            continue; // Already seized this turn
        // Execute seize
        const lIdx = locations.findIndex(l => l.id === rural.id);
        if (lIdx !== -1) {
            locations[lIdx] = {
                ...locations[lIdx],
                stability: Math.max(0, locations[lIdx].stability - data_1.REQUISITION_STABILITY_PENALTY),
                actionsTaken: {
                    ...locations[lIdx].actionsTaken,
                    seizeFood: (locations[lIdx].actionsTaken?.seizeFood || 0) + 1
                }
            };
            // Add food to city
            const cIdx = locations.findIndex(l => l.id === city.id);
            if (cIdx !== -1) {
                locations[cIdx] = {
                    ...locations[cIdx],
                    foodStock: (locations[cIdx].foodStock || 0) + data_1.REQUISITION_AMOUNT
                };
            }
            foodGained += data_1.REQUISITION_AMOUNT;
            logs.push(`${factionName} seizes food from ${rural.name} to feed ${city.name}.`);
            console.log(`[AI SEIZE ${faction}] Seized ${data_1.REQUISITION_AMOUNT} food from ${rural.name} for starving ${city.name}`);
        }
    }
    // 2. SEIZE GOLD - Check for critical gold shortage
    const currentGold = state.resources[faction].gold;
    const hasCriticalNeed = state.aiState?.[faction]?.missions?.some(m => (m.type === 'CAMPAIGN' && m.status === 'ACTIVE') ||
        (m.type === 'INSURRECTION' && m.status === 'PLANNING')) || currentGold < 50;
    if (currentGold < 100 && hasCriticalNeed) {
        // Sort cities by stability (highest first, prioritize > 65%)
        const eligibleCities = myLocations
            .filter(l => l.type === types_1.LocationType.CITY &&
            l.stability >= 65 && // User rule: > 65% for gold
            !l.actionsTaken?.seizeGold)
            .sort((a, b) => b.stability - a.stability);
        for (const city of eligibleCities) {
            if (city.stability < 15)
                continue; // Safety check
            const lIdx = locations.findIndex(l => l.id === city.id);
            if (lIdx !== -1) {
                locations[lIdx] = {
                    ...locations[lIdx],
                    stability: Math.max(0, locations[lIdx].stability - data_1.REQUISITION_STABILITY_PENALTY),
                    actionsTaken: {
                        ...locations[lIdx].actionsTaken,
                        seizeGold: (locations[lIdx].actionsTaken?.seizeGold || 0) + 1
                    }
                };
                goldGained += data_1.REQUISITION_AMOUNT;
                logs.push(`${factionName} seizes gold from ${city.name}'s treasury.`);
                console.log(`[AI SEIZE ${faction}] Seized ${data_1.REQUISITION_AMOUNT} gold from ${city.name} (stability was ${city.stability}%)`);
                // Only seize from one city per turn to limit instability
                break;
            }
        }
    }
    return { locations, goldGained, foodGained, logs };
}
