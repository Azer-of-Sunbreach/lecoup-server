// Campaign Mission Handler - Process CAMPAIGN type missions
// This is the largest and most complex mission type

import { GameState, FactionId, Army, AIMission } from '../../../../shared/types';
import { FactionPersonality } from '../types';
import { getDistance } from '../utils';
import { FORTIFICATION_LEVELS } from '../../../../shared/constants';
import { SIEGE_COST_TABLE } from './types';
import { getMinGarrison } from './garrison';
import { moveArmiesTo, pullReinforcements } from './movement';
import { DEBUG_AI } from '../../../../shared/data/gameConstants';

/**
 * Handle a CAMPAIGN mission - the core offensive operation.
 * 
 * Campaign stages: GATHERING -> MOVING -> SIEGING -> ASSAULTING -> COMPLETED
 * 
 * Supports CONVERGENT campaigns (multi-staging) where armies from multiple
 * staging points converge on the same target simultaneously.
 * 
 * @param mission - The CAMPAIGN mission to process
 * @param state - Current game state
 * @param faction - Faction executing the mission
 * @param armies - Reference to all armies array (modified in place)
 * @param assigned - Set of assigned army IDs
 * @param profile - Faction personality profile
 */
export function handleCampaign(
    mission: AIMission,
    state: GameState,
    faction: FactionId,
    armies: Army[],
    assigned: Set<string>,
    profile: FactionPersonality
) {
    const { targetId } = mission;
    const isConvergent = mission.data?.isConvergent === true;
    const stagingIds = mission.data?.stagingIds as string[] || [];
    const stagingId = mission.data?.stagingId;
    const reqStrength = mission.data?.requiredStrength || 1000;

    const targetLoc = state.locations.find(l => l.id === targetId);
    if (!targetLoc || (!stagingId && stagingIds.length === 0)) {
        if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] Campaign ${mission.id}: ABORTED - No target or staging`);
        return;
    }

    // CONVERGENT CAMPAIGN HANDLING
    if (isConvergent && stagingIds.length >= 2) {
        handleConvergentCampaign(mission, state, faction, armies, assigned, profile);
        return;
    }

    // STANDARD CAMPAIGN (single staging point)
    // Prepare armies at staging for deployment
    const deploymentContext = prepareDeployment(stagingId, faction, armies, assigned, state);
    const { armiesToMove, strengthToSend, minGarrison, totalStrengthAtStaging } = deploymentContext;

    // Get armies already at or en route to target
    const armiesAtTarget = armies.filter(a =>
        a.locationId === targetId &&
        a.faction === faction &&
        a.locationType === 'LOCATION'
    );
    const armiesIncludingEnRoute = armies.filter(a =>
        (a.locationId === targetId || (a.locationType === 'ROAD' && a.destinationId === targetId)) &&
        a.faction === faction
    );
    const strengthAtTarget = armiesAtTarget.reduce((s, a) => s + a.strength, 0);
    const strengthIncludingEnRoute = armiesIncludingEnRoute.reduce((s, a) => s + a.strength, 0);

    // Enemy Analysis
    const enemyArmiesAtTarget = armies.filter(a =>
        a.locationId === targetId &&
        a.faction !== faction &&
        a.locationType === 'LOCATION'
    );
    const enemyGarrisonStr = enemyArmiesAtTarget.reduce((s, a) => s + a.strength, 0);

    // MASSING LOGIC
    const minAttackForce = Math.min(3000, Math.max(1000, enemyGarrisonStr * 1.25));

    // ZOMBIE CAMPAIGN CHECK - detect broken campaigns and fix them
    checkAndFixBrokenCampaign(mission, faction, reqStrength, strengthIncludingEnRoute, stagingId, armies, state, assigned);

    // CONTINUOUS REINFORCEMENT
    if (['MOVING', 'SIEGING', 'ASSAULTING'].includes(mission.stage)) {
        if (strengthIncludingEnRoute < reqStrength * 1.1) {
            const deficit = Math.floor(reqStrength * 1.2) - strengthIncludingEnRoute;
            if (deficit > 200) {
                if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] Campaign ${mission.id} (${mission.stage}): Sustaining Reinforcements (Deficit ${deficit})`);
                pullReinforcements(stagingId, armies, state, faction, assigned, deficit);
            }
        }
    }

    // STATE MACHINE
    if (mission.stage === 'GATHERING') {
        handleGatheringStage(mission, faction, armies, assigned, state, stagingId, strengthToSend, minAttackForce, strengthAtTarget, totalStrengthAtStaging);
    }

    if (mission.stage === 'MOVING' || mission.stage === 'SIEGING') {
        const shouldContinue = handleMovingStage(
            mission, faction, armies, assigned, state,
            armiesToMove, armiesIncludingEnRoute,
            targetId, stagingId, minGarrison, strengthToSend, strengthAtTarget
        );
        if (!shouldContinue) return;
    }

    // SIEGE DECISION
    handleSiegeDecision(
        mission, faction, armies, assigned, state,
        targetLoc, armiesAtTarget, enemyGarrisonStr, strengthAtTarget
    );
}

