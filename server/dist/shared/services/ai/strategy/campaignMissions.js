"use strict";
// Campaign Missions Module - Generate CAMPAIGN (offensive) missions
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCampaignMissions = generateCampaignMissions;
/**
 * Generate CAMPAIGN missions for offensive operations.
 *
 * Only launches if:
 * - Theater is not critically weak (< 3:1 outnumbered)
 * - Below max concurrent campaigns for the theater
 *
 * @param state - Current game state
 * @param faction - Faction to generate for
 * @param theaters - Analyzed theaters
 * @param profile - Faction personality
 * @param activeMissions - Current active missions (modified in place)
 */
function generateCampaignMissions(state, faction, theaters, profile, activeMissions) {
    for (const theater of theaters) {
        // Find adjacent enemy targets (not neutral)
        const potentialTargets = theater.borderLocationIds
            .map(id => state.locations.find(l => l.id === id))
            .filter(l => l && l.faction !== faction && l.faction !== 'NEUTRAL');
        console.log(`[AI STRATEGY ${faction}] Theater ${theater.id}: ${potentialTargets.length} potential targets, Army: ${theater.armyStrength}, Threat: ${theater.threatLevel}`);
        if (potentialTargets.length === 0)
            continue;
        // Block if critically weak (outnumbered > 3:1)
        if (theater.threatLevel > theater.armyStrength * 3) {
            console.log(`[AI STRATEGY ${faction}] Theater ${theater.id}: BLOCKED - Critically weak`);
            continue;
        }
        // Check concurrent campaigns limit
        const theaterMissions = activeMissions.filter(m => m.type === 'CAMPAIGN' &&
            (theater.locationIds.includes(m.data?.stagingId) || theater.borderLocationIds.includes(m.targetId)));
        const maxMissions = profile.aggressiveness > 0.5 ? 4 : 2;
        if (theaterMissions.length >= maxMissions) {
            console.log(`[AI STRATEGY ${faction}] Theater ${theater.id}: BLOCKED - Max missions`);
            continue;
        }
        // Score and select target
        const scoredTargets = scoreTargets(state, faction, potentialTargets, profile, activeMissions);
        if (scoredTargets.length > 0) {
            const best = scoredTargets[0];
            createCampaignMission(state, faction, theater, best, profile, activeMissions);
        }
    }
    // Fallback: Force create campaign if none exist
    createFallbackCampaign(state, faction, profile, activeMissions);
}
function scoreTargets(state, faction, targets, profile, activeMissions) {
    return targets.map(target => {
        let score = 50;
        if (profile.preferredTargets.includes(target.id))
            score += 50;
        if (target.type === 'CITY')
            score += 30;
        score -= (target.defense || 0) / 100;
        const intel = state.armies
            .filter(a => a.locationId === target.id && a.faction === target.faction)
            .reduce((s, a) => s + a.strength, 0);
        // Opportunistic attacks
        if (intel < 1000)
            score += 40;
        else if (intel < 2000)
            score += 20;
        else if (intel > 5000)
            score -= 20;
        return { target, score, intel };
    }).sort((a, b) => b.score - a.score);
}
function createCampaignMission(state, faction, theater, best, profile, activeMissions) {
    const target = best.target;
    console.log(`[AI STRATEGY ${faction}] Best target: ${target.id} (score: ${best.score})`);
    // Find ALL staging points adjacent to target (for potential convergent attack)
    const allStagingPoints = findAllStagingPoints(state, faction, theater, target.id);
    if (allStagingPoints.length === 0)
        return;
    if (activeMissions.some(m => m.targetId === target.id && m.type === 'CAMPAIGN')) {
        console.log(`[AI STRATEGY ${faction}] Campaign to ${target.id} already exists`);
        return;
    }
    // Calculate required strength
    const fortificationStr = target.defense || 0;
    const requiredStrength = Math.max(1500, fortificationStr + (best.intel * 1.2));
    // Determine if we should do a CONVERGENT attack
    // Only if we have 2+ staging points AND enough force distributed across them
    const isConvergent = allStagingPoints.length >= 2 && shouldDoConvergentAttack(state, faction, allStagingPoints, requiredStrength);
    if (isConvergent) {
        console.log(`[AI STRATEGY ${faction}] CREATING CONVERGENT CAMPAIGN: ${allStagingPoints.join(' + ')} -> ${target.id}`);
        activeMissions.push({
            id: `campaign_${target.id}_${state.turn}`,
            type: 'CAMPAIGN',
            priority: 75 + (profile.aggressiveness * 20), // Higher priority for convergent
            status: 'PLANNING',
            targetId: target.id,
            stage: 'GATHERING',
            assignedArmyIds: [],
            data: {
                stagingId: allStagingPoints[0], // Primary staging (for backward compat)
                stagingIds: allStagingPoints, // All staging points
                requiredStrength: Math.floor(requiredStrength),
                isConvergent: true,
                convergentReadiness: {} // Track readiness per staging point
            }
        });
    }
    else {
        // Single-direction attack (original behavior)
        const stagingId = allStagingPoints[0];
        console.log(`[AI STRATEGY ${faction}] CREATING CAMPAIGN: ${stagingId} -> ${target.id}`);
        activeMissions.push({
            id: `campaign_${target.id}_${state.turn}`,
            type: 'CAMPAIGN',
            priority: 70 + (profile.aggressiveness * 20),
            status: 'PLANNING',
            targetId: target.id,
            stage: 'GATHERING',
            assignedArmyIds: [],
            data: {
                stagingId: stagingId,
                requiredStrength: Math.floor(requiredStrength)
            }
        });
    }
}
/**
 * Find all owned locations adjacent to the target via roads.
 */
