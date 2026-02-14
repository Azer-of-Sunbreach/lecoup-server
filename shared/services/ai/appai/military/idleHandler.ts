// Idle Armies Module - Handle armies not assigned to missions

import { GameState, FactionId, Army } from '../../../../types';
import { getDistance, findSafePath } from '../utils';
import { IDLE_DEPLOYMENT_TARGETS } from './types';
import { getMinGarrison } from './garrison';
import { moveArmiesTo } from './movement';
import { DEBUG_AI } from '../../../../data/gameConstants';
import { getSameTurnConvergingStrength, getArmyDestinationId } from './convergingForces';

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
export function handleIdleArmies(
    state: GameState,
    faction: FactionId,
    armies: Army[],
    assigned: Set<string>
) {
    // EVOLUTION 3: Check moving armies BEFORE they advance into suicide positions
    checkMovingArmiesForSuicide(state, faction, armies, assigned);

    // FIX 3C: Handle armies stuck on roads
    handleStuckRoadArmies(state, faction, armies, assigned);

    const idle = armies.filter(a => a.faction === faction && !assigned.has(a.id) && !a.isGarrisoned);

    // Sort idle armies by strength (biggest chunks first)
    idle.sort((a, b) => b.strength - a.strength);

    // Find Active Campaigns needing support
    const campaignMissions = state.aiState?.[faction]?.missions.filter(m =>
        m.type === 'CAMPAIGN' &&
        (m.status === 'ACTIVE' || m.status === 'PLANNING') &&
        m.stage !== 'COMPLETED'
    ) || [];

    for (const army of idle) {
        if (!army.locationId || army.locationType !== 'LOCATION') continue;

        const loc = state.locations.find(l => l.id === army.locationId);
        if (!loc) continue;

        // CHECK IF NEEDED AS GARRISON
        const minGarrison = getMinGarrison(loc, state.characters, faction);
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
        let bestTarget: string | null = null;
        let minDist = 999;

        for (const mission of campaignMissions) {
            const target = mission.data?.stagingId || mission.targetId;
            if (!target) continue;

            const dist = getDistance(army.locationId, target, state.roads);
            if (dist < minDist && dist < 10) {
                minDist = dist;
                bestTarget = target;
            }
        }

        if (bestTarget && bestTarget !== army.locationId) {
            if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] Idle Army ${army.id} moving to support Campaign at ${bestTarget}`);
            const path = findSafePath(army.locationId, bestTarget, state, faction);
            if (path && path.length > 0) {
                moveArmiesTo([army], bestTarget, state, armies, assigned);
                continue;
            }
        }

        // Priority 2: Go to nearest Strategic Location
        if (!bestTarget) {
            const targets = IDLE_DEPLOYMENT_TARGETS[faction] || [];

            for (const t of targets) {
                if (army.locationId === t) continue;
                const dist = getDistance(army.locationId, t, state.roads);
                if (dist <= 4 && dist < minDist) {
                    minDist = dist;
                    bestTarget = t;
                }
            }

            if (bestTarget) {
                if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] Idle Army ${army.id} redeploying to Strategic ${bestTarget}`);
                const path = findSafePath(army.locationId, bestTarget, state, faction);
                if (path && path.length > 0) {
                    moveArmiesTo([army], bestTarget, state, armies, assigned);
                }
            }
        }
    }
}

/**
 * EVOLUTION 3: Check actively MOVING armies (not garrisoned) on roads.
 * If they are about to advance into a suicide position, STOP them by setting isGarrisoned.
 * This prevents resolveMovements from advancing them into certain death.
 */
