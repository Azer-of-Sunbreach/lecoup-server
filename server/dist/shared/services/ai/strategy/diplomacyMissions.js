"use strict";
// Diplomacy Missions Module - INSURRECTION, NEGOTIATE, STABILIZE missions
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDiplomacyMissions = generateDiplomacyMissions;
const types_1 = require("../../../types");
const types_2 = require("./types");
/**
 * Generate diplomacy-related missions: INSURRECTION, NEGOTIATE, STABILIZE.
 *
 * @param state - Current game state
 * @param faction - Faction to generate for
 * @param theaters - Analyzed theaters
 * @param profile - Faction personality
 * @param activeMissions - Current active missions (modified in place)
 */
function generateDiplomacyMissions(state, faction, theaters, profile, activeMissions) {
    const activeDiplomacy = activeMissions.filter(m => m.type === 'INSURRECTION' || m.type === 'NEGOTIATE');
    // Cap at 12 diplomatic missions
    if (activeDiplomacy.length >= 12)
        return;
    if (profile.subversiveness > 0.3) {
        generateInsurrectionMissions(state, faction, profile, activeMissions);
        generateNegotiateMissions(state, faction, theaters, profile, activeMissions);
    }
    generateStabilizeMissions(state, faction, activeMissions);
}
/**
 * Generate INSURRECTION missions against enemy factions.
 *
 * Strategy:
 * - Cooldown: 4 turns per target per faction
 * - Softening: Bonus for targets already destabilized (40-60% stability)
 * - Firebrands: Should be used on targets already softened (< 50% stability)
 *
 * Republicans can generate up to 2 per turn (their specialty).
 */
function generateInsurrectionMissions(state, faction, profile, activeMissions) {
    // Republicans limited to 2 new insurrections per turn (their specialty)
    // Other factions: unlimited but less aggressive
    const maxNew = faction === types_1.FactionId.REPUBLICANS ? 2 : 1;
    // Count how many we've already created this turn
    let newInsurrectionsThisTurn = activeMissions.filter(m => m.type === 'INSURRECTION' &&
        parseInt(m.id.split('_').pop() || '0') === state.turn).length;
    // Loop to generate up to maxNew insurrections
    while (newInsurrectionsThisTurn < maxNew) {
        // Find valid targets with cooldown check
        const targets = state.locations.filter(l => {
            if (l.faction === faction || l.faction === 'NEUTRAL')
                return false;
            if (l.stability >= 70)
                return false;
            if (activeMissions.some(m => m.targetId === l.id && m.type === 'INSURRECTION'))
                return false;
            // COOLDOWN CHECK: 4 turns between insurrections on same target by same faction
            const lastInsurrectionTurn = getLastInsurrectionTurn(state, faction, l.id);
            if (lastInsurrectionTurn >= 0 && state.turn - lastInsurrectionTurn < 4) {
                return false; // Still in cooldown
            }
            return true;
        });
        if (targets.length === 0)
            break; // No more valid targets
        // Score targets with SOFTENING strategy
        const scoredTargets = targets.map(t => {
            let score = 100 - t.stability;
            score += t.population / 2000;
            // Boost if supporting a campaign
            if (activeMissions.some(m => m.type === 'CAMPAIGN' && m.targetId === t.id)) {
                score += 50;
            }
            if (t.type === 'CITY')
                score += 30;
            // Faction-specific priorities
            const priorities = types_2.INSURRECTION_PRIORITIES[faction] || [];
            if (priorities.includes(t.id))
                score += 60;
            // SOFTENING STRATEGY: Bonus for targets in "ripe" zone (40-60% stability)
            // These have already been weakened and are prime for another strike
            if (t.stability >= 40 && t.stability <= 60) {
                score += 35; // Significant bonus for follow-up attacks
            }
            // Targets very close to flipping (<40% stability) are highest priority
            if (t.stability < 40) {
                score += 45; // Maximum priority - time to strike
            }
            // Check if we've previously targeted this location (softening history)
            const previousAttempts = countPreviousInsurrections(state, faction, t.id);
            if (previousAttempts > 0 && previousAttempts < 3) {
                score += 20; // Bonus for continuation of softening campaign
            }
            // PORT-RURAL PAIRING STRATEGY (Fix 3)
            // Bonus for completing control of port-rural pairs (enables supply chains)
            const portRuralPairs = {
                'port_de_sable': 'northern_barony', 'northern_barony': 'port_de_sable',
                'gre_au_vent': 'larion_islands', 'larion_islands': 'gre_au_vent',
                'mirebridge': 'esmarch_duchy', 'esmarch_duchy': 'mirebridge',
                'sunbreach': 'sunbreach_lands', 'sunbreach_lands': 'sunbreach',
            };
            const linkedPair = portRuralPairs[t.id];
            if (linkedPair) {
                const pairLocation = state.locations.find(l => l.id === linkedPair);
                if (pairLocation?.faction === faction) {
                    // Faction controls the pair! High priority to complete the set
                    score += 40;
                }
            }
            return { target: t, score };
        }).sort((a, b) => b.score - a.score);
        // Check if best target meets threshold
        if (scoredTargets.length === 0 || scoredTargets[0].score <= 40)
            break;
        const best = scoredTargets[0];
        // Determine if we should request a Firebrand (for softened targets)
        const shouldUseFirebrand = best.target.stability < 50;
        activeMissions.push({
            id: `insurrect_${best.target.id}_${state.turn}`,
            type: 'INSURRECTION',
            priority: 60 + (best.score / 2),
            status: 'PLANNING',
            targetId: best.target.id,
            stage: 'PLANNING',
            assignedArmyIds: [],
            data: {
                requiredGold: 200,
                preferFirebrand: shouldUseFirebrand,
                isSofteningAttack: best.target.stability >= 40 && best.target.stability <= 60
            }
        });
        if (shouldUseFirebrand) {
            console.log(`[AI INSURRECTION ${faction}] Softened target ${best.target.id} (${best.target.stability}%) - Requesting Firebrand`);
        }
        newInsurrectionsThisTurn++;
    }
}
/**
 * Get the last turn when this faction attempted an insurrection on this target.
 * Returns -1 if never attempted.
 */