function findAllStagingPoints(state, faction, theater, targetId) {
    return theater.locationIds.filter(myLocId => state.roads.some(r => (r.from === myLocId && r.to === targetId) ||
        (r.to === myLocId && r.from === targetId)));
}
/**
 * Determine if a convergent attack is feasible.
 * Requires enough force distributed across multiple staging points.
 */
function shouldDoConvergentAttack(state, faction, stagingPoints, requiredStrength) {
    let totalAvailable = 0;
    let pointsWithTroops = 0;
    const minPerPoint = 500; // Minimum troops per staging point to count
    for (const stageId of stagingPoints) {
        const strengthAtPoint = state.armies
            .filter(a => a.faction === faction && a.locationId === stageId && a.locationType === 'LOCATION')
            .reduce((sum, a) => sum + a.strength, 0);
        if (strengthAtPoint >= minPerPoint) {
            pointsWithTroops++;
            totalAvailable += strengthAtPoint;
        }
    }
    // Need at least 2 staging points with troops AND total strength >= required
    return pointsWithTroops >= 2 && totalAvailable >= requiredStrength * 0.8;
}
function createFallbackCampaign(state, faction, profile, activeMissions) {
    const existingCampaigns = activeMissions.filter(m => m.type === 'CAMPAIGN');
    if (existingCampaigns.length > 0 || profile.aggressiveness <= 0.2)
        return;
    console.log(`[AI STRATEGY ${faction}] NO CAMPAIGNS - Forcing fallback`);
    const ownedLocs = state.locations.filter(l => l.faction === faction);
    for (const owned of ownedLocs) {
        const adjacentRoads = state.roads.filter(r => r.from === owned.id || r.to === owned.id);
        for (const road of adjacentRoads) {
            const neighborId = road.from === owned.id ? road.to : road.from;
            const neighbor = state.locations.find(l => l.id === neighborId);
            if (neighbor && neighbor.faction !== faction && neighbor.faction !== 'NEUTRAL') {
                console.log(`[AI STRATEGY ${faction}] FALLBACK: ${owned.id} -> ${neighborId}`);
                activeMissions.push({
                    id: `campaign_${neighborId}_${state.turn}`,
                    type: 'CAMPAIGN',
                    priority: 80,
                    status: 'PLANNING',
                    targetId: neighborId,
                    stage: 'GATHERING',
                    assignedArmyIds: [],
                    data: { stagingId: owned.id, requiredStrength: 1000 }
                });
                return;
            }
        }
    }
}