/**
 * Handle CONVERGENT campaign - synchronize attacks from multiple staging points.
 */
function handleConvergentCampaign(
    mission: AIMission,
    state: GameState,
    faction: FactionId,
    armies: Army[],
    assigned: Set<string>,
    profile: FactionPersonality
): void {
    const { targetId } = mission;
    const stagingIds = mission.data?.stagingIds as string[] || [];
    const reqStrength = mission.data?.requiredStrength || 1000;
    const targetLoc = state.locations.find(l => l.id === targetId);

    if (!targetLoc) return;

    // Calculate strength per staging point
    const strengthPerStaging = Math.floor(reqStrength / stagingIds.length);

    // Track readiness for each staging point
    const readinessMap = mission.data?.convergentReadiness || {};
    let allReady = true;

    for (const stageId of stagingIds) {
        const strengthAtStaging = armies
            .filter(a => a.locationId === stageId && a.faction === faction && a.locationType === 'LOCATION' && !assigned.has(a.id))
            .reduce((s, a) => s + a.strength, 0);

        const isReady = strengthAtStaging >= strengthPerStaging * 0.7; // 70% threshold per point
        readinessMap[stageId] = isReady;

        if (!isReady) {
            allReady = false;
            // Pull reinforcements to this staging point
            pullReinforcements(stageId, armies, state, faction, assigned, strengthPerStaging - strengthAtStaging);
        }
    }

    mission.data.convergentReadiness = readinessMap;

    // GATHERING stage: Wait until all points are ready
    if (mission.stage === 'GATHERING') {
        if (allReady) {
            if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] CONVERGENT Campaign ${mission.id}: ALL staging points ready - LAUNCHING`);
            mission.stage = 'MOVING';

            // Assign armies from ALL staging points
            for (const stageId of stagingIds) {
                const armiesAtStaging = armies.filter(a =>
                    a.locationId === stageId &&
                    a.faction === faction &&
                    a.locationType === 'LOCATION' &&
                    !assigned.has(a.id)
                );

                for (const army of armiesAtStaging) {
                    if (army.strength >= 200) {
                        mission.assignedArmyIds.push(army.id);
                        assigned.add(army.id);
                    }
                }
            }
        } else {
            if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] CONVERGENT Campaign ${mission.id}: Waiting for all staging points...`);
        }
        return;
    }

    // MOVING stage: Move all assigned armies toward target
    if (mission.stage === 'MOVING') {
        for (const armyId of mission.assignedArmyIds) {
            const army = armies.find(a => a.id === armyId);
            if (!army || army.isSpent) continue;

            if (army.locationId === targetId) {
                continue; // Already at target
            }

            // Find road to target and start moving
            const armyStaging = army.locationId;
            const road = state.roads.find(r =>
                (r.from === armyStaging && r.to === targetId) ||
                (r.to === armyStaging && r.from === targetId)
            );

            if (road && army.locationType === 'LOCATION') {
                moveArmiesTo([army], targetId, state, armies, assigned);
                if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] CONVERGENT: Moving army from ${armyStaging} toward ${targetId}`);
            }
        }
    }
}

// --- HELPER FUNCTIONS ---

interface DeploymentContext {
    armiesToMove: Army[];
    strengthToSend: number;
    minGarrison: number;
    totalStrengthAtStaging: number;
}

function prepareDeployment(
    stagingId: string,
    faction: FactionId,
    armies: Army[],
    assigned: Set<string>,
    state: GameState
): DeploymentContext {
    // Get ALL armies at staging (campaigns take priority over garrison duty)
    const allArmiesAtStaging = armies.filter(a =>
        a.locationId === stagingId &&
        a.faction === faction &&
        a.locationType === 'LOCATION'
    );
    const totalStrengthAtStaging = allArmiesAtStaging.reduce((s, a) => s + a.strength, 0);

    // Calculate minimum garrison for staging
    const stagingLoc = state.locations.find(l => l.id === stagingId);
    const minGarrison = getMinGarrison(stagingLoc, state.characters, faction);
    const availableStrength = totalStrengthAtStaging - minGarrison;

    // Select armies to send, leaving minimum behind
    let strengthToSend = 0;
    const armiesToMove: Army[] = [];

    const availableAtStaging = allArmiesAtStaging.filter(a => !assigned.has(a.id));
    const sortedAvailable = availableAtStaging.sort((a, b) => b.strength - a.strength);

    for (const army of sortedAvailable) {
        const room = availableStrength - strengthToSend;
        if (room <= 0) break;

        if (army.strength <= room) {
            armiesToMove.push(army);
            strengthToSend += army.strength;
        } else if (room >= 200) {
            // Army is too big, SPLIT IT
            if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] Splitting army ${army.id} to fill campaign capacity (Taking ${room}, Leaving ${army.strength - room})`);

            const idx = armies.findIndex(x => x.id === army.id);
            if (idx !== -1) {
                const stayStrength = army.strength - room;
                const moveStrength = room;

                armies[idx] = { ...army, strength: moveStrength };
                armiesToMove.push(armies[idx]);
                strengthToSend += moveStrength;

                const garrisonArmy: Army = {
                    ...army,
                    id: `split_garrison_${army.id}_${Math.floor(Math.random() * 1000)}`,
                    strength: stayStrength,
                    isGarrisoned: true,
                    turnsUntilArrival: 0
                };
                armies.push(garrisonArmy);
                assigned.add(garrisonArmy.id);
            }
        }
    }

    return { armiesToMove, strengthToSend, minGarrison, totalStrengthAtStaging };
}

