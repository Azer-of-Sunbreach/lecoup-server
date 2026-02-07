// AI Economy Management - Main orchestrator
// Refactored to use modular components

import { GameState, FactionId, LocationType } from '../../../shared/types';
import { AIBudget, FactionPersonality } from './types';
import { getInsurrectionAlerts, InsurrectionAlert } from '../../../shared/services/ai/strategy';

// Import from new modular structure
import {
    applyRepublicanEarlyGameOverride,
    applyWeakArmyOverride,
    allocateSiegeBudget,
    calculateAvailableGold,
    optimizeCityTaxes,
    optimizeRuralCollection,
    handleGrainEmbargo,
    manageLogistics,
    handleRecruitment,
    handleFortifications,
    handleSeizeActions
} from './economy/index';

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
 * @param externalInsurrectionAlerts - Optional pre-computed alerts (avoids double calculation)
 * @returns Partial state update
 */
export const manageEconomy = (
    state: GameState,
    faction: FactionId,
    profile: FactionPersonality,
    budget: AIBudget,
    externalInsurrectionAlerts?: InsurrectionAlert[]
): Partial<GameState> => {
    let updates: Partial<GameState> = {
        locations: [...state.locations],
        resources: { ...state.resources },
        convoys: [...state.convoys],
        navalConvoys: [...state.navalConvoys],
        armies: [...state.armies],
        roads: [...state.roads],
        characters: [...state.characters],
        logs: [...state.logs]
    };

    // BUDGET OVERRIDES
    applyRepublicanEarlyGameOverride(faction, state.turn, budget);
    applyWeakArmyOverride(faction, updates.armies!, budget);
    allocateSiegeBudget(faction, state, budget);

    // FIX: Track spending, don't rewrite treasury
    // The treasury income is added by turnProcessor, we just need to track spending here
    let spentGold = 0;
    const treasuryGold = budget.total; // Actual treasury at start
    const isDesperateForGold = treasuryGold < 100;

    // 1. SLIDER OPTIMIZATION
    const myCities = updates.locations!.filter(l =>
        l.faction === faction && l.type === LocationType.CITY
    );
    const myRurals = updates.locations!.filter(l =>
        l.faction === faction && l.type === LocationType.RURAL
    );

    const globalFoodNet = myCities.reduce((sum, c) => sum + c.foodIncome, 0);
    const isDesperateForFood = globalFoodNet < -10;

    optimizeCityTaxes(myCities, isDesperateForGold, faction);
    optimizeRuralCollection(myRurals, isDesperateForFood, faction);

    // 2. EMERGENCY SEIZE ACTIONS (before logistics to secure resources)
    const seizeResult = handleSeizeActions(faction, state, updates.locations!);
    updates.locations = seizeResult.locations;
    // Add seize logs to game logs
    if (seizeResult.logs.length > 0) {
        updates.logs!.push(...seizeResult.logs);
    }
    // Seize gold is added directly to resources
    if (seizeResult.goldGained > 0) {
        updates.resources![faction].gold += seizeResult.goldGained;
    }

    // 3. GRAIN EMBARGO
    const embargoResult = handleGrainEmbargo(state, faction, profile, updates.locations!);
    updates.logs!.push(...embargoResult.logs);
    if (embargoResult.grainTradeNotification) {
        updates.grainTradeNotification = embargoResult.grainTradeNotification;
    }

    // 4. LOGISTICS
    const logisticsResult = manageLogistics(
        state, faction,
        updates.locations!,
        updates.convoys!,
        updates.navalConvoys!
    );
    updates.locations = logisticsResult.locations;
    updates.convoys = logisticsResult.convoys;
    updates.navalConvoys = logisticsResult.navalConvoys;

    // 5. RECRUITMENT - Track amount spent (now with CONSCRIPTION + insurrection defense)
    const goldBeforeRecruitment = treasuryGold - spentGold;
    
    // Use pre-computed alerts if provided, otherwise detect internally
    const insurrectionAlerts = externalInsurrectionAlerts ?? getInsurrectionAlerts(state, faction);
    
    const recruitmentResult = handleRecruitment(
        faction,
        updates.locations!,
        updates.armies!,
        updates.roads!,
        budget,
        profile,
        state.turn,
        goldBeforeRecruitment,
        insurrectionAlerts,
        updates.characters!
    );
    const goldAfterRecruitment = recruitmentResult.remainingGold;
    updates.characters = recruitmentResult.updatedCharacters;
    spentGold += (goldBeforeRecruitment - goldAfterRecruitment);

    // 6. FORTIFICATIONS - Track amount spent
    const goldBeforeFortifications = goldAfterRecruitment;
    const goldAfterFortifications = handleFortifications(
        faction,
        updates.locations!,
        updates.roads!,
        updates.armies!,
        budget,
        profile,
        goldBeforeFortifications
    );
    spentGold += (goldBeforeFortifications - goldAfterFortifications);

    // Subtract AI spending from treasury
    // Note: Income is added by turnProcessor separately, we just track spending here
    if (spentGold > 0) {
        updates.resources![faction].gold = Math.max(0, updates.resources![faction].gold - spentGold);
    }

    return updates;
};

