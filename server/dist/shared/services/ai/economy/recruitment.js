"use strict";
/**
 * Shared Recruitment Module - AI troop recruitment logic
 *
 * Handles strategic recruitment based on threats, massing points, and income.
 * Integrates with insurrection defense to prioritize threatened zones.
 * Supports CONSCRIPTION ability for discounted recruitment.
 *
 * Used by both Application (solo) and Server (multiplayer).
 *
 * @module shared/services/ai/economy/recruitment
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRecruitment = handleRecruitment;
const types_1 = require("../../../types");
const constants_1 = require("../../../constants");
const ConscriptionPrioritizer_1 = require("../leaders/recruitment/ConscriptionPrioritizer");
const conscription_1 = require("../../domain/military/conscription");
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Find adjacent territories that can serve as recruitment sources for a threatened zone.
 * Avoids recruiting directly in threatened zones (would lower stability).
 */
function findRecruitmentSourcesForThreat(threatenedLocationId, locations, faction) {
    const threatenedLoc = locations.find(l => l.id === threatenedLocationId);
    if (!threatenedLoc)
        return [];
    const sources = [];
    // Add linked location (city/rural pair - instant travel)
    if (threatenedLoc.linkedLocationId) {
        const linked = locations.find(l => l.id === threatenedLoc.linkedLocationId);
        if (linked && linked.faction === faction && linked.population >= 2000) {
            sources.push(linked);
        }
    }
    return sources;
}
/**
 * Calculate recruitment priority for a target.
 */
function calculateRecruitmentPriority(target, armies, faction) {
    let priority = 0;
    // Base priority by reason
    switch (target.reason) {
        case 'INSURRECTION_ADJACENT':
            priority = 200; // Highest - adjacent to imminent threat
            break;
        case 'INSURRECTION_DIRECT':
            priority = 50; // Lower - direct recruitment in threatened zone (last resort)
            break;
        case 'MASSING':
            priority = 100; // High - existing army to reinforce
            break;
        case 'THREAT':
            priority = 80; // Medium - low stability zone
            break;
        case 'INCOME':
            priority = 60; // Base - good for economy
            break;
    }
    // Bonus for cities
    if (target.location.type === 'CITY') {
        priority += 20;
    }
    // Bonus for existing garrison (massing point)
    const garrison = armies
        .filter(a => a.locationId === target.location.id && a.faction === faction)
        .reduce((sum, a) => sum + a.strength, 0);
    if (garrison > 0) {
        priority += Math.min(50, garrison / 100); // Up to +50 for large garrison
    }
    // Penalty for low population (running out of recruits)
    if (target.location.population < 5000) {
        priority -= 30;
    }
    return priority;
}
// ============================================================================
// MAIN FUNCTION
// ============================================================================
/**
 * Handle troop recruitment for AI faction.
 *
 * Priority: Insurrection defense > Massing points > Low stability zones > High income
 * Supports CONSCRIPTION ability for discounted recruitment (15g instead of 50g).
 *
 * @param faction - Faction recruiting
 * @param locations - Locations array (modified in place)
 * @param armies - Armies array (modified in place)
 * @param roads - Roads array (for immediate dispatch)
 * @param budget - AI budget (minimal interface)
 * @param profile - Faction personality (minimal interface)
 * @param turn - Current game turn
 * @param currentGold - Available gold for spending
 * @param insurrectionAlerts - Optional alerts from insurrection defense module
 * @param characters - Leaders array for CONSCRIPTION discount check
 * @returns Recruitment result with remaining gold and updated characters
 */