function checkAndFixBrokenCampaign(
    mission: AIMission,
    faction: FactionId,
    reqStrength: number,
    strengthIncludingEnRoute: number,
    stagingId: string,
    armies: Army[],
    state: GameState,
    assigned: Set<string>
) {
    const activeStages = ['MOVING', 'SIEGING', 'ASSAULTING'];
    if (activeStages.includes(mission.stage)) {
        const threshold = Math.max(500, reqStrength * 0.3);
        if (strengthIncludingEnRoute < threshold) {
            if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] Campaign ${mission.id}: ZOMBIE/BROKEN DETECTED (Str ${strengthIncludingEnRoute} < ${threshold}). Reverting to GATHERING.`);
            mission.stage = 'GATHERING';
        }
    }
}

function handleGatheringStage(
    mission: AIMission,
    faction: FactionId,
    armies: Army[],
    assigned: Set<string>,
    state: GameState,
    stagingId: string,
    strengthToSend: number,
    minAttackForce: number,
    strengthAtTarget: number,
    totalStrengthAtStaging: number
) {
    const canLaunch = strengthToSend >= minAttackForce;
    if (canLaunch || strengthAtTarget > 500 || strengthToSend > 2000) {
        if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] Campaign ${mission.id}: TRANSITIONING to MOVING (sending ${strengthToSend}, needed ${Math.floor(minAttackForce)})`);
        mission.stage = 'MOVING';
    } else {
        if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] Campaign ${mission.id}: GATHERING Reinforcements (Have ${totalStrengthAtStaging}/${minAttackForce} at staging)`);
        pullReinforcements(stagingId, armies, state, faction, assigned);

        const allAtStaging = armies.filter(a => a.locationId === stagingId && a.faction === faction && !assigned.has(a.id));
        allAtStaging.forEach(a => assigned.add(a.id));
    }
}

function handleMovingStage(
    mission: AIMission,
    faction: FactionId,
    armies: Army[],
    assigned: Set<string>,
    state: GameState,
    armiesToMove: Army[],
    armiesIncludingEnRoute: Army[],
    targetId: string,
    stagingId: string,
    minGarrison: number,
    strengthToSend: number,
    strengthAtTarget: number
): boolean {
    const armiesEnRoute = armiesToMove.length > 0 ? armiesToMove : armiesIncludingEnRoute;
    const movingStrength = armiesEnRoute.reduce((s, a) => s + a.strength, 0);

    // TACTICAL CHECK - Look ahead for threats
    const immediateThreat = state.armies
        .filter(a => a.faction !== faction && (a.locationId === targetId || (a.locationType === 'ROAD' && a.destinationId === stagingId)))
        .reduce((s, a) => s + a.strength, 0);

    const isSuicide = immediateThreat > movingStrength * 1.5;

    if (isSuicide && immediateThreat > 1000) {
        if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] Campaign ${mission.id}: TACTICAL PAUSE - Threat ${immediateThreat} vs Moving ${movingStrength}`);

        // Stop existing movement and request reinforcements
        armiesEnRoute.forEach(a => {
            const idx = armies.findIndex(x => x.id === a.id);
            if (idx !== -1 && a.locationType === 'LOCATION' && a.locationId === stagingId) {
                if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] Holding at ${stagingId} to reinforce/fortify.`);
            }
        });

        const deficit = Math.floor(immediateThreat * 1.1) - movingStrength;
        if (deficit > 0) {
            if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] Requesting reinforcements: ${deficit}`);
            pullReinforcements(stagingId, armies, state, faction, assigned, deficit);
        }

        return false; // SKIP MOVEMENT this turn
    }

    // Execute movement
    if (armiesToMove.length > 0) {
        if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] Campaign ${mission.id}: MOVING ${armiesToMove.length} armies (${strengthToSend} troops) to ${targetId}, leaving ${minGarrison} garrison`);

        armiesToMove.forEach(a => {
            const idx = armies.findIndex(x => x.id === a.id);
            if (idx !== -1) {
                armies[idx] = { ...armies[idx], isGarrisoned: false, action: undefined };
            }
        });

        const refreshedArmiesToMove = armiesToMove.map(a => armies.find(x => x.id === a.id)!).filter(Boolean);
        moveArmiesTo(refreshedArmiesToMove, targetId, state, armies, assigned);
    }

    if (strengthAtTarget > 0 && mission.stage === 'MOVING') {
        mission.stage = 'SIEGING';
    }

    return true;
}

function handleSiegeDecision(
    mission: AIMission,
    faction: FactionId,
    armies: Army[],
    assigned: Set<string>,
    state: GameState,
    targetLoc: any,
    armiesAtTarget: Army[],
    enemyGarrisonStr: number,
    strengthAtTarget: number
) {
    const targetId = mission.targetId;
    let shouldSiege = false;
    let siegeCost = 0;
    let requiredManpower = 500;

    const isFortified = targetLoc.fortificationLevel > 0;
    const hasDefenders = enemyGarrisonStr >= 500;
    const isNeutral = targetLoc.faction === FactionId.NEUTRAL;

    // FIX: Fortification bonus only applies if garrison >= 500 (as per game rules)
    const defBonus = hasDefenders ? (FORTIFICATION_LEVELS[targetLoc.fortificationLevel]?.bonus || 0) : 0;
    const effectiveDef = enemyGarrisonStr + defBonus;
    const canAssault = strengthAtTarget > effectiveDef * 1.5;

    // FIX: Nobles CAN siege - only Neutral faction is excluded
    // Nobles just can't negotiate with neutrals (handled below)
    if ((hasDefenders || !canAssault) && isFortified && faction !== FactionId.NEUTRAL) {
        let canNegotiate = false;

        // Only Republicans and Conspirators can negotiate with neutrals
        if (isNeutral && faction !== FactionId.NOBLES) {
            canNegotiate = state.locations.some(l =>
                l.faction === faction &&
                l.type === 'CITY' &&
                l.foodStock >= 150 &&
                l.foodIncome > 0 &&
                getDistance(l.id, targetId, state.roads) <= 3
            );

            if (canNegotiate) {
                if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] Skipping Siege at ${targetId} (Neutral) - Preferring Negotiation`);
            }
        }

        if (!canNegotiate) {
            requiredManpower = targetLoc.fortificationLevel >= 3 ? 1000 : 500;
            siegeCost = SIEGE_COST_TABLE[targetLoc.fortificationLevel] || 100;

            if (state.resources[faction].gold >= siegeCost && strengthAtTarget >= requiredManpower) {
                shouldSiege = true;
                if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] Siege CHECK PASSED at ${targetId}: Fortification=${targetLoc.fortificationLevel}, Cost=${siegeCost}, Manpower=${strengthAtTarget}/${requiredManpower}`);
            } else {
                if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] Siege Check FAILED at ${targetId}: Gold=${state.resources[faction].gold}/${siegeCost}, Manpower=${strengthAtTarget}/${requiredManpower}`);
            }
        }
    }

    if (shouldSiege && mission.stage !== 'ASSAULTING') {
        executeSiege(mission, faction, armies, assigned, state, targetLoc, armiesAtTarget, enemyGarrisonStr, siegeCost, requiredManpower);
    } else {
        handleNonSiegeScenario(mission, faction, armies, assigned, targetLoc, armiesAtTarget, strengthAtTarget);
    }
}

