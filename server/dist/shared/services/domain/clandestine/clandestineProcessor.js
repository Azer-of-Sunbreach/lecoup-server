"use strict";
/**
 * Clandestine Processor - Main orchestrator for clandestine action processing
 *
 * Processes all active clandestine actions for all leaders at turn start:
 * 1. Deducts action costs from leader budgets
 * 2. Applies action effects (stability reduction, etc.)
 * 3. Auto-disables actions when conditions fail
 * 4. Generates warning logs for defenders
 *
 * Called from turnProcessor.ts during turn processing.
 *
 * @see ./insurrectionFormulas.ts - Centralized formulas for insurgent estimation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.processClandestineActions = processClandestineActions;
const types_1 = require("../../../types");
const clandestineTypes_1 = require("../../../types/clandestineTypes");
const undermineAuthorities_1 = require("./undermineAuthorities");
const distributePamphlets_1 = require("./distributePamphlets");
const spreadPropaganda_1 = require("./spreadPropaganda");
const detectionLevelService_1 = require("./detectionLevelService");
const clandestineAlertService_1 = require("./clandestineAlertService");
const attackTaxConvoys_1 = require("./attackTaxConvoys");
const stealFromGranaries_1 = require("./stealFromGranaries");
const burnOperations_1 = require("./burnOperations");
const inciteNeutralInsurrections_1 = require("./inciteNeutralInsurrections");
const prepareGrandInsurrection_1 = require("./prepareGrandInsurrection");
const assassinateLeader_1 = require("./assassinateLeader");
const clandestineLogConsolidator_1 = require("./clandestineLogConsolidator");
const scorchedEarth_1 = require("./scorchedEarth");
/**
 * Validates and cleans up clandestine states based on game rules.
 * Handles:
 * 1. Territory becoming Neutral/Friendly (Flip) -> Stop actions, Refund budget (if friendly).
 * 2. Leader Moving/Leaving -> Stop actions, Lose/Keep budget based on destination.
 * 3. Leader Elimination -> Stop actions.
 */
function validateAndCleanupClandestineStates(characters, locations, resourceUpdates, logs, turn) {
    const updatedCharacters = [...characters];
    for (let i = 0; i < updatedCharacters.length; i++) {
        let leader = updatedCharacters[i];
        // Skip if no clandestine involvement (optimization)
        if (!leader.activeClandestineActions || leader.activeClandestineActions.length === 0) {
            continue;
        }
        const location = locations.find(l => l.id === leader.locationId);
        if (!location)
            continue; // Should not happen
        let shouldClearActions = false;
        let shouldRefundBudget = false;
        let shouldLoseBudget = false;
        let newStatus = undefined;
        // 1. Check Territory Status (Flip)
        // Applies to UNDERCOVER and ON_MISSION (Grand Insurrection uses ON_MISSION)
        if (leader.status === types_1.CharacterStatus.UNDERCOVER || leader.status === types_1.CharacterStatus.ON_MISSION) {
            // If territory is Friendly (Player Controlled)
            if (location.faction === leader.faction) {
                shouldClearActions = true;
                shouldRefundBudget = true;
                newStatus = types_1.CharacterStatus.AVAILABLE;
                logs.push({
                    id: `clandestine-flip-friendly-${turn}-${leader.id}`,
                    type: types_1.LogType.LEADER,
                    message: `With ${location.name} now under our control, ${leader.name} ceases clandestine operations and returns the remaining budget to the treasury.`,
                    turn,
                    visibleToFactions: [leader.faction],
                    baseSeverity: types_1.LogSeverity.INFO,
                    i18nKey: 'clandestineFlipFriendly',
                    i18nParams: { location: location.id, leader: leader.id }
                });
            }
            // If territory is Neutral
            else if (location.faction === types_1.FactionId.NEUTRAL) {
                shouldClearActions = true;
                newStatus = types_1.CharacterStatus.AVAILABLE;
                logs.push({
                    id: `clandestine-flip-neutral-${turn}-${leader.id}`,
                    type: types_1.LogType.LEADER,
                    message: `${location.name} is now Neutral. ${leader.name} ceases clandestine operations but remains in the area.`,
                    turn,
                    visibleToFactions: [leader.faction],
                    baseSeverity: types_1.LogSeverity.INFO,
                    i18nKey: 'clandestineFlipNeutral',
                    i18nParams: { location: location.id, leader: leader.id }
                });
            }
        }
        // 2. Check Leader Status (Movement/Death)
        // If status changed to potentially invalid state (e.g. MOVING out)
        if (leader.status !== types_1.CharacterStatus.UNDERCOVER && leader.status !== types_1.CharacterStatus.ON_MISSION) {
            // If DEAD
            if (leader.status === types_1.CharacterStatus.DEAD) {
                shouldClearActions = true;
                // Budget irrelevant (gone with leader)
            }
            // If MOVING (Left territory) or AVAILABLE (Arrived elsewhere/Reset)
            else {
                shouldClearActions = true;
                let targetFaction;
                if (leader.status === types_1.CharacterStatus.MOVING && leader.destinationId) {
                    const dest = locations.find(l => l.id === leader.destinationId);
                    targetFaction = dest?.faction;
                }
                else {
                    targetFaction = location.faction;
                }
                if (targetFaction === leader.faction) {
                    shouldLoseBudget = true;
                }
            }
        }
        // Apply Cleanup
        if (shouldClearActions) {
            // Refund logic
            if (shouldRefundBudget && leader.budget && leader.budget > 0) {
                resourceUpdates[leader.faction] = (resourceUpdates[leader.faction] || 0) + leader.budget;
                leader = { ...leader, budget: 0 };
            }
            // Lose logic
            if (shouldLoseBudget) {
                leader = { ...leader, budget: 0 };
            }
            // Update Actions
            leader = {
                ...leader,
                activeClandestineActions: undefined, // Clear all
                detectionLevel: 0,
                pendingDetectionEffects: undefined
            };
            // Update Status
            if (newStatus) {
                leader = { ...leader, status: newStatus };
            }
        }
        updatedCharacters[i] = leader;
    }
    return updatedCharacters;
}
/**
 * Process all active clandestine actions.
 */