function checkMovingArmiesForSuicide(
    state: GameState,
    faction: FactionId,
    armies: Army[],
    assigned: Set<string>
) {
    const movingOnRoad = armies.filter(a =>
        a.faction === faction &&
        a.locationType === 'ROAD' &&
        !a.isGarrisoned &&
        !a.isSpent &&
        !assigned.has(a.id)
    );

    for (const army of movingOnRoad) {
        const road = state.roads.find(r => r.id === army.roadId);
        if (!road) continue;

        // Calculate next stage in current direction
        const directionDelta = army.direction === 'FORWARD' ? 1 : -1;
        const nextStageIndex = army.stageIndex + directionDelta;

        let effectiveEnemyStr = 0;
        let defenseDescription = '';

        // CASE 1: Next stage is still on the road
        if (nextStageIndex >= 0 && nextStageIndex < road.stages.length) {
            const nextStage = road.stages[nextStageIndex];

            // Check for enemy presence on next stage
            const enemyOnNextStage = state.armies.filter(a =>
                a.faction !== faction &&
                a.faction !== FactionId.NEUTRAL &&
                a.locationType === 'ROAD' &&
                a.roadId === army.roadId &&
                a.stageIndex === nextStageIndex
            );
            const enemyTroops = enemyOnNextStage.reduce((s, a) => s + a.strength, 0);

            // Get stage defense (fortification + natural defense)
            const fortBonus = nextStage.fortificationLevel
                ? [0, 500, 1500, 4000, 10000][nextStage.fortificationLevel] || 0
                : 0;
            const natBonus = nextStage.naturalDefense || 0;
            const stageDefense = fortBonus + natBonus;

            // Only apply defense if enemy troops are present (min 100 for road stages)
            effectiveEnemyStr = enemyTroops >= 100 ? enemyTroops + stageDefense : 0;
            defenseDescription = `stage ${nextStageIndex} (troops:${enemyTroops} + defense:${stageDefense})`;
        }
        // CASE 2: Next stage is the destination location
        else {
            const destId = army.direction === 'FORWARD' ? road.to : road.from;
            const destLoc = state.locations.find(l => l.id === destId);
            const enemyAtDest = state.armies
                .filter(a => a.locationId === destId && a.faction !== faction && a.faction !== FactionId.NEUTRAL)
                .reduce((s, a) => s + a.strength, 0);

            const fortBonus = destLoc && enemyAtDest >= 500 ? (destLoc.defense || 0) : 0;
            effectiveEnemyStr = enemyAtDest > 0 ? enemyAtDest + fortBonus : 0;
            defenseDescription = `${destId} (troops:${enemyAtDest} + fort:${fortBonus})`;
        }

        // SUICIDE CHECK: Would advancing be suicide?
        // NEW: Use combined converging strength instead of individual army strength
        if (effectiveEnemyStr > 0) {
            // Get destination for convergence calculation
            const destId = army.direction === 'FORWARD' ? road.to : road.from;
            
            // Calculate combined strength of all armies arriving the same turn
            const combinedStrength = getSameTurnConvergingStrength(army, destId, faction, state);
            
            // Check if combined forces can win
            const canCombinedWin = combinedStrength > effectiveEnemyStr;
            
            // Legacy individual checks (for logging purposes)
            const individualSuicide = effectiveEnemyStr > army.strength * 1.5;
            const individualNoImpact = (effectiveEnemyStr - 500) > army.strength;

            if (!canCombinedWin && (individualSuicide || individualNoImpact)) {
                if (DEBUG_AI) {
                    console.log(`[AI MILITARY ${faction}] Moving army ${army.id} HALTED - SUICIDE PREVENTION`);
                    console.log(`  Our strength: ${army.strength} (combined arriving same turn: ${combinedStrength}) vs ${defenseDescription} = ${effectiveEnemyStr}`);
                }

                // HALT: Set to garrisoned to prevent resolveMovements from advancing
                const idx = armies.findIndex(x => x.id === army.id);
                if (idx !== -1) {
                    armies[idx] = {
                        ...army,
                        isGarrisoned: true
                    };
                    assigned.add(army.id);
                }
            } else if (canCombinedWin && (individualSuicide || individualNoImpact)) {
                // Combined forces CAN win - let the army advance
                if (DEBUG_AI) {
                    console.log(`[AI MILITARY ${faction}] Moving army ${army.id} ADVANCING - COMBINED FORCES SUFFICIENT`);
                    console.log(`  Our strength: ${army.strength} (combined arriving same turn: ${combinedStrength}) vs ${defenseDescription} = ${effectiveEnemyStr}`);
                }
            }
        }
    }
}

/**
 * FIX 3C: Handle armies stuck on road stages (garrisoned after failed attack/retreat).
 * Decides whether to advance (forward) or retreat (reverse) based on enemy strength.
 */