function executeSiege(
    mission: AIMission,
    faction: FactionId,
    armies: Army[],
    assigned: Set<string>,
    state: GameState,
    targetLoc: any,
    armiesAtTarget: Army[],
    enemyGarrisonStr: number,
    siegeCost: number,
    requiredManpower: number
) {
    const targetId = mission.targetId;

    // 1. Spend Gold
    state.resources[faction].gold -= siegeCost;

    // 2. Reduce Fortification
    const newLvl = Math.max(0, targetLoc.fortificationLevel - 1);
    const newDef = FORTIFICATION_LEVELS[newLvl].bonus;

    const lIdx = state.locations.findIndex(l => l.id === targetId);
    if (lIdx !== -1) {
        state.locations[lIdx] = {
            ...targetLoc,
            fortificationLevel: newLvl,
            defense: newDef,
            hasBeenSiegedThisTurn: true
        };
    }

    // 3. Set Status/Split
    const siegeArmy = armiesAtTarget.sort((a, b) => b.strength - a.strength)[0];
    if (!siegeArmy) return;

    const siegeLocationType = siegeArmy.locationType;
    const siegeLocationId = siegeArmy.locationId;
    const siegeRoadId = siegeArmy.roadId;
    const siegeStageIndex = siegeArmy.stageIndex;

    if (siegeArmy.strength > requiredManpower + 500) {
        // Split army
        const remainStrength = siegeArmy.strength - requiredManpower;
        const idx = armies.findIndex(x => x.id === siegeArmy.id);
        if (idx !== -1) {
            armies[idx] = { ...siegeArmy, strength: remainStrength, isSieging: false };
            assigned.add(siegeArmy.id);

            const newId = `ai_siege_${mission.id}_${state.turn}`;
            const newSiegeArmy: Army = {
                ...siegeArmy,
                id: newId,
                strength: requiredManpower,
                isSieging: true,
                locationType: siegeLocationType,
                locationId: siegeLocationId,
                roadId: siegeRoadId,
                stageIndex: siegeStageIndex,
                destinationId: null,
                turnsUntilArrival: 0
            };
            armies.push(newSiegeArmy);
            assigned.add(newId);
        }
    } else {
        const idx = armies.findIndex(x => x.id === siegeArmy.id);
        if (idx !== -1) {
            armies[idx] = {
                ...siegeArmy,
                isSieging: true,
                destinationId: null,
                turnsUntilArrival: 0
            };
            assigned.add(siegeArmy.id);
        }
    }

    // 4. UI Notification
    const isPlayerTarget = targetLoc.faction === state.playerFaction ||
        armies.some(a => a.locationId === targetId && a.faction === state.playerFaction);

    if (isPlayerTarget) {
        state.siegeNotification = {
            targetName: targetLoc.name,
            attackerName: faction
        };
    }

    // Siege log - visible to all, CRITICAL for territory owner
    state.logs.push({
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'COMBAT' as any,
        message: `${faction} lays siege to ${targetLoc.name}! Defenses reduce to Level ${newLvl}.`,
        turn: state.turn,
        visibleToFactions: [],  // Visible to all
        baseSeverity: 'INFO' as any,
        criticalForFactions: targetLoc.faction !== 'NEUTRAL' ? [targetLoc.faction] : undefined,
        highlightTarget: { type: 'LOCATION', id: targetId }
    });
    if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] EXECUTED SIEGE at ${targetId}. Cost: ${siegeCost}, Manpower: ${requiredManpower}`);

    // 5. POST SIEGE ATTACK DECISION
    const nonSiegingArmies = armies.filter(a =>
        a.locationId === targetId &&
        a.faction === faction &&
        a.locationType === 'LOCATION' &&
        !a.isSieging &&
        !a.isSpent &&
        !a.isInsurgent &&
        !a.action
    );
    const offensiveStr = nonSiegingArmies.reduce((s, a) => s + a.strength, 0);
    // FIX: Fortification bonus only applies if garrison >= 500
    const postSiegeDefBonus = enemyGarrisonStr >= 500 ? newDef : 0;
    const effectiveDefenderStr = enemyGarrisonStr + postSiegeDefBonus;

    if (offensiveStr > effectiveDefenderStr) {
        if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] Post-Siege Attack: ${offensiveStr} vs ${effectiveDefenderStr} - CHARGE!`);
        mission.stage = 'ASSAULTING';
        nonSiegingArmies.forEach(a => {
            const idx = armies.findIndex(x => x.id === a.id);
            if (idx !== -1) {
                armies[idx] = { ...a, isSieging: false, isGarrisoned: false };
                assigned.add(a.id);
            }
        });
    } else {
        if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] Post-Siege Wait: ${offensiveStr} vs ${effectiveDefenderStr} - HOLD.`);
        nonSiegingArmies.forEach(a => {
            const idx = armies.findIndex(x => x.id === a.id);
            if (idx !== -1) {
                armies[idx] = { ...a, isGarrisoned: true };
                assigned.add(a.id);
            }
        });
    }
}

function handleNonSiegeScenario(
    mission: AIMission,
    faction: FactionId,
    armies: Army[],
    assigned: Set<string>,
    targetLoc: any,
    armiesAtTarget: Army[],
    strengthAtTarget: number
) {
    const targetId = mission.targetId;

    armiesAtTarget.forEach(a => {
        const idx = armies.findIndex(x => x.id === a.id);
        if (idx !== -1) {
            armies[idx] = { ...a, isSieging: false };
            assigned.add(a.id);
        }
    });

    // Calculate enemy garrison for fortification check
    const enemyGarrison = armies
        .filter(a => a.locationId === targetId && a.faction !== faction && a.locationType === 'LOCATION')
        .reduce((s, a) => s + a.strength, 0);

    // FIX: Fortification bonus only applies if garrison >= 500
    const effectiveDefense = enemyGarrison >= 500 ? (targetLoc.defense || 0) : 0;

    if (targetLoc.fortificationLevel === 0 || strengthAtTarget > (effectiveDefense + 2000) * 1.5) {
        mission.stage = 'ASSAULTING';
    }

    if (targetLoc.faction === faction) {
        mission.status = 'COMPLETED';
    }
}
