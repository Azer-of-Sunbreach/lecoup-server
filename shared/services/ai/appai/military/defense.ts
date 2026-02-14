// Defense Mission Handler - Process DEFEND type missions

import { GameState, FactionId, Army, AIMission } from '../../../../types';
import { getMinGarrison } from './garrison';
import { pullReinforcements } from './movement';

/**
 * Handle a DEFEND mission for a faction.
 * 
 * Responsibilities:
 * - Garrison troops at the target location
 * - Execute sortie if we dominate besiegers
 * - Pull reinforcements if under-strength
 * - Deploy screen forces to adjacent road stages
 * 
 * @param mission - The DEFEND mission to process
 * @param state - Current game state
 * @param faction - Faction executing the mission
 * @param armies - Reference to all armies array (modified in place)
 * @param assigned - Set of assigned army IDs
 */
export function handleDefense(
    mission: AIMission,
    state: GameState,
    faction: FactionId,
    armies: Army[],
    assigned: Set<string>
) {
    const { targetId } = mission;
    const reqStrength = mission.data?.requiredStrength || 1500;

    const atTarget = armies.filter(a =>
        a.locationId === targetId &&
        a.faction === faction &&
        !assigned.has(a.id)
    );
    let currentStr = atTarget.reduce((s, a) => s + a.strength, 0);

    // SORTIE LOGIC
    // If under siege, check if we dominate the besiegers
    const besiegers = state.armies.filter(a =>
        a.locationId === targetId &&
        a.faction !== faction &&
        a.isSieging
    );
    const besiegerStr = besiegers.reduce((s, a) => s + a.strength, 0);

    if (besiegerStr > 0 && currentStr > besiegerStr * 1.5) {
        // BREAK SIEGE / SORTIE
        atTarget.forEach(a => {
            // Just mark as assigned, no need to modify isGarrisoned for LOCATION armies
            assigned.add(a.id);
        });
        return; // We fight this turn
    }

    // Normal Garrison Logic
    // Only assign enough troops to meet the requirement + buffer
    atTarget.sort((a, b) => b.strength - a.strength);

    let assignedStr = 0;
    const defenseCap = reqStrength * 1.2; // Keep 20% buffer

    for (const army of atTarget) {
        if (assignedStr < defenseCap) {
            // Assign to defense mission (do NOT set isGarrisoned - that's only for ROAD stages)
            assigned.add(army.id);
            assignedStr += army.strength;
        }
        // Excess troops are simply not added to assigned, keeping them available for campaigns
    }

    // Pull reinforcements if under-strength
    if (currentStr < reqStrength) {
        pullReinforcements(targetId, armies, state, faction, assigned, reqStrength - currentStr);
    } else if (currentStr > reqStrength + 1000) {
        // RING DEFENSE / ROAD STAGE GARRISON
        // Push excess troops to adjacent road stages as screens
        deployScreenForces(targetId, state, faction, armies, atTarget, assigned, currentStr);
    }
}

/**
 * Deploy screen forces to adjacent road stages for early warning / defense.
 */
function deployScreenForces(
    targetId: string,
    state: GameState,
    faction: FactionId,
    armies: Army[],
    atTarget: Army[],
    assigned: Set<string>,
    currentStr: number
) {
    const roads = state.roads.filter(r => r.from === targetId || r.to === targetId);

    for (const road of roads) {
        // Check if we already have a screener
        const hasScreener = armies.some(a =>
            a.faction === faction &&
            a.locationType === 'ROAD' &&
            a.roadId === road.id &&
            !assigned.has(a.id)
        );

        if (!hasScreener) {
            // Find a regiment to detach
            const spare = atTarget.find(a => !assigned.has(a.id) && a.strength <= 1000);
            if (spare) {
                const idx = armies.findIndex(x => x.id === spare.id);
                if (idx !== -1) {
                    armies[idx] = {
                        ...spare,
                        isGarrisoned: false,
                        locationType: 'ROAD',
                        roadId: road.id,
                        stageIndex: road.from === targetId ? 0 : road.stages.length - 1,
                        direction: road.from === targetId ? 'FORWARD' : 'BACKWARD',
                        destinationId: road.from === targetId ? road.to : road.from,
                        originLocationId: targetId,
                        locationId: null,
                        turnsUntilArrival: 0,
                        justMoved: true
                    };
                    assigned.add(spare.id);
                    currentStr -= spare.strength;
                }
            }
        }
    }
}
