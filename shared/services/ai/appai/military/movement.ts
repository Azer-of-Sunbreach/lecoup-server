// Movement Module - Army movement and reinforcement logic

import { GameState, FactionId, Army, RoadQuality } from '../../../../types';
import { getDistance, findSafePath } from '../utils';
import { getMinGarrison } from './garrison';
import { DEBUG_AI } from '../../../../data/gameConstants';

/**
 * Move a selection of armies toward a target location.
 * Handles both LOCAL roads (instant) and REGIONAL roads (staged).
 * 
 * @param selection - Armies to move
 * @param targetId - Destination location ID
 * @param state - Current game state
 * @param allArmies - Reference to all armies array (modified in place)
 * @param assigned - Set of assigned army IDs
 */
export function moveArmiesTo(
    selection: Army[],
    targetId: string,
    state: GameState,
    allArmies: Army[],
    assigned: Set<string>
) {
    const faction = selection[0]?.faction;
    if (DEBUG_AI) console.log(`[AI MILITARY] moveArmiesTo called: ${selection.length} armies toward ${targetId}`);

    for (const army of selection) {
        if (!army.locationId) {
            if (DEBUG_AI) console.log(`[AI MILITARY] Army ${army.id}: SKIPPED - no locationId`);
            continue;
        }

        const path = findSafePath(army.locationId, targetId, state, army.faction);
        if (DEBUG_AI) console.log(`[AI MILITARY] Army ${army.id} at ${army.locationId}: path to ${targetId} = ${path ? path.join(' -> ') : 'NULL'}`);

        if (path && path.length > 0) {
            const roadId = path[0];
            const road = state.roads.find(r => r.id === roadId);
            if (!road) {
                if (DEBUG_AI) console.log(`[AI MILITARY] Army ${army.id}: Road ${roadId} NOT FOUND`);
                continue;
            }

            const destId = road.from === army.locationId ? road.to : road.from;
            const idx = allArmies.findIndex(a => a.id === army.id);

            if (idx !== -1) {
                if (DEBUG_AI) console.log(`[AI MILITARY] Army ${army.id}: MOVING on road ${roadId} toward ${destId}`);

                // Force Ungarrison when moving
                if (road.quality === RoadQuality.LOCAL) {
                    // LOCAL road = instant travel
                    allArmies[idx] = {
                        ...army,
                        locationType: 'LOCATION', locationId: destId,
                        originLocationId: destId, destinationId: null,
                        roadId: null, turnsUntilArrival: 0, justMoved: false,
                        isGarrisoned: false
                    };
                } else {
                    // REGIONAL road = staged movement
                    allArmies[idx] = {
                        ...army,
                        locationType: 'ROAD', roadId: road.id,
                        stageIndex: road.from === army.locationId ? 0 : road.stages.length - 1,
                        direction: road.from === army.locationId ? 'FORWARD' : 'BACKWARD',
                        destinationId: destId, originLocationId: army.locationId!, locationId: null,
                        turnsUntilArrival: 0, justMoved: true,
                        isGarrisoned: false
                    };
                }
                assigned.add(army.id);
            }
        } else {
            if (DEBUG_AI) console.log(`[AI MILITARY] Army ${army.id}: NO PATH to ${targetId}`);
        }
    }
}

/**
 * Pull reinforcements from other locations to a target.
 * Prioritizes biggest armies first, then closest.
 * Respects minimum garrison requirements at source locations.
 * Can split armies when needed to maximize reinforcements.
 * 
 * @param targetId - Destination for reinforcements
 * @param armies - Reference to all armies array (modified in place)
 * @param state - Current game state
 * @param faction - Faction pulling reinforcements
 * @param assigned - Set of assigned army IDs
 * @param maxAmountNeeded - Maximum troops to pull (default: no limit)
 */
