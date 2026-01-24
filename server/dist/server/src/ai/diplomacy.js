"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manageDiplomacy = void 0;
const types_1 = require("../../../shared/types");
const constants_1 = require("../../../shared/constants");
const utils_1 = require("./utils");
const leaders_config_1 = require("./leaders_config");
const logFactory_1 = require("../../../shared/services/logs/logFactory");
// Helper to determine how valuable a leader is to keep on the field
const getLeaderValue = (char) => {
    let value = 0;
    value += (char.stats.commandBonus || 0) * 200;
    // Stability Value Logic
    if (char.stats.stabilityPerTurn < 0)
        value -= 200;
    else
        value += char.stats.stabilityPerTurn * 10;
    const isFirebrand = char.stats.ability.includes('FIREBRAND');
    const isLegendary = char.stats.ability.includes('LEGENDARY');
    // VIP Protection (User Request)
    // These leaders are critical for stability and should NOT be sent on missions easily
    const profile = (0, leaders_config_1.getLeaderProfile)(char.name, char.id);
    if (profile?.isVIP) {
        value += 1000; // Massive penalty to being selected (since we sort ascending by value)
    }
    if (isLegendary) {
        value += isFirebrand ? 50 : 150;
    }
    if (char.stats.ability.includes('MANAGER'))
        value += 50;
    if (isFirebrand)
        value -= 20;
    return value;
};
const manageDiplomacy = (state, faction, goals, // Deprecated in favor of missions
profile, budget, disableInsurrections = false) => {
    let updates = {
        resources: { ...state.resources },
        characters: [...state.characters],
        locations: [...state.locations],
        pendingNegotiations: [...state.pendingNegotiations],
        logs: [...(state.logs || [])],
        aiState: { ...state.aiState } // Needed to update mission status
    };
    let currentGold = budget.allocations.diplomacy;
    const missions = state.aiState?.[faction]?.missions || [];
    // Filter diplomacy missions
    const diploMissions = missions.filter(m => ((m.type === 'INSURRECTION' && !disableInsurrections) || m.type === 'NEGOTIATE') &&
        m.status !== 'COMPLETED' && m.status !== 'FAILED');
    // Sort by priority
    diploMissions.sort((a, b) => b.priority - a.priority);
    for (const mission of diploMissions) {
        if (mission.type === 'INSURRECTION') {
            currentGold = handleInsurrection(mission, state, faction, updates, currentGold);
        }
        else if (mission.type === 'NEGOTIATE') {
            currentGold = handleNegotiation(mission, state, faction, updates, currentGold);
        }
    }
    // Calculate how much was actually spent and deduct it from resources
    const diplomacySpent = budget.allocations.diplomacy - currentGold;
    if (diplomacySpent > 0) {
        updates.resources[faction].gold = Math.max(0, state.resources[faction].gold - diplomacySpent);
        console.log(`[AI DIPLOMACY ${faction}] Spent ${diplomacySpent} gold on diplomacy. Remaining: ${updates.resources[faction].gold}`);
    }
    return updates;
};
exports.manageDiplomacy = manageDiplomacy;
function handleInsurrection(mission, state, faction, updates, currentGold) {
    if (currentGold < constants_1.COST_INCITE)
        return currentGold;
    if (mission.status === 'COMPLETED')
        return currentGold;
    // Check if spy already assigned
    const assignedSpy = updates.characters.find(c => c.faction === faction &&
        c.status === types_1.CharacterStatus.ON_MISSION &&
        c.missionData?.targetLocationId === mission.targetId);
    if (assignedSpy) {
        mission.status = 'ACTIVE';
        return currentGold;
    }
    // Need to assign spy
    const availableSpies = updates.characters.filter(c => c.faction === faction && c.status === types_1.CharacterStatus.AVAILABLE && !c.armyId);
    // Sort spies (Prioritize useless/negative ones first)
    availableSpies.sort((a, b) => getLeaderValue(a) - getLeaderValue(b));
    if (availableSpies.length === 0) {
        // DETACHMENT LOGIC (Updated)
        // 1. Leaders WITHOUT any COMMANDER role should ALWAYS be detached for insurrections
        // 2. Other leaders only detach if priority > 60 (lowered from 80)
        const attachedLeaders = updates.characters.filter(c => c.faction === faction && c.status === types_1.CharacterStatus.AVAILABLE && c.armyId);
        for (const candidate of attachedLeaders) {
            const profile = (0, leaders_config_1.getLeaderProfile)(candidate.name, candidate.id);
            const isNonCommander = !(0, leaders_config_1.hasCommanderRole)(profile);
            // Non-commanders always detach, others only if high priority
            if (isNonCommander || mission.priority > 60) {
                console.log(`[AI DIPLOMACY ${faction}] Detaching ${candidate.name} from army for Insurrection (Non-commander: ${isNonCommander}, Priority: ${mission.priority})`);
                const cIdx = updates.characters.findIndex(x => x.id === candidate.id);
                if (cIdx !== -1) {
                    updates.characters[cIdx] = { ...candidate, armyId: null };
                    availableSpies.push(updates.characters[cIdx]);
                    break; // Only detach one at a time
                }
            }
        }
        // Sort again after adding detached leader
        availableSpies.sort((a, b) => getLeaderValue(a) - getLeaderValue(b));
        // CANCELLATION LOGIC
        // If still no spies, check age
        const createdTurn = parseInt(mission.id.split('_').pop() || '0');
        const age = state.turn - createdTurn;
        if (availableSpies.length === 0) {
            if (age > 5) {
                console.log(`[AI DIPLOMACY ${faction}] Cancelling stale insurrection mission ${mission.id} (Age: ${age})`);
                mission.status = 'FAILED';
            }
            return currentGold;
        }
    }
    // Check target conditions
    const targetLoc = state.locations.find(l => l.id === mission.targetId);
    if (!targetLoc || targetLoc.faction === faction) {
        mission.status = 'COMPLETED'; // Already done or invalid
        return currentGold;
    }
    // Legendary defender check
    const legendaryDefender = state.characters.some(c => c.locationId === mission.targetId &&
        c.faction !== faction &&
        (c.stats.ability.includes('LEGENDARY') || c.name === 'Sir Haraldic'));
    if (legendaryDefender) {
        mission.status = 'FAILED';
        return currentGold;
    }
    // Select Spy
    // Filter out VIPs if priority is not high
    let candidate = availableSpies[0];
    const candidateProfile = (0, leaders_config_1.getLeaderProfile)(candidate.name, candidate.id);
    // If the best candidate is a VIP, check if mission is worth it
    if (candidateProfile?.isVIP) {
        // --- STABILITY CHECK (HOME) ---
        let blockedByStability = false;
        const homeLoc = state.locations.find(l => l.id === candidate.locationId);
        if (homeLoc && homeLoc.faction === faction) {
            if (homeLoc.stability < 80)
                blockedByStability = true;
            else if (homeLoc.linkedLocationId) {
                const linked = state.locations.find(l => l.id === homeLoc.linkedLocationId);
                if (linked && linked.faction === faction && linked.stability < 80)
                    blockedByStability = true;
            }
        }
        if (blockedByStability) {
            // VIP cannot leave!
            const substitute = availableSpies.find(c => {
                const p = (0, leaders_config_1.getLeaderProfile)(c.name, c.id);
                return !p?.isVIP;
            });
            if (substitute)
                candidate = substitute;
            else {
                console.log(`[AI DIPLOMACY ${faction}] Aborting Insurrection - VIP ${candidate.name} needed at home (Stability < 80)`);
                return currentGold;
            }
        }
        else if (mission.priority < 80) { // "Huge gains" threshold
            // Try to find a non-VIP
            const nonVIP = availableSpies.find(c => {
                const p = (0, leaders_config_1.getLeaderProfile)(c.name, c.id);
                return !p?.isVIP;
            });
            if (nonVIP) {
                candidate = nonVIP;
            }
            else {
                // No one else available. Skip mission to save VIP?
                // Spec says "ne sont envoyés... que si les gains espérés sont énormes"
                // So we abort.
                console.log(`[AI DIPLOMACY ${faction}] Aborting Insurrection - Only VIP ${candidate.name} available but priority ${mission.priority} < 80`);
                return currentGold;
            }
        }
    }
    const spy = candidate;
    // Execute - AI spends 100-500 gold based on priority and available budget
    // Higher priority missions get more funding, low stability targets need less
    const targetStability = targetLoc.stability || 50;
    let baseSpend = 200; // Default spend
    // Adjust based on priority (high priority = spend more)
    if (mission.priority >= 80)
        baseSpend = 500;
    else if (mission.priority >= 60)
        baseSpend = 400;
    else if (mission.priority >= 40)
        baseSpend = 300;
    // Reduce spend if target is already unstable (less gold needed)
    if (targetStability <= 30)
        baseSpend = Math.min(baseSpend, 200);
    else if (targetStability <= 50)
        baseSpend = Math.min(baseSpend, 300);
    // Clamp to available gold and 100-500 range
    const goldSpent = Math.max(100, Math.min(currentGold, baseSpend, 500));
    const costReduction = spy.bonuses?.costReduction || 0;
    const actualCost = Math.floor(goldSpent * (1 - costReduction));
    if (currentGold < actualCost)
        return currentGold;
    // Apply Cost & State
    currentGold -= actualCost;
    const charIdx = updates.characters.findIndex(c => c.id === spy.id);
    if (charIdx > -1) {
        updates.characters[charIdx] = {
            ...spy,
            status: types_1.CharacterStatus.ON_MISSION,
            locationId: "Traveling",
            turnsUntilArrival: 4,
            missionData: { targetLocationId: mission.targetId, goldSpent }
        };
    }
    // Mark location (heuristic usage of existing property)
    const locIdx = updates.locations.findIndex(l => l.id === mission.targetId);
    if (locIdx > -1) {
        const loc = updates.locations[locIdx];
        updates.locations[locIdx] = {
            ...loc,
            actionsTaken: { ...(loc.actionsTaken || {}), incite: 1 }
        };
    }
    // Use specialized log with faction-aware visibility and highlight
    updates.logs.push((0, logFactory_1.createInsurrectionPreparationLog)(spy.name, targetLoc.name, mission.targetId, targetLoc.faction, state.turn));
    mission.status = 'ACTIVE';
    return currentGold;
}
function handleNegotiation(mission, state, faction, updates, currentGold) {
    // Only Republicans/Conspirators
    if (faction === types_1.FactionId.NOBLES) {
        mission.status = 'FAILED';
        return currentGold;
    }
    const targetLoc = state.locations.find(l => l.id === mission.targetId);
    if (!targetLoc || targetLoc.faction !== 'NEUTRAL') {
        mission.status = 'COMPLETED';
        return currentGold;
    }
    // Negotiation Cost
    const NEGOTIATION_COST = 100;
    if (currentGold < NEGOTIATION_COST) {
        if (state.turn % 5 === 0)
            console.log(`[AI DIPLOMACY ${faction}] Skipping negotiation - Insufficient Gold (${currentGold})`);
        return currentGold;
    }
    // Check if we already negotiated this turn (limit)
    // Actually we can check if pendingNegotiations has an entry for this location/faction
    const pending = updates.pendingNegotiations.some(n => n.targetLocationId === mission.targetId && n.factionId === faction);
    if (pending) {
        mission.status = 'ACTIVE'; // Already doing it
        return currentGold;
    }
    // Start Negotiation
    currentGold -= NEGOTIATION_COST;
    // Food Aid Logic (Spec 5.1): If we have surplus food nearby, offer it for massive bonus
    let foodOffer = 0;
    const foodSourceIds = [];
    // Find nearby city with surplus food
    const nearbyCities = updates.locations.filter(l => l.faction === faction &&
        l.type === types_1.LocationType.CITY &&
        l.foodStock > 150 && // User Threshold: 150 (Restored)
        l.foodIncome > 0 && // Must have positive flow (Restored)
        (0, utils_1.getDistance)(l.id, mission.targetId, state.roads) <= 3 // Close enough for logistics
    );
    if (nearbyCities.length > 0) {
        // Take from the one with most food
        nearbyCities.sort((a, b) => b.foodStock - a.foodStock);
        const source = nearbyCities[0];
        const amount = 100; // User fixed amount: 100 bushels
        if (source.foodStock >= 150) { // LOW THRESHOLD: 150 (Restored)
            foodOffer = amount;
            // Deduct immediately (conceptually "shipping it out")
            const sIdx = updates.locations.findIndex(l => l.id === source.id);
            if (sIdx !== -1) {
                updates.locations[sIdx] = {
                    ...source,
                    foodStock: source.foodStock - amount
                };
                foodSourceIds.push(source.id);
                // AI food aid log removed - AI actions don't generate logs
            }
        }
    }
    updates.pendingNegotiations.push({
        targetLocationId: mission.targetId,
        factionId: faction,
        goldOffer: NEGOTIATION_COST,
        foodOffer: foodOffer,
        foodSourceCityIds: foodSourceIds,
        turnsRemaining: 3
    });
    // We effectively just "pushed" the negotiation. The result is handled by TurnProcessor usually.
    // "Negotiations take time or depend on RNG/Influence"
    // For now, we just spend gold to try.
    // AI negotiation log removed - negotiations result log is generated elsewhere when completed
    mission.status = 'ACTIVE';
    return currentGold;
}