function processClandestineActions(characters, locations, armies, turn) {
    const logs = [];
    const resourceUpdates = {
        [types_1.FactionId.NOBLES]: 0,
        [types_1.FactionId.CONSPIRATORS]: 0,
        [types_1.FactionId.REPUBLICANS]: 0,
        [types_1.FactionId.NEUTRAL]: 0,
        [types_1.FactionId.LOYALISTS]: 0,
        [types_1.FactionId.PRINCELY_ARMY]: 0,
        [types_1.FactionId.CONFEDERATE_CITIES]: 0
    };
    const newArmies = [];
    // Log Buffer for consolidation
    const logBuffer = new Map();
    const addToBuffer = (log, actionId, isCritical, locationId, sourceFaction) => {
        if (!logBuffer.has(locationId)) {
            logBuffer.set(locationId, new Map());
        }
        const factionMap = logBuffer.get(locationId);
        if (!factionMap.has(sourceFaction)) {
            factionMap.set(sourceFaction, []);
        }
        factionMap.get(sourceFaction).push({ log, actionId, isCritical });
    };
    // Helper to handle log routing (Buffer if for Defender, Direct otherwise)
    // CRITICAL logs are ALWAYS emitted directly to ensure visibility
    const routeLog = (log, actionId, isActionCritical, location, leader) => {
        const defenderFaction = location.faction;
        const isVisibleToDefender = defenderFaction !== types_1.FactionId.NEUTRAL && log.visibleToFactions.includes(defenderFaction);
        // CRITICAL logs go directly to output without buffering
        if (isActionCritical) {
            logs.push(log);
            return;
        }
        if (isVisibleToDefender) {
            // Buffer it for consolidation (non-critical logs)
            addToBuffer(log, actionId, isActionCritical, location.id, leader.faction);
            // If ALSO visible to Attacker, clone for them
            if (log.visibleToFactions.length > 1 && log.visibleToFactions.includes(leader.faction)) {
                const attackerLog = { ...log, visibleToFactions: [leader.faction], id: log.id + '-attacker' };
                logs.push(attackerLog);
            }
        }
        else {
            // Not visible to Defender -> Emit directly
            logs.push(log);
        }
    };
    // Mutable armies list for combat updates
    let currentArmies = [...armies];
    // Run Cleanup Pass First
    let updatedCharacters = validateAndCleanupClandestineStates([...characters], locations, resourceUpdates, logs, turn);
    // Create mutable copies for locations
    let updatedLocations = [...locations];
    // DEBUG: Log all undercover leaders at the start
    const allUndercover = updatedCharacters.filter(c => c.status === types_1.CharacterStatus.UNDERCOVER || c.status === types_1.CharacterStatus.ON_MISSION);
    console.log(`[PROCESSOR] Starting with ${allUndercover.length} undercover/on_mission leaders:`);
    allUndercover.forEach(l => console.log(`  - ${l.name} (${l.faction}) @ ${l.locationId}, status=${l.status}`));
    // Process each character that has active clandestine actions
    for (let charIndex = 0; charIndex < updatedCharacters.length; charIndex++) {
        let leader = updatedCharacters[charIndex];
        // Skip if not undercover/on_mission
        if (leader.status !== types_1.CharacterStatus.UNDERCOVER && leader.status !== types_1.CharacterStatus.ON_MISSION)
            continue;
        // Find the location this leader is in
        const locationIndex = updatedLocations.findIndex(l => l.id === leader.locationId);
        if (locationIndex === -1)
            continue;
        let location = updatedLocations[locationIndex];
        // --------------------------------------------------------------------
        // 0. SCORCHED EARTH TRAIT - Force actions if leader has trait
        // --------------------------------------------------------------------
        if ((0, scorchedEarth_1.hasScorchedEarth)(leader) && leader.status === types_1.CharacterStatus.UNDERCOVER) {
            const forcedActions = (0, scorchedEarth_1.getScorchedEarthActions)(location.type);
            let actionsModified = false;
            forcedActions.forEach(actionId => {
                const alreadyActive = (leader.activeClandestineActions || []).some(a => a.actionId === actionId);
                if (!alreadyActive) {
                    // Add the forced action
                    leader = {
                        ...leader,
                        activeClandestineActions: [
                            ...(leader.activeClandestineActions || []),
                            { actionId, turnStarted: turn, isTraitForced: true }
                        ]
                    };
                    actionsModified = true;
                }
            });
            if (actionsModified) {
                updatedCharacters[charIndex] = leader;
            }
        }
        // Re-check active actions after potential SCORCHED_EARTH additions
        const activeActions = leader.activeClandestineActions || [];
        // --------------------------------------------------------------------
        // 0b. PARANOID/HUNT ALERTS (must run BEFORE activeActions filter)
        // These alerts should fire regardless of whether the leader has active actions
        // --------------------------------------------------------------------
        // Identify governor for this location (needed for PARANOID check)
        const governorForAlerts = updatedCharacters.find(c => c.locationId === location.id &&
            c.faction === location.faction &&
            c.status === types_1.CharacterStatus.GOVERNING);
        const isHuntActiveEarly = location.governorPolicies?.HUNT_NETWORKS === true;
        const hasParanoidGovernorEarly = governorForAlerts?.stats.ability.includes('PARANOID') ?? false;
        const governorNameEarly = governorForAlerts?.name || 'Unknown Governor';
        const governorIdEarly = governorForAlerts?.id || '';
        const huntNotifiedEarly = leader.pendingDetectionEffects?.huntNetworksNotified ?? false;
        const paranoidNotifiedEarly = leader.pendingDetectionEffects?.paranoidGovernorNotified ?? false;
        let newHuntNotifiedEarly = huntNotifiedEarly;
        let newParanoidNotifiedEarly = paranoidNotifiedEarly;
        // DEBUG LOG
        console.log(`[CLANDESTINE] ${leader.name} @ ${location.name}: isHunt=${isHuntActiveEarly}, hasParanoid=${hasParanoidGovernorEarly}, huntNotified=${huntNotifiedEarly}, paranoidNotified=${paranoidNotifiedEarly}`);
        // Case 1: Both New (Combined Alert)
        if (isHuntActiveEarly && !huntNotifiedEarly && hasParanoidGovernorEarly && !paranoidNotifiedEarly) {
            console.log(`[CLANDESTINE] Creating COMBINED alert for ${leader.name}`);
            const alertEvent = (0, clandestineAlertService_1.createCombinedParanoidHuntEvent)(leader, location, governorNameEarly, governorIdEarly, turn);
            leader = (0, clandestineAlertService_1.addLeaderAlertEvent)(leader, alertEvent);
            newHuntNotifiedEarly = true;
            newParanoidNotifiedEarly = true;
        }
        // Case 2: Hunt New
        else if (isHuntActiveEarly && !huntNotifiedEarly) {
            console.log(`[CLANDESTINE] Creating HUNT_NETWORKS alert for ${leader.name}`);
            const alertEvent = (0, clandestineAlertService_1.createHuntNetworksEvent)(leader, location, turn);
            leader = (0, clandestineAlertService_1.addLeaderAlertEvent)(leader, alertEvent);
            newHuntNotifiedEarly = true;
        }
        // Case 3: Paranoid New
        else if (hasParanoidGovernorEarly && !paranoidNotifiedEarly) {
            console.log(`[CLANDESTINE] Creating PARANOID alert for ${leader.name}`);
            const alertEvent = (0, clandestineAlertService_1.createParanoidGovernorEvent)(leader, location, governorNameEarly, governorIdEarly, turn);
            leader = (0, clandestineAlertService_1.addLeaderAlertEvent)(leader, alertEvent);
            newParanoidNotifiedEarly = true;
        }
        // Reset logic (if condition stops)
        if (!isHuntActiveEarly && huntNotifiedEarly) {
            newHuntNotifiedEarly = false;
        }
        if (!hasParanoidGovernorEarly && paranoidNotifiedEarly) {
            newParanoidNotifiedEarly = false;
        }
        // Apply state updates if changed
        if (newHuntNotifiedEarly !== huntNotifiedEarly || newParanoidNotifiedEarly !== paranoidNotifiedEarly) {
            leader = {
                ...leader,
                pendingDetectionEffects: {
                    ...leader.pendingDetectionEffects,
                    huntNetworksNotified: newHuntNotifiedEarly,
                    paranoidGovernorNotified: newParanoidNotifiedEarly
                }
            };
        }
        // Update character in array after alert processing
        updatedCharacters[charIndex] = leader;
        // Identify governor (must be GOVERNING status)
        const governor = updatedCharacters.find(c => c.locationId === location.id &&
            c.faction === location.faction &&
            c.status === types_1.CharacterStatus.GOVERNING);
        // Check if agent's faction is AI-controlled (for timing purposes)
        // For now, assume this passed from outside or check a flag
        // In solo mode, all non-player factions are AI
        // We'll assume human control for now and let the timing flags handle it
        const isAIControlled = false; // TODO: Pass from turn processor context
        // Check which effects should apply based on notification timing
        // FIX (2026-01-24): Use INITIAL notification state (captured at start of loop) for risk calculation.
        // This ensures that if a Paranoid/Hunt alert is generated THIS turn, the penalty 
        // does NOT apply until next turn (1-turn grace period).
        // The 'leader' object itself HAS been updated with new alerts, so we construct a temporary context.
        const leaderForRiskCalc = {
            ...leader,
            pendingDetectionEffects: {
                ...leader.pendingDetectionEffects,
                huntNetworksNotified: huntNotifiedEarly,
                paranoidGovernorNotified: paranoidNotifiedEarly
            }
        };
        const effectsApply = (0, detectionLevelService_1.shouldEffectsApply)(leaderForRiskCalc, isAIControlled);
        // Calculate capture risk using new detection level system
        // Only include PARANOID/HUNT_NETWORKS if effects have been acknowledged
        const captureRisk = (0, detectionLevelService_1.calculateCaptureRisk)(leader, effectsApply.huntNetworksApplies ? location : { ...location, governorPolicies: { ...location.governorPolicies, HUNT_NETWORKS: false } }, effectsApply.paranoidApplies ? governor : undefined);
        // Convert to 0-1 range for roll comparison
        const riskProbability = captureRisk / 100;
        // Roll dice (0.0 to 1.0)
        const roll = Math.random();
        if (roll < riskProbability) {
            // CAUGHT! (Code omitted for brevity - logic remains same as original but emitted to `logs` directly as these are events)
            const leaderBudget = leader.clandestineBudget || leader.budget || 0;
            const controllerFaction = location.faction;
            const isDaredevil = leader.stats.ability.includes('DAREDEVIL');
            const escapes = isDaredevil && Math.random() < 0.5;
            if (leaderBudget > 0) {
                resourceUpdates[controllerFaction] = (resourceUpdates[controllerFaction] || 0) + leaderBudget;
                leader = { ...leader, budget: 0 };
            }
            if (escapes) {
                const friendlyLocations = updatedLocations.filter(l => l.faction === leader.faction);
                const escapeLoc = friendlyLocations.length > 0
                    ? friendlyLocations[Math.floor(Math.random() * friendlyLocations.length)]
                    : null;
                if (escapeLoc) {
                    leader = {
                        ...leader,
                        locationId: escapeLoc.id,
                        status: types_1.CharacterStatus.AVAILABLE,
                        activeClandestineActions: [],
                        armyId: null,
                        detectionLevel: 0,
                        pendingDetectionEffects: undefined
                    };
                    // Trigger Escape Alert Event (visible to player)
                    const escapeEvent = (0, clandestineAlertService_1.createEscapeEvent)(leader, location, escapeLoc, turn);
                    leader = (0, clandestineAlertService_1.addLeaderAlertEvent)(leader, escapeEvent);
                    // Opponent log logic remains (controller sees money seized)
                    logs.push({
                        id: `escape-controller-${turn}-${leader.id}`,
                        type: types_1.LogType.LEADER,
                        message: `We caught the enemy leader ${leader.name} in ${location.name}. ${leader.name === 'Alia' || leader.name === 'Lady Ethell' ? 'She' : 'He'} escaped, but ${leaderBudget}g was seized!`,
                        turn,
                        visibleToFactions: [controllerFaction],
                        baseSeverity: types_1.LogSeverity.GOOD,
                        i18nKey: 'clandestineEscapeController',
                        i18nParams: {
                            leader: leader.id,
                            location: location.id,
                            pronoun: leader.name === 'Alia' || leader.name === 'Lady Ethell' ? 'she' : 'he',
                            gold: leaderBudget
                        }
                    });
                    updatedCharacters[charIndex] = leader;
                    continue;
                }
            }
            // EXECUTION (If not escaped)
            leader = {
                ...leader,
                status: types_1.CharacterStatus.DEAD,
                locationId: 'graveyard',
                activeClandestineActions: [],
                armyId: null,
                detectionLevel: 0,
                pendingDetectionEffects: undefined
            };
            // Trigger Execution Alert Event (visible to player)
            const executionEvent = (0, clandestineAlertService_1.createExecutionEvent)(leader, location, turn);
            leader = (0, clandestineAlertService_1.addLeaderAlertEvent)(leader, executionEvent);
            // Opponent log logic remains (controller sees execution and money seized)
            logs.push({
                id: `exec-controller-${turn}-${leader.id}`,
                type: types_1.LogType.LEADER,
                message: `We arrested and executed the enemy leader ${leader.name} in ${location.name}. ${leaderBudget}g was seized!`,
                turn,
                visibleToFactions: [controllerFaction],
                baseSeverity: types_1.LogSeverity.GOOD,
                i18nKey: 'clandestineExecutionController',
                i18nParams: { leader: leader.id, location: location.id, gold: leaderBudget }
            });
            const otherFactions = [types_1.FactionId.NOBLES, types_1.FactionId.REPUBLICANS, types_1.FactionId.CONSPIRATORS]
                .filter(f => f !== leader.faction && f !== controllerFaction);
            logs.push({
                id: `exec-info-${turn}-${leader.id}`,
                type: types_1.LogType.LEADER,
                message: `${leader.name} of the ${leader.faction} was arrested and executed in ${location.name}.`,
                turn,
                visibleToFactions: otherFactions,
                baseSeverity: types_1.LogSeverity.INFO,
                i18nKey: 'clandestineExecutionInfo',
                i18nParams: { leader: leader.id, faction: leader.faction, location: location.id }
            });
            updatedCharacters[charIndex] = leader;
            continue;
        }
        // --------------------------------------------------------------------
        // 2. ACTION PROCESSING (If not caught)
        // --------------------------------------------------------------------
        // Skip action processing if no active actions (but Risk Calculation above ran!)
        if (activeActions.length === 0)
            continue;
        let leaderBudget = leader.clandestineBudget ?? leader.budget ?? 0;
        const actionsToRemove = [];
        // Process each active action
        for (const action of activeActions) {
            const cost = clandestineTypes_1.CLANDESTINE_ACTION_COSTS[action.actionId] ?? 0;
            // Deduct cost (unless one-time prepaid or 0)
            // ELITE_NETWORKS: Free actions if resentment < 50%
            const hasEliteNetworks = leader.stats.ability.includes('ELITE_NETWORKS');
            const eliteNetworksApplies = hasEliteNetworks &&
                (location.resentment?.[leader.faction] ?? 0) < 50 &&
                [
                    clandestineTypes_1.ClandestineActionId.UNDERMINE_AUTHORITIES,
                    clandestineTypes_1.ClandestineActionId.DISTRIBUTE_PAMPHLETS,
                    clandestineTypes_1.ClandestineActionId.SPREAD_PROPAGANDA
                ].includes(action.actionId);
            if (cost > 0 && !eliteNetworksApplies) {
                leaderBudget = Math.max(0, leaderBudget - cost);
            }
            // Process specific action effects
            switch (action.actionId) {
                case clandestineTypes_1.ClandestineActionId.UNDERMINE_AUTHORITIES: {
                    if ((0, undermineAuthorities_1.shouldDisableUndermineAuthorities)(leaderBudget, location.stability)) {
                        actionsToRemove.push(action.actionId);
                        break;
                    }
                    const result = (0, undermineAuthorities_1.processUndermineAuthorities)(leader, location, turn);
                    location = result.location;
                    if (result.log) {
                        // Category: Priority (Non-Critical)
                        routeLog(result.log, action.actionId, false, location, leader);
                    }
                    if ((0, undermineAuthorities_1.shouldDisableUndermineAuthorities)(leaderBudget, location.stability)) {
                        actionsToRemove.push(action.actionId);
                    }
                    break;
                }
                case clandestineTypes_1.ClandestineActionId.DISTRIBUTE_PAMPHLETS: {
                    if (leaderBudget <= 0 || (0, distributePamphlets_1.shouldDisableDistributePamphlets)(location)) {
                        actionsToRemove.push(action.actionId);
                        break;
                    }
                    const result = (0, distributePamphlets_1.processDistributePamphlets)(leader, location, turn);
                    location = result.location;
                    if (result.log) {
                        // Category: Priority
                        routeLog(result.log, action.actionId, false, location, leader);
                    }
                    if ((0, distributePamphlets_1.shouldDisableDistributePamphlets)(location)) {
                        actionsToRemove.push(action.actionId);
                    }
                    break;
                }
                case clandestineTypes_1.ClandestineActionId.SPREAD_PROPAGANDA: {
                    if (leaderBudget <= 0 || (0, spreadPropaganda_1.shouldDisableSpreadPropaganda)(location, leader.faction)) {
                        actionsToRemove.push(action.actionId);
                        break;
                    }
                    const result = (0, spreadPropaganda_1.processSpreadPropaganda)(leader, location, turn);
                    location = result.location;
                    if (result.log) {
                        // Category: Priority
                        routeLog(result.log, action.actionId, false, location, leader);
                    }
                    if ((0, spreadPropaganda_1.shouldDisableSpreadPropaganda)(location, leader.faction)) {
                        actionsToRemove.push(action.actionId);
                    }
                    break;
                }
                case clandestineTypes_1.ClandestineActionId.ASSASSINATE_LEADER: {
                    if (action.turnStarted === undefined) {
                        action.turnStarted = turn;
                        const oneTimeCost = action.oneTimeGoldAmount ?? 0;
                        leaderBudget = Math.max(0, leaderBudget - oneTimeCost);
                        // Apply instant detection increase for one-time action
                        const actionDef = clandestineTypes_1.CLANDESTINE_ACTIONS[action.actionId];
                        if (actionDef && actionDef.detectionType === 'one_time') {
                            leader = {
                                ...leader,
                                detectionLevel: (leader.detectionLevel ?? 0) + actionDef.detectionIncrease
                            };
                        }
                        break;
                    }
                    // 33% Reveal Check logic
                    const turnsElapsed = turn - action.turnStarted;
                    // Reveal Logic (only if hasn't happened / plot is ongoing)
                    // "33% chance each turn if not already revealed and not yet happened"
                    // Happened checked below (3 turns elapsed).
                    // So this runs for turns 0, 1, 2.
                    if (!action.isRevealed && turnsElapsed < 3) {
                        // Roll for reveal
                        if (Math.random() < 0.33) {
                            action.isRevealed = true;
                            // Generate Warning Log for Victim Faction
                            const targetId = action.targetLeaderId;
                            const target = updatedCharacters.find(c => c.id === targetId);
                            const targetName = target ? target.name : 'Unknown Leader';
                            // Log is for defender (target's faction usually owner or resident?)
                            // Spec says "Joueur contrôlant la cible".
                            // Assuming Target is in Location (verified later but reasonable guess here).
                            // We should check Target Faction.
                            const targetFaction = target?.faction || location.faction; // Fallback
                            const revealLog = {
                                id: `assess-reveal-${turn}-${leader.id}`,
                                type: types_1.LogType.LEADER,
                                message: `Reports say enemy agents in ${location.name} are planning to assassinate ${targetName}!`,
                                turn,
                                visibleToFactions: [targetFaction],
                                baseSeverity: types_1.LogSeverity.CRITICAL, // Defined as Critical Category in Spec
                                i18nKey: 'assassinateWarning',
                                i18nParams: { location: location.id, target: targetId }
                            };
                            // Add to buffer using Target Faction as key?
                            // Standard buffer key is Location/SourceFaction.
                            // Consolidator iterates Location/SourceFaction -> finds Logs.
                            // If we buffer it, we must ensure it's routed correct.
                            // Consolidator emits logs in `visibleToFactions`.
                            // So yes, buffer it.
                            addToBuffer(revealLog, action.actionId, true, location.id, leader.faction);
                        }
                    }
                    if (turnsElapsed < 3)
                        break;
                    actionsToRemove.push(action.actionId);
                    const targetId = action.targetLeaderId;
                    if (!targetId)
                        break;
                    const isAccessible = (0, assassinateLeader_1.isTargetAccessible)(targetId, location, updatedCharacters, updatedLocations);
                    if (!isAccessible) {
                        const gold = action.oneTimeGoldAmount ?? 0;
                        leaderBudget += gold;
                        logs.push({
                            id: `assassinate-abort-${turn}-${leader.id}`,
                            type: types_1.LogType.LEADER,
                            message: `Assassination aborted! Target out of reach. ${gold}g returned.`,
                            turn,
                            visibleToFactions: [leader.faction],
                            baseSeverity: types_1.LogSeverity.INFO,
                            i18nKey: 'assassinateAborted',
                            i18nParams: { gold }
                        });
                        break;
                    }
                    const target = updatedCharacters.find(c => c.id === targetId);
                    if (!target)
                        break;
                    const enemySoldiers = currentArmies
                        .filter(a => a.locationId === location.id && a.faction === location.faction)
                        .reduce((sum, a) => sum + a.strength, 0);
                    const chance = (0, assassinateLeader_1.calculateAssassinationChance)(location, action.oneTimeGoldAmount ?? 0, enemySoldiers);
                    const roll = Math.random() * 100;
                    if (roll <= chance) {
                        const targetIndex = updatedCharacters.findIndex(c => c.id === targetId);
                        if (targetIndex !== -1) {
                            updatedCharacters[targetIndex] = {
                                ...updatedCharacters[targetIndex],
                                status: types_1.CharacterStatus.DEAD,
                                locationId: 'graveyard',
                                activeClandestineActions: []
                            };
                        }
                        // Success logs - Event
                        logs.push({
                            id: `assassinate-success-${turn}-${leader.id}`,
                            type: types_1.LogType.LEADER,
                            message: `Success! ${target.name} was assassinated in ${location.name}!`,
                            turn,
                            visibleToFactions: [leader.faction],
                            baseSeverity: types_1.LogSeverity.GOOD,
                            i18nKey: 'assassinateSuccess',
                            i18nParams: { target: target.id, location: location.id }
                        });
                        // Victim Log - Critical
                        const victimLog = {
                            id: `assassinate-victim-${turn}-${targetId}`,
                            type: types_1.LogType.LEADER,
                            message: `${target.name} was murdered in ${location.name}!`,
                            turn,
                            visibleToFactions: [target.faction],
                            baseSeverity: types_1.LogSeverity.CRITICAL,
                            criticalForFactions: [target.faction],
                            i18nKey: 'assassinateVictim',
                            i18nParams: { target: target.id, location: location.id }
                        };
                        // Buffer it? It's critical, so yes.
                        // Wait, Assassination SUCCESS is likely an Event that shouldn't be suppressed?
                        // "Logs of category CRITICAL ... are always displayed".
                        addToBuffer(victimLog, action.actionId, true, location.id, leader.faction);
                    }
                    else {
                        // Failure - Warning
                        logs.push({
                            id: `assassinate-fail-${turn}-${leader.id}`,
                            type: types_1.LogType.LEADER,
                            message: `Assassination attempt on ${target.name} failed.`,
                            turn,
                            visibleToFactions: [leader.faction],
                            baseSeverity: types_1.LogSeverity.WARNING,
                            i18nKey: 'assassinateFail',
                            i18nParams: { target: target.id }
                        });
                    }
                    break;
                }
                case clandestineTypes_1.ClandestineActionId.ATTACK_TAX_CONVOYS: {
                    if ((0, attackTaxConvoys_1.shouldDisableAttackTaxConvoys)(leaderBudget)) {
                        actionsToRemove.push(action.actionId);
                        break;
                    }
                    const result = (0, attackTaxConvoys_1.processAttackTaxConvoys)(leader, location, locations, turn);
                    if (result.stolenAmount > 0) {
                        const victimFaction = location.faction;
                        resourceUpdates[victimFaction] = (resourceUpdates[victimFaction] || 0) - result.stolenAmount;
                        leaderBudget += result.stolenAmount;
                        if (result.log)
                            logs.push(result.log); // Attacker log
                        if (result.warningLog) {
                            // Priority Log
                            routeLog(result.warningLog, action.actionId, false, location, leader);
                        }
                    }
                    if ((0, attackTaxConvoys_1.shouldDisableAttackTaxConvoys)(leaderBudget)) {
                        actionsToRemove.push(action.actionId);
                    }
                    break;
                }
                case clandestineTypes_1.ClandestineActionId.STEAL_FROM_GRANARIES: {
                    if ((0, stealFromGranaries_1.shouldDisableStealFromGranaries)(leaderBudget)) {
                        actionsToRemove.push(action.actionId);
                        break;
                    }
                    const result = (0, stealFromGranaries_1.processStealFromGranaries)(leader, location, locations, turn);
                    if (result.destroyedAmount > 0 && result.targetLocationId) {
                        const targetLocIndex = updatedLocations.findIndex(l => l.id === result.targetLocationId);
                        if (targetLocIndex !== -1) {
                            updatedLocations[targetLocIndex] = {
                                ...updatedLocations[targetLocIndex],
                                foodStock: Math.max(0, (updatedLocations[targetLocIndex].foodStock || 0) - result.destroyedAmount)
                            };
                            if (result.log)
                                logs.push(result.log); // Attacker
                            if (result.warningLog) {
                                routeLog(result.warningLog, action.actionId, false, location, leader);
                            }
                        }
                    }
                    if ((0, stealFromGranaries_1.shouldDisableStealFromGranaries)(leaderBudget)) {
                        actionsToRemove.push(action.actionId);
                    }
                    break;
                }
                case clandestineTypes_1.ClandestineActionId.BURN_CROP_FIELDS: {
                    if ((0, burnOperations_1.shouldDisableBurnOperation)(leaderBudget, location.foodIncome)) {
                        actionsToRemove.push(action.actionId);
                        break;
                    }
                    const result = (0, burnOperations_1.processBurnOperation)(clandestineTypes_1.ClandestineActionId.BURN_CROP_FIELDS, leader, location, characters, turn);
                    if (result.resentmentIncrease > 0) {
                        const factionKey = leader.faction;
                        const currentResentment = location.resentment?.[factionKey] || 0;
                        const defaultResentment = {
                            [types_1.FactionId.NOBLES]: location.resentment?.[types_1.FactionId.NOBLES] || 0,
                            [types_1.FactionId.CONSPIRATORS]: location.resentment?.[types_1.FactionId.CONSPIRATORS] || 0,
                            [types_1.FactionId.REPUBLICANS]: location.resentment?.[types_1.FactionId.REPUBLICANS] || 0
                        };
                        location = {
                            ...location,
                            resentment: {
                                ...defaultResentment,
                                [factionKey]: Math.min(100, currentResentment + result.resentmentIncrease)
                            }
                        };
                    }
                    if (result.burnedAmount > 0) {
                        location = {
                            ...location,
                            burnedFields: (location.burnedFields || 0) + result.burnedAmount
                        };
                    }
                    if (result.log)
                        logs.push(result.log); // Attacker
                    if (result.feedbackLog) {
                        // Priority Log
                        routeLog(result.feedbackLog, action.actionId, false, location, leader);
                    }
                    if ((0, burnOperations_1.shouldDisableBurnOperation)(leaderBudget, location.foodIncome)) {
                        actionsToRemove.push(action.actionId);
                    }
                    break;
                }
                case clandestineTypes_1.ClandestineActionId.START_URBAN_FIRE: {
                    if ((0, burnOperations_1.shouldDisableBurnOperation)(leaderBudget, location.goldIncome)) {
                        actionsToRemove.push(action.actionId);
                        break;
                    }
                    const result = (0, burnOperations_1.processBurnOperation)(clandestineTypes_1.ClandestineActionId.START_URBAN_FIRE, leader, location, characters, turn);
                    if (result.resentmentIncrease > 0) {
                        const factionKey = leader.faction;
                        const currentResentment = location.resentment?.[factionKey] || 0;
                        const defaultResentment = {
                            [types_1.FactionId.NOBLES]: location.resentment?.[types_1.FactionId.NOBLES] || 0,
                            [types_1.FactionId.CONSPIRATORS]: location.resentment?.[types_1.FactionId.CONSPIRATORS] || 0,
                            [types_1.FactionId.REPUBLICANS]: location.resentment?.[types_1.FactionId.REPUBLICANS] || 0
                        };
                        location = {
                            ...location,
                            resentment: {
                                ...defaultResentment,
                                [factionKey]: Math.min(100, currentResentment + result.resentmentIncrease)
                            }
                        };
                    }
                    if (result.burnedAmount > 0) {
                        location = {
                            ...location,
                            burnedDistricts: (location.burnedDistricts || 0) + result.burnedAmount
                        };
                    }
                    if (result.log)
                        logs.push(result.log);
                    if (result.feedbackLog) {
                        routeLog(result.feedbackLog, action.actionId, false, location, leader);
                    }
                    if ((0, burnOperations_1.shouldDisableBurnOperation)(leaderBudget, location.goldIncome)) {
                        actionsToRemove.push(action.actionId);
                    }
                    break;
                }
                case clandestineTypes_1.ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS: {
                    try {
                        if ((0, inciteNeutralInsurrections_1.shouldDisableInciteNeutralInsurrections)(leaderBudget)) {
                            actionsToRemove.push(action.actionId);
                            break;
                        }
                        if (action.turnStarted === undefined) {
                            action.turnStarted = turn - 1;
                        }
                        const result = (0, inciteNeutralInsurrections_1.processInciteNeutralInsurrections)(leader, location, action, turn);
                        if (result.newArmy)
                            newArmies.push(result.newArmy);
                        if (result.popDeduction)
                            location = { ...location, population: Math.max(0, location.population - result.popDeduction) };
                        if (result.refund) {
                            resourceUpdates[leader.faction] = (resourceUpdates[leader.faction] || 0) + result.refund;
                        }
                        if (result.log)
                            logs.push(result.log); // Attacker
                        if (result.feedbackLog) {
                            // Category: CRITICAL
                            routeLog(result.feedbackLog, action.actionId, true, location, leader);
                        }
                        if ((0, inciteNeutralInsurrections_1.shouldDisableInciteNeutralInsurrections)(leaderBudget)) {
                            actionsToRemove.push(action.actionId);
                        }
                    }
                    catch (err) {
                        console.error("Error processing INCITE_NEUTRAL_INSURRECTIONS:", err);
                    }
                    break;
                }
                case clandestineTypes_1.ClandestineActionId.PREPARE_GRAND_INSURRECTION: {
                    // Sync local budget variable to leader object before passing it to the processor
                    // This ensures the processor sees the budget *after* other costs (like Scorched Earth) have been deducted
                    const leaderWithCurrentBudget = { ...leader, budget: leaderBudget };
                    const result = (0, prepareGrandInsurrection_1.processPrepareGrandInsurrection)(leaderWithCurrentBudget, location, action, currentArmies, updatedCharacters, turn);
                    location = result.updatedLocation;
                    leader = result.updatedLeader;
                    // Sync back the local budget variable from the updated leader
                    // This ensures that the deduction made by the processor (one-time cost) is preserved
                    if (leader.budget !== undefined) {
                        leaderBudget = leader.budget;
                    }
                    if (result.updatedArmies) {
                        currentArmies = result.updatedArmies;
                    }
                    if (result.newArmy) {
                        newArmies.push(result.newArmy);
                    }
                    if (result.log) {
                        // Grand Insurrection Log is CRITICAL for controller
                        routeLog(result.log, action.actionId, true, location, leader);
                    }
                    if (result.updatedAction) {
                        const actionIdx = activeActions.findIndex(a => a.actionId === action.actionId);
                        if (actionIdx !== -1) {
                            activeActions[actionIdx] = result.updatedAction;
                        }
                    }
                    if (result.isCompleted) {
                        actionsToRemove.push(action.actionId);
                    }
                    break;
                }
            }
        }
        // Update location in array
        updatedLocations[locationIndex] = location;
        // Remove disabled actions and update leader
        const remainingActions = activeActions.filter(a => !actionsToRemove.includes(a.actionId));
        // Apply detection level increase from active per-turn actions
        // Apply detection level increase from active per-turn actions
        let updatedLeader;
        // Only if leader is still UNDERCOVER or ON_MISSION
        if (leader.status === types_1.CharacterStatus.UNDERCOVER || leader.status === types_1.CharacterStatus.ON_MISSION) {
            let updatedLeaderState = (0, detectionLevelService_1.applyTurnDetectionIncrease)({
                ...leader,
                budget: leaderBudget,
                clandestineBudget: leaderBudget,
                activeClandestineActions: remainingActions.length > 0 ? remainingActions : undefined
            });
            // Check if threshold was just exceeded (wasn't before, now is)
            const wasExceeded = (0, detectionLevelService_1.isThresholdExceeded)(leader, location);
            const nowExceeded = (0, detectionLevelService_1.isThresholdExceeded)(updatedLeaderState, location);
            const alreadyNotified = updatedLeaderState.pendingDetectionEffects?.thresholdExceededNotified ?? false;
            if (nowExceeded && !alreadyNotified) {
                // Trigger threshold exceeded alert
                const alertEvent = (0, clandestineAlertService_1.createThresholdExceededEvent)(updatedLeaderState, location, turn);
                updatedLeaderState = (0, clandestineAlertService_1.addLeaderAlertEvent)(updatedLeaderState, alertEvent);
                // Mark as notified
                updatedLeaderState = {
                    ...updatedLeaderState,
                    pendingDetectionEffects: {
                        ...updatedLeaderState.pendingDetectionEffects,
                        thresholdExceededNotified: true
                    }
                };
            }
            else if (!nowExceeded && alreadyNotified) {
                // Reset notification if no longer exceeded (e.g. stealth increased)
                updatedLeaderState = {
                    ...updatedLeaderState,
                    pendingDetectionEffects: {
                        ...updatedLeaderState.pendingDetectionEffects,
                        thresholdExceededNotified: false
                    }
                };
            }
            updatedLeader = updatedLeaderState;
        }
        else {
            // Leader status changed (e.g. became AVAILABLE after Grand Insurrection)
            // Just update budget/actions
            updatedLeader = {
                ...leader,
                budget: leaderBudget,
                clandestineBudget: leaderBudget,
                activeClandestineActions: remainingActions.length > 0 ? remainingActions : undefined
            };
        }
        updatedCharacters[charIndex] = updatedLeader;
    }
    // Consolidate logs
    const consolidated = (0, clandestineLogConsolidator_1.consolidateClandestineLogs)(logBuffer);
    logs.push(...consolidated);
    return {
        characters: updatedCharacters,
        locations: updatedLocations,
        logs,
        resourceUpdates,
        newArmies,
        armies: currentArmies
    };
}