export function pullReinforcements(
    targetId: string,
    armies: Army[],
    state: GameState,
    faction: FactionId,
    assigned: Set<string>,
    maxAmountNeeded: number = 99999
) {
    // 1. Gather ALL valid candidates
    const candidates: { army: Army, dist: number }[] = [];

    armies.forEach(a => {
        // PERMIT GARRISONED TROOPS to be pulled if they are not assigned to a mission
        if (a.faction === faction && !assigned.has(a.id) && a.locationId && a.locationId !== targetId && a.locationType === 'LOCATION') {
            const loc = state.locations.find(l => l.id === a.locationId);
            if (loc) {
                const minGarrison = getMinGarrison(loc, state.characters, faction);
                const allAtLoc = armies.filter(x => x.locationId === loc.id && x.faction === faction);
                const totalStr = allAtLoc.reduce((s, x) => s + x.strength, 0);

                // Only consider if location has surplus troops
                if (totalStr > minGarrison) {
                    candidates.push({ army: a, dist: 0 });
                }
            }
        }
    });

    // 2. Calculate distances for candidates
    candidates.forEach(c => {
        c.dist = getDistance(c.army.locationId!, targetId, state.roads);
    });

    // Filter out unreachable
    const reachable = candidates.filter(c => c.dist < 999);

    // 3. Sort: BIGGEST ARMIES FIRST. If equal, CLOSEST FIRST.
    reachable.sort((a, b) => {
        if (b.army.strength !== a.army.strength) return b.army.strength - a.army.strength;
        return a.dist - b.dist;
    });

    let recruitedAmt = 0;

    for (const cand of reachable) {
        if (recruitedAmt >= maxAmountNeeded) break;

        const army = cand.army;
        const loc = state.locations.find(l => l.id === army.locationId)!;

        // Re-check surplus dynamically
        const allAtLoc = armies.filter(x => x.locationId === loc.id && x.faction === faction);
        const currentTotal = allAtLoc.reduce((s, x) => s + x.strength, 0);
        const minGarrison = getMinGarrison(loc, state.characters, faction);

        // Can we take this FULL army without violating garrison?
        if (currentTotal - army.strength >= minGarrison) {
            // FRONTIER PROTECTION: Don't strip frontier locations below 1000
            const wouldDropBelow1000 = (currentTotal - army.strength) < 1000;
            const hasEnemyNeighbor = state.roads.some(r =>
                (r.from === loc.id || r.to === loc.id) &&
                state.locations.some(l => l.id === (r.from === loc.id ? r.to : r.from) && l.faction !== faction && l.faction !== FactionId.NEUTRAL)
            );
            if (wouldDropBelow1000 && hasEnemyNeighbor) {
                if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] Skipping ${army.locationId} - frontier protection`);
                continue;
            }

            const path = findSafePath(army.locationId!, targetId, state, faction);
            if (path && path.length > 0) {
                if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] Reinforcing ${targetId} from ${army.locationId} with ${army.strength} (Dist: ${cand.dist})`);
                moveArmiesTo([army], targetId, state, armies, assigned);
                recruitedAmt += army.strength;
            }
        } else {
            // SPLIT LOGIC - take surplus only
            const surplus = currentTotal - minGarrison;

            if (surplus >= 500 && army.strength > surplus) {
                const moveAmount = surplus;
                const stayAmount = army.strength - moveAmount;

                if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] Reinforcing ${targetId} from ${army.locationId} by SPLITTING (Taking ${moveAmount}, Leaving ${stayAmount})`);

                const armyIdx = armies.findIndex(x => x.id === army.id);
                if (armyIdx !== -1) {
                    armies[armyIdx] = { ...army, strength: stayAmount };

                    const newId = `ai_reinf_${army.locationId}_${targetId}_${state.turn}_${Math.floor(Math.random() * 1000)}`;
                    const movingArmy: Army = {
                        ...army,
                        id: newId,
                        strength: moveAmount,
                        isGarrisoned: false
                    };
                    armies.push(movingArmy);

                    const path = findSafePath(army.locationId!, targetId, state, faction);
                    if (path && path.length > 0) {
                        moveArmiesTo([movingArmy], targetId, state, armies, assigned);
                        recruitedAmt += moveAmount;
                    } else {
                        if (DEBUG_AI) console.log(`[AI MILITARY] Failed to find path for split reinforcement ${newId}`);
                    }
                }
            }
        }
    }
}