function handleRecruitment(faction, locations, armies, roads, budget, profile, turn, currentGold, insurrectionAlerts = [], characters = []) {
    const targets = [];
    // Clone characters to avoid mutation
    const updatedCharacters = [...characters];
    let recruitmentsPerformed = 0;
    let conscriptionsPerformed = 0;
    // Get conscription opportunities
    const conscriptionResult = (0, ConscriptionPrioritizer_1.getConscriptionPrioritizedLocations)(faction, { locations, characters: updatedCharacters });
    const conscriptionLocIds = new Set(conscriptionResult.prioritizedLocations.map(cl => cl.locationId));
    const threatenedLocationIds = new Set(insurrectionAlerts.map(a => a.locationId));
    // Track imminent threats for budget boost
    const imminentThreats = insurrectionAlerts.filter(a => a.turnsUntilThreat <= 1);
    const hasImminentThreat = imminentThreats.length > 0;
    // 1. Add recruitment sources for insurrection threats (adjacent territories)
    for (const alert of insurrectionAlerts) {
        const sources = findRecruitmentSourcesForThreat(alert.locationId, locations, faction);
        for (const source of sources) {
            // Check if we can recruit here
            if (!source.actionsTaken || source.actionsTaken.recruit < 4) {
                targets.push({
                    location: source,
                    priority: 200 + (5 - alert.turnsUntilThreat) * 20, // More urgent = higher priority
                    reason: 'INSURRECTION_ADJACENT',
                    linkedThreatenedLocationId: alert.locationId
                });
            }
        }
        // Also allow direct recruitment in threatened zone as fallback (lower priority)
        const threatenedLoc = locations.find(l => l.id === alert.locationId);
        if (threatenedLoc &&
            threatenedLoc.faction === faction &&
            threatenedLoc.population >= 2000 &&
            (!threatenedLoc.actionsTaken || threatenedLoc.actionsTaken.recruit < 4)) {
            targets.push({
                location: threatenedLoc,
                priority: 50,
                reason: 'INSURRECTION_DIRECT'
            });
        }
    }
    // 2. Add normal recruitment targets (massing, threat, income)
    const ownedLocations = locations.filter(l => l.faction === faction &&
        l.population >= 2000 &&
        (!l.actionsTaken || l.actionsTaken.recruit < 4) &&
        !threatenedLocationIds.has(l.id) // Skip if already added as threatened
    );
    for (const loc of ownedLocations) {
        const garrison = armies
            .filter(a => a.locationId === loc.id && a.faction === faction)
            .reduce((sum, a) => sum + a.strength, 0);
        let reason = 'INCOME';
        if (garrison > 500) {
            reason = 'MASSING';
        }
        else if (loc.stability < 50) {
            reason = 'THREAT';
        }
        targets.push({
            location: loc,
            priority: calculateRecruitmentPriority({ location: loc, priority: 0, reason }, armies, faction),
            reason
        });
    }
    // 3. Sort by priority (highest first), then apply CONSCRIPTION priority boost
    targets.sort((a, b) => {
        const aIsConscription = conscriptionLocIds.has(a.location.id);
        const bIsConscription = conscriptionLocIds.has(b.location.id);
        // CONSCRIPTION locations get +500 priority to ensure they're used first
        const aPriority = a.priority + (aIsConscription ? 500 : 0);
        const bPriority = b.priority + (bIsConscription ? 500 : 0);
        if (aIsConscription !== bIsConscription) {
            console.log(`[AI CONSCRIPTION] ${aIsConscription ? a.location.name : b.location.name} prioritized (Conscription available)`);
        }
        return bPriority - aPriority;
    });
    // 4. Deduplicate (same location may appear multiple times)
    const seenLocations = new Set();
    const uniqueTargets = targets.filter(t => {
        if (seenLocations.has(t.location.id))
            return false;
        seenLocations.add(t.location.id);
        return true;
    });
    // Log recruitment plan
    if (insurrectionAlerts.length > 0) {
        console.log(`[AI RECRUITMENT ${faction}] Insurrection alerts: ${insurrectionAlerts.length}, prioritizing adjacent defense`);
    }
    // 5. Execute recruitment
    for (const target of uniqueTargets) {
        const loc = target.location;
        // Check if this is a conscription action
        const isConscription = conscriptionLocIds.has(loc.id);
        const actionCost = isConscription ? conscription_1.CONSCRIPTION_GOLD_COST : constants_1.RECRUIT_COST;
        // Reserve calculation
        let minReserve = 100;
        const isRepublicanEarlyGame = faction === types_1.FactionId.REPUBLICANS && turn <= 3;
        if (isRepublicanEarlyGame) {
            minReserve = 0;
        }
        // Check affordability
        if (currentGold < actionCost + minReserve)
            break;
        const canUseReserve = (profile.aggressiveness > 0.7 || isRepublicanEarlyGame);
        if (!canUseReserve && currentGold < actionCost + 200)
            break;
        // Emergency spending for imminent threats
        if (hasImminentThreat && target.reason === 'INSURRECTION_ADJACENT') {
            if (currentGold < actionCost)
                break;
        }
        // Execute Recruitment / Conscription
        currentGold -= actionCost;
        // Update location
        loc.population -= constants_1.RECRUIT_AMOUNT;
        if (isConscription) {
            // Apply stability penalty
            loc.stability = Math.max(0, loc.stability - conscription_1.CONSCRIPTION_STABILITY_COST);
            // Mark leader as used
            const conscriptionLoc = conscriptionResult.prioritizedLocations.find(l => l.locationId === loc.id);
            if (conscriptionLoc && conscriptionLoc.leaderIds.length > 0) {
                const leaderId = conscriptionLoc.leaderIds[0];
                const leaderIndex = updatedCharacters.findIndex(c => c.id === leaderId);
                if (leaderIndex >= 0) {
                    updatedCharacters[leaderIndex] = {
                        ...updatedCharacters[leaderIndex],
                        usedConscriptionThisTurn: true
                    };
                }
            }
            console.log(`[AI RECRUITMENT ${faction}] Conscripted in ${loc.name} (-${conscription_1.CONSCRIPTION_GOLD_COST}g, -${conscription_1.CONSCRIPTION_STABILITY_COST} stab)`);
            conscriptionsPerformed++;
        }
        else {
            console.log(`[AI RECRUITMENT ${faction}] Recruited in ${loc.name} (-${constants_1.RECRUIT_COST}g)`);
            recruitmentsPerformed++;
        }
        if (!loc.actionsTaken) {
            loc.actionsTaken = { recruit: 0, seizeGold: 0, seizeFood: 0, incite: 0 };
        }
        loc.actionsTaken.recruit += 1;
        // Create or merge army
        const existingArmy = armies.find(a => a.faction === faction &&
            a.locationId === loc.id &&
            a.locationType === 'LOCATION' &&
            !a.isSpent && !a.isSieging && !a.isInsurgent && !a.action);
        if (existingArmy) {
            existingArmy.strength += constants_1.RECRUIT_AMOUNT;
        }
        else {
            armies.push({
                id: `ai_reg_${Math.random()}`,
                faction,
                locationType: 'LOCATION',
                locationId: loc.id,
                roadId: null,
                stageIndex: 0,
                direction: 'FORWARD',
                originLocationId: loc.id,
                destinationId: null,
                turnsUntilArrival: 0,
                strength: constants_1.RECRUIT_AMOUNT,
                isInsurgent: false,
                isSpent: false,
                isSieging: false,
                foodSourceId: loc.id,
                lastSafePosition: { type: 'LOCATION', id: loc.id }
            });
        }
        // Immediate dispatch for insurrection defense
        if (target.reason === 'INSURRECTION_ADJACENT' && target.linkedThreatenedLocationId) {
            console.log(`[AI RECRUITMENT ${faction}] Recruited in ${loc.name} to defend ${target.linkedThreatenedLocationId}`);
            // Immediate dispatch to threatened location via LOCAL road
            const road = roads.find(r => (r.from === loc.id && r.to === target.linkedThreatenedLocationId) ||
                (r.to === loc.id && r.from === target.linkedThreatenedLocationId));
            if (road && road.quality === types_1.RoadQuality.LOCAL) {
                // Find the army we just recruited into (or created)
                const armyToMove = armies.find(a => a.faction === faction &&
                    a.locationId === loc.id &&
                    a.locationType === 'LOCATION' &&
                    !a.isSpent && !a.isSieging && !a.isInsurgent);
                if (armyToMove) {
                    // DILEMMA CHECK: Prioritize CITY over RURAL
                    const threatenedLoc = locations.find(l => l.id === target.linkedThreatenedLocationId);
                    const sourceLoc = locations.find(l => l.id === loc.id);
                    const sourceAlsoThreatened = threatenedLocationIds.has(loc.id);
                    const sourceIsCity = sourceLoc?.type === 'CITY';
                    const targetIsCity = threatenedLoc?.type === 'CITY';
                    // Priority: CITY > RURAL. Move UNLESS source is threatened city and target is rural
                    const shouldMove = !sourceAlsoThreatened || (targetIsCity && !sourceIsCity);
                    if (shouldMove) {
                        armyToMove.locationId = target.linkedThreatenedLocationId;
                        armyToMove.originLocationId = target.linkedThreatenedLocationId;
                        armyToMove.foodSourceId = target.linkedThreatenedLocationId;
                        armyToMove.lastSafePosition = { type: 'LOCATION', id: target.linkedThreatenedLocationId };
                        armyToMove.justMoved = true;
                        console.log(`[AI RECRUITMENT ${faction}] IMMEDIATE DISPATCH: Moved troops to ${target.linkedThreatenedLocationId} via LOCAL road`);
                    }
                    else {
                        console.log(`[AI RECRUITMENT ${faction}] DILEMMA: Keeping troops at ${loc.name} (city defense priority)`);
                    }
                }
            }
        }
    }
    return {
        remainingGold: currentGold,
        updatedCharacters,
        recruitmentsPerformed,
        conscriptionsPerformed
    };
}
