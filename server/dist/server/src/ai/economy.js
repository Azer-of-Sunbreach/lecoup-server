"use strict";
// AI Economy Management - Main orchestrator
// Refactored to use modular components
Object.defineProperty(exports, "__esModule", { value: true });
exports.manageEconomy = void 0;
const types_1 = require("../../../shared/types");
// Import from new modular structure
const index_1 = require("./economy/index");
/**
 * Main economy management function for AI factions.
 *
 * Handles:
 * - Budget allocation and overrides
 * - Tax and food collection optimization
 * - Emergency seize actions (food/gold)
 * - Grain embargo (Windward special)
 * - Food logistics (convoys)
 * - Troop recruitment
 * - Fortification building
 *
 * @param state - Current game state
 * @param faction - Faction to process
 * @param profile - Faction personality
 * @param budget - AI budget allocation
 * @returns Partial state update
 */
const manageEconomy = (state, faction, profile, budget) => {
    let updates = {
        locations: [...state.locations],
        resources: { ...state.resources },
        convoys: [...state.convoys],
        navalConvoys: [...state.navalConvoys],
        armies: [...state.armies],
        roads: [...state.roads],
        logs: [...state.logs]
    };
    // BUDGET OVERRIDES
    (0, index_1.applyRepublicanEarlyGameOverride)(faction, state.turn, budget);
    (0, index_1.applyWeakArmyOverride)(faction, updates.armies, budget);
    (0, index_1.allocateSiegeBudget)(faction, state, budget);
    // FIX: Track spending, don't rewrite treasury
    // The treasury income is added by turnProcessor, we just need to track spending here
    let spentGold = 0;
    const treasuryGold = budget.total; // Actual treasury at start
    const isDesperateForGold = treasuryGold < 100;
    // 1. SLIDER OPTIMIZATION
    const myCities = updates.locations.filter(l => l.faction === faction && l.type === types_1.LocationType.CITY);
    const myRurals = updates.locations.filter(l => l.faction === faction && l.type === types_1.LocationType.RURAL);
    const globalFoodNet = myCities.reduce((sum, c) => sum + c.foodIncome, 0);
    const isDesperateForFood = globalFoodNet < -10;
    (0, index_1.optimizeCityTaxes)(myCities, isDesperateForGold);
    (0, index_1.optimizeRuralCollection)(myRurals, isDesperateForFood);
    // 2. EMERGENCY SEIZE ACTIONS (before logistics to secure resources)
    const seizeResult = (0, index_1.handleSeizeActions)(faction, state, updates.locations);
    updates.locations = seizeResult.locations;
    // Add seize logs to game logs
    if (seizeResult.logs.length > 0) {
        updates.logs.push(...seizeResult.logs);
    }
    // Seize gold is added directly to resources
    if (seizeResult.goldGained > 0) {
        updates.resources[faction].gold += seizeResult.goldGained;
    }
    // 3. GRAIN EMBARGO
    const embargoResult = (0, index_1.handleGrainEmbargo)(state, faction, profile, updates.locations);
    updates.logs.push(...embargoResult.logs);
    if (embargoResult.grainTradeNotification) {
        updates.grainTradeNotification = embargoResult.grainTradeNotification;
    }
    // 4. LOGISTICS
    const logisticsResult = (0, index_1.manageLogistics)(state, faction, updates.locations, updates.convoys, updates.navalConvoys);
    updates.locations = logisticsResult.locations;
    updates.convoys = logisticsResult.convoys;
    updates.navalConvoys = logisticsResult.navalConvoys;
    // 5. RECRUITMENT - Track amount spent
    const goldBeforeRecruitment = treasuryGold - spentGold;
    const goldAfterRecruitment = (0, index_1.handleRecruitment)(faction, updates.locations, updates.armies, budget, profile, state.turn, goldBeforeRecruitment);
    spentGold += (goldBeforeRecruitment - goldAfterRecruitment);
    // 6. FORTIFICATIONS - Track amount spent
    const goldBeforeFortifications = goldAfterRecruitment;
    const goldAfterFortifications = (0, index_1.handleFortifications)(faction, updates.locations, updates.roads, updates.armies, budget, profile, goldBeforeFortifications);
    spentGold += (goldBeforeFortifications - goldAfterFortifications);
    // Subtract AI spending from treasury
    // Note: Income is added by turnProcessor separately, we just track spending here
    if (spentGold > 0) {
        updates.resources[faction].gold = Math.max(0, updates.resources[faction].gold - spentGold);
    }
    return updates;
};
exports.manageEconomy = manageEconomy;
