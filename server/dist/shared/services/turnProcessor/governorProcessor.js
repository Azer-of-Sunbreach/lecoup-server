"use strict";
/**
 * governorProcessor.ts - Central processor for Governor Policies
 *
 * Symmetrical to clandestineProcessor.ts but for active Governor Policies (Locations).
 *
 * Processes all active governor policies for all locations at turn start:
 * 1. Checks standard disable conditions (revenue=0, no governor)
 * 2. Deducts costs from faction treasury
 * 3. Calls policy handlers (Make Examples, Stabilize Region, etc.)
 * 4. Generates logs
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.processGovernorPolicies = processGovernorPolicies;
const types_1 = require("../../types");
const governorTypes_1 = require("../../types/governorTypes");
const stabilizeRegion_1 = require("../domain/governor/stabilizeRegion");
const appeaseMinds_1 = require("../domain/governor/appeaseMinds");
const denounceEnemies_1 = require("../domain/governor/denounceEnemies");
const huntNetworks_1 = require("../domain/governor/huntNetworks");
const territorialStats_1 = require("../domain/territorial/territorialStats");
const rationing_1 = require("../domain/governor/rationing");
const rebuildRegion_1 = require("../domain/governor/rebuildRegion");
// ============================================================================
// MAIN FUNCTION
// ============================================================================
function processGovernorPolicies(locations, characters, armies, resources, turn) {
    let updatedLocations = [...locations];
    const goldCosts = {
        [types_1.FactionId.NOBLES]: 0,
        [types_1.FactionId.REPUBLICANS]: 0,
        [types_1.FactionId.CONSPIRATORS]: 0,
        [types_1.FactionId.NEUTRAL]: 0,
        [types_1.FactionId.LOYALISTS]: 0,
        [types_1.FactionId.PRINCELY_ARMY]: 0,
        [types_1.FactionId.CONFEDERATE_CITIES]: 0
    };
    const foodCosts = {};
    const logs = [];
    // Helper for finding governor
    const getGovernor = (locationId) => {
        return characters.find(c => c.locationId === locationId &&
            c.status === types_1.CharacterStatus.GOVERNING);
    };
    // Helper for faction revenue (needed for some disable checks)
    const getFactionRevenue = (faction) => {
        return locations
            .filter(l => l.faction === faction)
            .reduce((sum, l) => sum + l.goldIncome, 0);
    };
    // Helper for routing logs
    const routeLog = (log) => {
        logs.push(log);
    };
    // Helper to log auto-disable
    const logDisable = (location, policyName, reason) => {
        logs.push({
            id: `policy-disable-${turn}-${location.id}-${policyName}`,
            type: types_1.LogType.ECONOMY,
            message: `${policyName} in ${location.name} suspended. ${reason}`,
            turn,
            visibleToFactions: [location.faction],
            baseSeverity: types_1.LogSeverity.INFO,
            highlightTarget: { type: 'LOCATION', id: location.id }
        });
    };
    // Process each location
    updatedLocations = updatedLocations.map(loc => {
        if (loc.faction === types_1.FactionId.NEUTRAL)
            return loc;
        const governor = getGovernor(loc.id);
        const factionGold = (resources[loc.faction]?.gold || 0) - (goldCosts[loc.faction] || 0); // Remaining available gold
        const factionRevenue = getFactionRevenue(loc.faction);
        let policiesToRemove = [];
        // If no governor, disable all policies
        if (!governor) {
            // Disable all active policies
            // Actually, we should probably iterate known policies or just reset?
            // Safer to iterate and disable.
            if (loc.governorPolicies) {
                // Return cleaned location
                return {
                    ...loc,
                    governorPolicies: {}
                };
            }
            return loc;
        }
        // Iterate active policies
        // We check specific known policies to ensure order and types
        // --- STABILIZE REGION ---
        if ((0, stabilizeRegion_1.isStabilizeRegionActive)(loc)) {
            const policy = types_1.GovernorPolicy.STABILIZE_REGION;
            const baseCost = governorTypes_1.GOVERNOR_POLICY_COSTS[policy] || 0;
            const cost = (0, denounceEnemies_1.getEffectiveGoldCost)(baseCost, governor); // Man of the Church = free
            // 1. Check Disable Conditions (Cost & Logic)
            const disableCheck = (0, stabilizeRegion_1.shouldDisableStabilizeRegion)(loc, factionRevenue, factionGold);
            const canAfford = factionGold >= cost;
            if (disableCheck.shouldDisable) {
                policiesToRemove.push(policy);
                const reason = disableCheck.reason === 'revenue_zero'
                    ? 'Faction revenue is zero.'
                    : (disableCheck.reason === 'stability_max' ? 'Stability reached maximum.' : 'Reason unknown.');
                logDisable(loc, 'Stabilization', reason);
            }
            else if (!canAfford) {
                policiesToRemove.push(policy);
                logDisable(loc, 'Stabilization', 'Insufficient funds.');
            }
            else {
                // 2. Apply Cost
                if (cost > 0) {
                    goldCosts[loc.faction] += cost;
                    // Note: We don't update local 'factionGold' variable for subsequent policies in same location
                    // unless we want strict sequential budget. 
                    // Usually simpler to allow over-commit or check against initial.
                    // Let's deduct from our running available tracker
                    // factionGold -= cost; // (Not actually modifying outside var, but could)
                }
                // 3. Process Effect
                const result = (0, stabilizeRegion_1.processStabilizeRegion)(governor, loc, turn);
                loc = result.location;
                if (result.log)
                    routeLog(result.log);
                // Re-check disable after effect? (e.g. if stability hit 100)
                // The handler logic might result in 100 stability, which should disable NEXT turn, or immediately?
                // `clandestineProcessor` checks disable AFTER effect too.
                const postCheck = (0, stabilizeRegion_1.shouldDisableStabilizeRegion)(loc, factionRevenue, factionGold); // cost irrelevant now
                if (postCheck.shouldDisable) {
                    policiesToRemove.push(policy);
                    // Don't log immediately if it just finished? 
                    // "Automatically disables... if stability reaches 100".
                    // Yes, log it so user knows why it's off next turn.
                    const reason = postCheck.reason === 'revenue_zero'
                        ? 'Faction revenue is zero.'
                        : (postCheck.reason === 'stability_max' ? 'Stability reached maximum.' : 'Reason unknown.');
                    logDisable(loc, 'Stabilization', reason);
                }
            }
        }
        // --- MAKE EXAMPLES ---
        // (Handled via triggered events/battles mostly, but if it has passive effects or costs involving turn processor later...)
        // Currently it's 0 cost and triggered by battles/Iron Fist.
        // It does NOT have a per-turn effect yet (unless we add one).
        // --- APPEASE THE MINDS ---
        if ((0, appeaseMinds_1.isAppeaseMindsActive)(loc)) {
            const policy = types_1.GovernorPolicy.APPEASE_MINDS;
            const foodCost = (0, appeaseMinds_1.getAppeaseMindsEffectiveCost)(loc, governor);
            // Get rural net production
            // For CITIES: use linked rural area's production
            // For RURALS: use this location's own production
            let ruralNetProduction = 0;
            if (loc.type === types_1.LocationType.RURAL) {
                // FIX: For rural areas, calculate their OWN net production
                const ruralStats = (0, territorialStats_1.calculateRuralFoodStats)(loc, locations, armies);
                ruralNetProduction = ruralStats?.netProduction || 0;
            }
            else if (loc.linkedLocationId) {
                // For cities, get the linked rural's production
                const linkedRural = locations.find(l => l.id === loc.linkedLocationId);
                if (linkedRural && linkedRural.faction === loc.faction) {
                    const ruralStats = (0, territorialStats_1.calculateRuralFoodStats)(linkedRural, locations, armies);
                    ruralNetProduction = ruralStats?.netProduction || 0;
                }
            }
            // Get resentment against the governor's faction (skip NEUTRAL)
            const resentmentAgainstFaction = governor.faction !== types_1.FactionId.NEUTRAL
                ? (loc.resentment?.[governor.faction] || 0)
                : 0;
            // Check disable conditions
            const disableCheck = (0, appeaseMinds_1.shouldDisableAppeaseMinds)(loc, ruralNetProduction, foodCost, resentmentAgainstFaction);
            if (disableCheck.shouldDisable) {
                policiesToRemove.push(policy);
                let reason = 'Not enough food in this area.';
                if (disableCheck.reason === 'negative_production') {
                    reason = 'Net food production is too low.';
                }
                else if (disableCheck.reason === 'no_stock') {
                    reason = 'Food stock is empty.';
                }
                else if (disableCheck.reason === 'no_resentment') {
                    reason = 'Resentment is already at minimum.';
                }
                logDisable(loc, 'Appease the Minds', reason);
            }
            else {
                // Track food cost for this location
                if (foodCost > 0) {
                    foodCosts[loc.id] = foodCost;
                }
                // Apply effect: reduce resentment
                loc = (0, appeaseMinds_1.processAppeaseMinds)(governor, loc);
            }
        }
        // --- DENOUNCE ENEMIES ---
        if ((0, denounceEnemies_1.isDenounceEnemiesActive)(loc)) {
            const policy = types_1.GovernorPolicy.DENOUNCE_ENEMIES;
            const baseCost = governorTypes_1.GOVERNOR_POLICY_COSTS[policy] || 0;
            const cost = (0, denounceEnemies_1.getEffectiveGoldCost)(baseCost, governor); // Man of the Church = free
            // Check disable conditions
            const disableCheck = (0, denounceEnemies_1.shouldDisableDenounceEnemies)(loc, factionRevenue, loc.faction);
            const canAfford = factionGold >= cost;
            if (disableCheck.shouldDisable) {
                policiesToRemove.push(policy);
                const reason = disableCheck.reason === 'revenue_zero'
                    ? 'Faction revenue is zero.'
                    : 'Enemy resentment is at maximum.';
                logDisable(loc, 'Denounce Enemies', reason);
            }
            else if (!canAfford) {
                policiesToRemove.push(policy);
                logDisable(loc, 'Denounce Enemies', 'Insufficient funds.');
            }
            else {
                // Apply cost
                if (cost > 0) {
                    goldCosts[loc.faction] += cost;
                }
                // Apply effect: increase resentment against enemy factions
                loc = (0, denounceEnemies_1.processDenounceEnemies)(governor, loc);
                // Re-check disable after effect (if both enemies at 100)
                const postCheck = (0, denounceEnemies_1.shouldDisableDenounceEnemies)(loc, factionRevenue, loc.faction);
                if (postCheck.shouldDisable && postCheck.reason === 'resentment_max') {
                    policiesToRemove.push(policy);
                    logDisable(loc, 'Denounce Enemies', 'Enemy resentment is at maximum.');
                }
            }
        }
        // --- HUNT NETWORKS (Counter-Espionage) ---
        // Full-time policy: 20g/turn, auto-disables if faction revenue = 0
        // Effects are applied passively in clandestineProcessor and infiltrationRisk
        if ((0, huntNetworks_1.isHuntNetworksActive)(loc)) {
            const policy = types_1.GovernorPolicy.HUNT_NETWORKS;
            const cost = governorTypes_1.GOVERNOR_POLICY_COSTS[policy] || 20;
            // Check disable conditions
            const disableCheck = (0, huntNetworks_1.shouldDisableHuntNetworks)(factionRevenue);
            const canAfford = factionGold >= cost;
            if (disableCheck.shouldDisable) {
                policiesToRemove.push(policy);
                logDisable(loc, 'Hunt Networks', 'Faction revenue is zero.');
            }
            else if (!canAfford) {
                policiesToRemove.push(policy);
                logDisable(loc, 'Hunt Networks', 'Insufficient funds.');
            }
            else {
                // Apply cost (no per-turn effect, just cost deduction)
                if (cost > 0) {
                    goldCosts[loc.faction] += cost;
                }
            }
        }
        // --- RATIONING ---
        if ((0, rationing_1.isRationingActive)(loc)) {
            const policy = types_1.GovernorPolicy.RATIONING;
            const disableCheck = (0, rationing_1.shouldDisableRationing)(loc);
            if (disableCheck.shouldDisable) {
                policiesToRemove.push(policy);
                logDisable(loc, 'Rationing', 'Not available in rural areas.');
            }
            else {
                // Apply effect: reduce stability, increase resentment
                loc = (0, rationing_1.processRationing)(governor, loc);
            }
        }
        // --- REBUILD REGION ---
        if ((0, rebuildRegion_1.isRebuildRegionActive)(loc)) {
            const policy = types_1.GovernorPolicy.REBUILD_REGION;
            const cost = governorTypes_1.GOVERNOR_POLICY_COSTS[policy] || 10;
            // Check disable conditions
            const disableCheck = (0, rebuildRegion_1.shouldDisableRebuildRegion)(loc, factionRevenue);
            const canAfford = factionGold >= cost;
            if (disableCheck.shouldDisable) {
                policiesToRemove.push(policy);
                const reason = disableCheck.reason === 'revenue_zero'
                    ? 'Faction revenue is zero.'
                    : 'No lasting enemy sabotage in this region.';
                logDisable(loc, 'Rebuild Region', reason);
            }
            else if (!canAfford) {
                policiesToRemove.push(policy);
                logDisable(loc, 'Rebuild Region', 'Insufficient funds.');
            }
            else {
                // Apply cost
                if (cost > 0) {
                    goldCosts[loc.faction] += cost;
                }
                // Apply effect: repair damage
                loc = (0, rebuildRegion_1.processRebuildRegion)(governor, loc);
                // Re-check disable after effect (if damage now 0)
                if (!(0, rebuildRegion_1.hasRebuildableDamage)(loc)) {
                    policiesToRemove.push(policy);
                    logDisable(loc, 'Rebuild Region', 'All sabotage damage has been repaired.');
                }
            }
        }
        // Remove disabled policies
        if (policiesToRemove.length > 0) {
            const newPolicies = { ...loc.governorPolicies };
            policiesToRemove.forEach(p => {
                newPolicies[p] = false;
            });
            loc = { ...loc, governorPolicies: newPolicies };
        }
        return loc;
    });
    return {
        locations: updatedLocations,
        goldCosts,
        foodCosts,
        logs
    };
}
