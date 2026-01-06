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

import { Location, Character, CharacterStatus, FactionId, GovernorPolicy, LogEntry, LogType, LogSeverity, Army, LocationType } from '../../types';
import { GOVERNOR_POLICY_COSTS } from '../../types/governorTypes';
import { processStabilizeRegion, shouldDisableStabilizeRegion, isStabilizeRegionActive } from '../domain/governor/stabilizeRegion';
import { processAppeaseMinds, shouldDisableAppeaseMinds, isAppeaseMindsActive, getAppeaseMindsEffectiveCost } from '../domain/governor/appeaseMinds';
import { processDenounceEnemies, shouldDisableDenounceEnemies, isDenounceEnemiesActive, getEffectiveGoldCost } from '../domain/governor/denounceEnemies';
import { isHuntNetworksActive, shouldDisableHuntNetworks } from '../domain/governor/huntNetworks';
import { calculateRuralFoodStats } from '../domain/territorial/territorialStats';
import { isRationingActive, shouldDisableRationing, processRationing } from '../domain/governor/rationing';
import { isRebuildRegionActive, shouldDisableRebuildRegion, processRebuildRegion, hasRebuildableDamage } from '../domain/governor/rebuildRegion';

// ============================================================================
// TYPES
// ============================================================================

export interface GovernorPoliciesResult {
    locations: Location[];
    goldCosts: Record<FactionId, number>;
    foodCosts: Record<string, number>; // Per-location food costs (locationId -> cost)
    logs: LogEntry[];
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

export function processGovernorPolicies(
    locations: Location[],
    characters: Character[],
    armies: Army[],
    resources: Record<FactionId, { gold: number }>,
    turn: number
): GovernorPoliciesResult {
    let updatedLocations = [...locations];
    const goldCosts: Record<FactionId, number> = {
        [FactionId.NOBLES]: 0,
        [FactionId.REPUBLICANS]: 0,
        [FactionId.CONSPIRATORS]: 0,
        [FactionId.NEUTRAL]: 0
    };
    const foodCosts: Record<string, number> = {};
    const logs: LogEntry[] = [];

    // Helper for finding governor
    const getGovernor = (locationId: string): Character | undefined => {
        return characters.find(c =>
            c.locationId === locationId &&
            c.status === CharacterStatus.GOVERNING
        );
    };

    // Helper for faction revenue (needed for some disable checks)
    const getFactionRevenue = (faction: FactionId): number => {
        return locations
            .filter(l => l.faction === faction)
            .reduce((sum, l) => sum + l.goldIncome, 0);
    };

    // Helper for routing logs
    const routeLog = (log: LogEntry) => {
        logs.push(log);
    };

    // Helper to log auto-disable
    const logDisable = (location: Location, policyName: string, reason: string) => {
        logs.push({
            id: `policy-disable-${turn}-${location.id}-${policyName}`,
            type: LogType.ECONOMY,
            message: `${policyName} in ${location.name} suspended. ${reason}`,
            turn,
            visibleToFactions: [location.faction],
            baseSeverity: LogSeverity.INFO,
            highlightTarget: { type: 'LOCATION', id: location.id }
        });
    };

    // Process each location
    updatedLocations = updatedLocations.map(loc => {
        if (loc.faction === FactionId.NEUTRAL) return loc;

        const governor = getGovernor(loc.id);
        const factionGold = (resources[loc.faction]?.gold || 0) - (goldCosts[loc.faction] || 0); // Remaining available gold
        const factionRevenue = getFactionRevenue(loc.faction);

        let policiesToRemove: GovernorPolicy[] = [];

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
        if (isStabilizeRegionActive(loc)) {
            const policy = GovernorPolicy.STABILIZE_REGION;
            const baseCost = GOVERNOR_POLICY_COSTS[policy] || 0;
            const cost = getEffectiveGoldCost(baseCost, governor); // Man of the Church = free

            // 1. Check Disable Conditions (Cost & Logic)
            const disableCheck = shouldDisableStabilizeRegion(loc, factionRevenue, factionGold);
            const canAfford = factionGold >= cost;

            if (disableCheck.shouldDisable) {
                policiesToRemove.push(policy);
                const reason = disableCheck.reason === 'revenue_zero'
                    ? 'Faction revenue is zero.'
                    : (disableCheck.reason === 'stability_max' ? 'Stability reached maximum.' : 'Reason unknown.');
                logDisable(loc, 'Stabilization', reason);
            } else if (!canAfford) {
                policiesToRemove.push(policy);
                logDisable(loc, 'Stabilization', 'Insufficient funds.');
            } else {
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
                const result = processStabilizeRegion(governor, loc, turn);
                loc = result.location;
                if (result.log) routeLog(result.log);

                // Re-check disable after effect? (e.g. if stability hit 100)
                // The handler logic might result in 100 stability, which should disable NEXT turn, or immediately?
                // `clandestineProcessor` checks disable AFTER effect too.
                const postCheck = shouldDisableStabilizeRegion(loc, factionRevenue, factionGold); // cost irrelevant now
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
        if (isAppeaseMindsActive(loc)) {
            const policy = GovernorPolicy.APPEASE_MINDS;
            const foodCost = getAppeaseMindsEffectiveCost(loc, governor);

            // Get rural net production
            // For CITIES: use linked rural area's production
            // For RURALS: use this location's own production
            let ruralNetProduction = 0;
            if (loc.type === LocationType.RURAL) {
                // FIX: For rural areas, calculate their OWN net production
                const ruralStats = calculateRuralFoodStats(loc, locations, armies);
                ruralNetProduction = ruralStats?.netProduction || 0;
            } else if (loc.linkedLocationId) {
                // For cities, get the linked rural's production
                const linkedRural = locations.find(l => l.id === loc.linkedLocationId);
                if (linkedRural && linkedRural.faction === loc.faction) {
                    const ruralStats = calculateRuralFoodStats(linkedRural, locations, armies);
                    ruralNetProduction = ruralStats?.netProduction || 0;
                }
            }

            // Get resentment against the governor's faction (skip NEUTRAL)
            const resentmentAgainstFaction = governor.faction !== FactionId.NEUTRAL
                ? (loc.resentment?.[governor.faction as Exclude<FactionId, FactionId.NEUTRAL>] || 0)
                : 0;

            // Check disable conditions
            const disableCheck = shouldDisableAppeaseMinds(loc, ruralNetProduction, foodCost, resentmentAgainstFaction);

            if (disableCheck.shouldDisable) {
                policiesToRemove.push(policy);
                let reason = 'Not enough food in this area.';
                if (disableCheck.reason === 'rural_area') {
                    reason = 'Not available in rural areas.';
                } else if (disableCheck.reason === 'no_resentment') {
                    reason = 'Resentment is already at minimum.';
                }
                logDisable(loc, 'Appease the Minds', reason);
            } else {
                // Track food cost for this location
                if (foodCost > 0) {
                    foodCosts[loc.id] = foodCost;
                }

                // Apply effect: reduce resentment
                loc = processAppeaseMinds(governor, loc);
            }
        }

        // --- DENOUNCE ENEMIES ---
        if (isDenounceEnemiesActive(loc)) {
            const policy = GovernorPolicy.DENOUNCE_ENEMIES;
            const baseCost = GOVERNOR_POLICY_COSTS[policy] || 0;
            const cost = getEffectiveGoldCost(baseCost, governor); // Man of the Church = free

            // Check disable conditions
            const disableCheck = shouldDisableDenounceEnemies(loc, factionRevenue, loc.faction);
            const canAfford = factionGold >= cost;

            if (disableCheck.shouldDisable) {
                policiesToRemove.push(policy);
                const reason = disableCheck.reason === 'revenue_zero'
                    ? 'Faction revenue is zero.'
                    : 'Enemy resentment is at maximum.';
                logDisable(loc, 'Denounce Enemies', reason);
            } else if (!canAfford) {
                policiesToRemove.push(policy);
                logDisable(loc, 'Denounce Enemies', 'Insufficient funds.');
            } else {
                // Apply cost
                if (cost > 0) {
                    goldCosts[loc.faction] += cost;
                }

                // Apply effect: increase resentment against enemy factions
                loc = processDenounceEnemies(governor, loc);

                // Re-check disable after effect (if both enemies at 100)
                const postCheck = shouldDisableDenounceEnemies(loc, factionRevenue, loc.faction);
                if (postCheck.shouldDisable && postCheck.reason === 'resentment_max') {
                    policiesToRemove.push(policy);
                    logDisable(loc, 'Denounce Enemies', 'Enemy resentment is at maximum.');
                }
            }
        }

        // --- HUNT NETWORKS (Counter-Espionage) ---
        // Full-time policy: 20g/turn, auto-disables if faction revenue = 0
        // Effects are applied passively in clandestineProcessor and infiltrationRisk
        if (isHuntNetworksActive(loc)) {
            const policy = GovernorPolicy.HUNT_NETWORKS;
            const cost = GOVERNOR_POLICY_COSTS[policy] || 20;

            // Check disable conditions
            const disableCheck = shouldDisableHuntNetworks(factionRevenue);
            const canAfford = factionGold >= cost;

            if (disableCheck.shouldDisable) {
                policiesToRemove.push(policy);
                logDisable(loc, 'Hunt Networks', 'Faction revenue is zero.');
            } else if (!canAfford) {
                policiesToRemove.push(policy);
                logDisable(loc, 'Hunt Networks', 'Insufficient funds.');
            } else {
                // Apply cost (no per-turn effect, just cost deduction)
                if (cost > 0) {
                    goldCosts[loc.faction] += cost;
                }
            }
        }

        // --- RATIONING ---
        if (isRationingActive(loc)) {
            const policy = GovernorPolicy.RATIONING;
            const disableCheck = shouldDisableRationing(loc);

            if (disableCheck.shouldDisable) {
                policiesToRemove.push(policy);
                logDisable(loc, 'Rationing', 'Not available in rural areas.');
            } else {
                // Apply effect: reduce stability, increase resentment
                loc = processRationing(governor, loc);
            }
        }

        // --- REBUILD REGION ---
        if (isRebuildRegionActive(loc)) {
            const policy = GovernorPolicy.REBUILD_REGION;
            const cost = GOVERNOR_POLICY_COSTS[policy] || 10;

            // Check disable conditions
            const disableCheck = shouldDisableRebuildRegion(loc, factionRevenue);
            const canAfford = factionGold >= cost;

            if (disableCheck.shouldDisable) {
                policiesToRemove.push(policy);
                const reason = disableCheck.reason === 'revenue_zero'
                    ? 'Faction revenue is zero.'
                    : 'No lasting enemy sabotage in this region.';
                logDisable(loc, 'Rebuild Region', reason);
            } else if (!canAfford) {
                policiesToRemove.push(policy);
                logDisable(loc, 'Rebuild Region', 'Insufficient funds.');
            } else {
                // Apply cost
                if (cost > 0) {
                    goldCosts[loc.faction] += cost;
                }

                // Apply effect: repair damage
                loc = processRebuildRegion(governor, loc);

                // Re-check disable after effect (if damage now 0)
                if (!hasRebuildableDamage(loc)) {
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