function getLastInsurrectionTurn(state, faction, targetId) {
    // Check mission history in AI state
    const missions = state.aiState?.[faction]?.missions || [];
    // Find completed/failed insurrection missions for this target
    // The mission ID format is: insurrect_{targetId}_{turn}
    let lastTurn = -1;
    for (const m of missions) {
        if (m.type === 'INSURRECTION' && m.targetId === targetId) {
            const turnMatch = m.id.match(/_(\d+)$/);
            if (turnMatch) {
                const missionTurn = parseInt(turnMatch[1]);
                if (missionTurn > lastTurn) {
                    lastTurn = missionTurn;
                }
            }
        }
    }
    return lastTurn;
}
/**
 * Count how many times this faction has targeted this location with insurrections.
 */
function countPreviousInsurrections(state, faction, targetId) {
    const missions = state.aiState?.[faction]?.missions || [];
    return missions.filter(m => m.type === 'INSURRECTION' &&
        m.targetId === targetId).length;
}
/**
 * Generate NEGOTIATE missions for neutral territories.
 */
function generateNegotiateMissions(state, faction, theaters, profile, activeMissions) {
    // Only Republicans and Conspirators negotiate
    if (faction !== types_1.FactionId.REPUBLICANS && faction !== types_1.FactionId.CONSPIRATORS)
        return;
    if (profile.expansionism <= 0.3)
        return;
    // Find neutral neighbors
    const neutralNeighbors = [];
    for (const theater of theaters) {
        theater.borderLocationIds.forEach(bid => {
            const loc = state.locations.find(l => l.id === bid);
            if (loc && loc.faction === 'NEUTRAL') {
                neutralNeighbors.push(bid);
            }
        });
    }
    for (const nid of neutralNeighbors) {
        if (activeMissions.some(m => m.targetId === nid && m.type === 'NEGOTIATE'))
            continue;
        activeMissions.push({
            id: `negotiate_${nid}_${state.turn}`,
            type: 'NEGOTIATE',
            priority: 50,
            status: 'PLANNING',
            targetId: nid,
            stage: 'PLANNING',
            assignedArmyIds: [],
            data: { currentNegotiationPoints: 0 }
        });
    }
}
/**
 * Generate STABILIZE missions for unstable owned territories.
 */
function generateStabilizeMissions(state, faction, activeMissions) {
    const unstableOwned = state.locations.filter(l => l.faction === faction && l.stability < 80);
    for (const loc of unstableOwned) {
        if (activeMissions.some(m => m.targetId === loc.id && m.type === 'STABILIZE'))
            continue;
        let priority = (100 - loc.stability) / 2;
        if (loc.type === 'CITY')
            priority += 20;
        if (faction === types_1.FactionId.CONSPIRATORS)
            priority += 10;
        if (priority > 30) {
            activeMissions.push({
                id: `stabilize_${loc.id}_${state.turn}`,
                type: 'STABILIZE',
                priority: priority,
                status: 'PLANNING',
                targetId: loc.id,
                stage: 'ONGOING',
                assignedArmyIds: [],
                data: { targetStability: 75 }
            });
        }
    }
}