function handleStuckRoadArmies(
    state: GameState,
    faction: FactionId,
    armies: Army[],
    assigned: Set<string>
) {
    const stuckOnRoad = armies.filter(a =>
        a.faction === faction &&
        a.locationType === 'ROAD' &&
        a.isGarrisoned &&
        !assigned.has(a.id)
    );

    for (const army of stuckOnRoad) {
        const road = state.roads.find(r => r.id === army.roadId);
        if (!road) continue;

        // Determine destination based on current direction
        const destId = army.destinationId || (army.direction === 'FORWARD' ? road.to : road.from);
        const originId = army.direction === 'FORWARD' ? road.from : road.to;

        // Calculate next stage in current direction
        const direction = army.direction === 'FORWARD' ? 1 : -1;
        const nextStageIndex = army.stageIndex + direction;

        let effectiveEnemyStr = 0;
        let defenseDescription = '';

        // CASE 1: Next stage is still on the road
        if (nextStageIndex >= 0 && nextStageIndex < road.stages.length) {
            const nextStage = road.stages[nextStageIndex];

            // Check for enemy garrison on next stage
            const enemyOnNextStage = state.armies.filter(a =>
                a.faction !== faction &&
                a.faction !== FactionId.NEUTRAL &&
                a.locationType === 'ROAD' &&
                a.roadId === army.roadId &&
                a.stageIndex === nextStageIndex
            );
            const enemyTroops = enemyOnNextStage.reduce((s, a) => s + a.strength, 0);

            // Get stage defense (fortification + natural defense)
            const fortBonus = nextStage.fortificationLevel
                ? [0, 500, 1500, 4000, 10000][nextStage.fortificationLevel] || 0
                : 0;
            const natBonus = nextStage.naturalDefense || 0;
            const stageDefense = fortBonus + natBonus;

            // Only apply defense if enemy troops are present (min 100 for road stages)
            effectiveEnemyStr = enemyTroops >= 100 ? enemyTroops + stageDefense : enemyTroops;
            defenseDescription = `stage ${nextStageIndex} (troops:${enemyTroops} + defense:${stageDefense})`;
        }
        // CASE 2: Next stage is the destination location
        else {
            const destLoc = state.locations.find(l => l.id === destId);
            const enemyAtDest = state.armies
                .filter(a => a.locationId === destId && a.faction !== faction && a.faction !== FactionId.NEUTRAL)
                .reduce((s, a) => s + a.strength, 0);

            const fortBonus = destLoc && enemyAtDest >= 500 ? (destLoc.defense || 0) : 0;
            effectiveEnemyStr = enemyAtDest + fortBonus;
            defenseDescription = `${destId} (troops:${enemyAtDest} + fort:${fortBonus})`;
        }

        const idx = armies.findIndex(x => x.id === army.id);
        if (idx === -1) continue;

        // NEW: Calculate combined strength of all armies arriving the same turn
        const combinedStrength = getSameTurnConvergingStrength(army, destId, faction, state);
        
        // Check if combined forces can win
        const canCombinedWin = combinedStrength > effectiveEnemyStr;

        // Legacy individual checks (for logging/fallback)
        const individualSuicide = effectiveEnemyStr > army.strength * 1.5;
        const individualNoImpact = effectiveEnemyStr > 0 && (effectiveEnemyStr - 500) > army.strength;

        if (!canCombinedWin && (individualSuicide || individualNoImpact)) {
            // HOPELESS even with combined forces - REVERSE (retreat to origin)
            if (DEBUG_AI) {
                console.log(`[AI MILITARY ${faction}] Road army ${army.id} RETREATING - SUICIDE PREVENTION`);
                console.log(`  Our strength: ${army.strength} (combined arriving same turn: ${combinedStrength}) vs ${defenseDescription} = ${effectiveEnemyStr}`);
            }
            const newDirection = army.direction === 'FORWARD' ? 'BACKWARD' : 'FORWARD';
            armies[idx] = {
                ...army,
                direction: newDirection,
                destinationId: originId,
                isGarrisoned: false
            };
            assigned.add(army.id);
        } else if (canCombinedWin) {
            // Combined forces CAN win - ADVANCE!
            if (DEBUG_AI) {
                console.log(`[AI MILITARY ${faction}] Road army ${army.id} ADVANCING - COMBINED FORCES SUFFICIENT`);
                console.log(`  Our strength: ${army.strength} (combined arriving same turn: ${combinedStrength}) vs ${defenseDescription} = ${effectiveEnemyStr}`);
            }
            armies[idx] = {
                ...army,
                isGarrisoned: false
            };
            assigned.add(army.id);
        } else if (effectiveEnemyStr > 0 && combinedStrength < effectiveEnemyStr * 0.7) {
            // RISKY - combined forces not quite enough yet, wait for more reinforcements
            if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] Road army ${army.id} HOLDING - waiting for reinforcements (combined: ${combinedStrength} vs ${effectiveEnemyStr})`);
            // Keep garrisoned, don't advance
            assigned.add(army.id);
        } else {
            // CAN FIGHT - FORWARD (continue attack)
            if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] Road army ${army.id} ADVANCING to ${defenseDescription} (combined: ${combinedStrength} vs ${effectiveEnemyStr})`);
            armies[idx] = {
                ...army,
                isGarrisoned: false
            };
            assigned.add(army.id);
        }
    }
}

