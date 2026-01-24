"use strict";
// Idle Armies Module - Handle armies not assigned to missions
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleIdleArmies = handleIdleArmies;
const types_1 = require("../../../../shared/types");
const utils_1 = require("../utils");
const types_2 = require("./types");
const garrison_1 = require("./garrison");
const movement_1 = require("./movement");
const gameConstants_1 = require("../../../../shared/data/gameConstants");
/**
 * Handle idle armies that are not assigned to any mission.
 *
 * Priority:
 * 1. Respect garrison requirements at current location
 * 2. Join nearest active campaign
 * 3. Redeploy to strategic locations
 *
 * @param state - Current game state
 * @param faction - Faction to process
 * @param armies - Reference to all armies array (modified in place)
 * @param assigned - Set of already-assigned army IDs
 */
function handleIdleArmies(state, faction, armies, assigned) {
    // FIX 3C: First handle armies stuck on roads
    handleStuckRoadArmies(state, faction, armies, assigned);
    const idle = armies.filter(a => a.faction === faction && !assigned.has(a.id) && !a.isGarrisoned);
    // Sort idle armies by strength (biggest chunks first)
    idle.sort((a, b) => b.strength - a.strength);
    // Find Active Campaigns needing support
    const campaignMissions = state.aiState?.[faction]?.missions.filter(m => m.type === 'CAMPAIGN' &&
        (m.status === 'ACTIVE' || m.status === 'PLANNING') &&
        m.stage !== 'COMPLETED') || [];
    for (const army of idle) {
        if (!army.locationId || army.locationType !== 'LOCATION')
            continue;
        const loc = state.locations.find(l => l.id === army.locationId);
        if (!loc)
            continue;
        // CHECK IF NEEDED AS GARRISON
        const minGarrison = (0, garrison_1.getMinGarrison)(loc, state.characters, faction);
        const allAtLoc = armies.filter(x => x.locationId === loc.id && x.faction === faction);
        const totalStr = allAtLoc.reduce((s, x) => s + x.strength, 0);
        if (totalStr - army.strength < minGarrison) {
            // We are needed here
            if (army.strength > 2000 && (totalStr - 2000 >= minGarrison)) {
                // Large army could split, but we defer to campaign pullReinforcements
            }
            // Mark as garrison and skip
            const idx = armies.findIndex(x => x.id === army.id);
            if (idx !== -1) {
                armies[idx] = { ...army, isGarrisoned: true };
                assigned.add(army.id);
            }
            continue;
        }
        // Army is FREE to move
        // Priority 1: Join Nearest Active Campaign Staging
        let bestTarget = null;
        let minDist = 999;
        for (const mission of campaignMissions) {
            const target = mission.data?.stagingId || mission.targetId;
            if (!target)
                continue;
            const dist = (0, utils_1.getDistance)(army.locationId, target, state.roads);
            if (dist < minDist && dist < 10) {
                minDist = dist;
                bestTarget = target;
            }
        }
        if (bestTarget && bestTarget !== army.locationId) {
            if (gameConstants_1.DEBUG_AI)
                console.log(`[AI MILITARY ${faction}] Idle Army ${army.id} moving to support Campaign at ${bestTarget}`);
            const path = (0, utils_1.findSafePath)(army.locationId, bestTarget, state, faction);
            if (path && path.length > 0) {
                (0, movement_1.moveArmiesTo)([army], bestTarget, state, armies, assigned);
                continue;
            }
        }
        // Priority 2: Go to nearest Strategic Location
        if (!bestTarget) {
            const targets = types_2.IDLE_DEPLOYMENT_TARGETS[faction] || [];
            for (const t of targets) {
                if (army.locationId === t)
                    continue;
                const dist = (0, utils_1.getDistance)(army.locationId, t, state.roads);
                if (dist <= 4 && dist < minDist) {
                    minDist = dist;
                    bestTarget = t;
                }
            }
            if (bestTarget) {
                if (gameConstants_1.DEBUG_AI)
                    console.log(`[AI MILITARY ${faction}] Idle Army ${army.id} redeploying to Strategic ${bestTarget}`);
                const path = (0, utils_1.findSafePath)(army.locationId, bestTarget, state, faction);
                if (path && path.length > 0) {
                    (0, movement_1.moveArmiesTo)([army], bestTarget, state, armies, assigned);
                }
            }
        }
    }
}
/**
 * FIX 3C: Handle armies stuck on road stages (garrisoned after failed attack/retreat).
 * Decides whether to advance (forward) or retreat (reverse) based on enemy strength.
 */
function handleStuckRoadArmies(state, faction, armies, assigned) {
    const stuckOnRoad = armies.filter(a => a.faction === faction &&
        a.locationType === 'ROAD' &&
        a.isGarrisoned &&
        !assigned.has(a.id));
    for (const army of stuckOnRoad) {
        const road = state.roads.find(r => r.id === army.roadId);
        if (!road)
            continue;
        // Determine destination based on current direction
        const destId = army.destinationId || (army.direction === 'FORWARD' ? road.to : road.from);
        const originId = army.direction === 'FORWARD' ? road.from : road.to;
        // Calculate enemy strength at destination
        const enemyAtDest = state.armies
            .filter(a => a.locationId === destId && a.faction !== faction && a.faction !== types_1.FactionId.NEUTRAL)
            .reduce((s, a) => s + a.strength, 0);
        // Check destination location for fortification
        const destLoc = state.locations.find(l => l.id === destId);
        const fortBonus = destLoc && enemyAtDest >= 500 ? (destLoc.defense || 0) : 0;
        const effectiveEnemyStr = enemyAtDest + fortBonus;
        const idx = armies.findIndex(x => x.id === army.id);
        if (idx === -1)
            continue;
        if (army.strength < effectiveEnemyStr * 0.5) {
            // HOPELESS - REVERSE (retreat to origin)
            if (gameConstants_1.DEBUG_AI)
                console.log(`[AI MILITARY ${faction}] Road army ${army.id} RETREATING from ${destId} (${army.strength} vs ${effectiveEnemyStr})`);
            const newDirection = army.direction === 'FORWARD' ? 'BACKWARD' : 'FORWARD';
            armies[idx] = {
                ...army,
                direction: newDirection,
                destinationId: originId,
                isGarrisoned: false
            };
            assigned.add(army.id);
        }
        else {
            // CAN FIGHT - FORWARD (continue attack)
            if (gameConstants_1.DEBUG_AI)
                console.log(`[AI MILITARY ${faction}] Road army ${army.id} ADVANCING to ${destId} (${army.strength} vs ${effectiveEnemyStr})`);
            armies[idx] = {
                ...army,
                isGarrisoned: false
            };
            assigned.add(army.id);
        }
    }
}
