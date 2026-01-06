"use strict";
// Campaign Mission Handler - Process CAMPAIGN type missions
// This is the largest and most complex mission type
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCampaign = handleCampaign;
const types_1 = require("../../../../shared/types");
const utils_1 = require("../utils");
const constants_1 = require("../../../../shared/constants");
const types_2 = require("./types");
const garrison_1 = require("./garrison");
const movement_1 = require("./movement");
const gameConstants_1 = require("../../../../shared/data/gameConstants");
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
function handleCampaign(mission, state, faction, armies, assigned, profile) {
    const { targetId } = mission;
    const isConvergent = mission.data?.isConvergent === true;
    const stagingIds = mission.data?.stagingIds || [];
    const stagingId = mission.data?.stagingId;
    const reqStrength = mission.data?.requiredStrength || 1000;
    const targetLoc = state.locations.find(l => l.id === targetId);
    if (!targetLoc || (!stagingId && stagingIds.length === 0)) {
        if (gameConstants_1.DEBUG_AI)
            console.log(`[AI MILITARY ${faction}] Campaign ${mission.id}: ABORTED - No target or staging`);
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
    const armiesAtTarget = armies.filter(a => a.locationId === targetId &&
        a.faction === faction &&
        a.locationType === 'LOCATION');
    const armiesIncludingEnRoute = armies.filter(a => (a.locationId === targetId || (a.locationType === 'ROAD' && a.destinationId === targetId)) &&
        a.faction === faction);
    const strengthAtTarget = armiesAtTarget.reduce((s, a) => s + a.strength, 0);
    const strengthIncludingEnRoute = armiesIncludingEnRoute.reduce((s, a) => s + a.strength, 0);
    // Enemy Analysis
    const enemyArmiesAtTarget = armies.filter(a => a.locationId === targetId &&
        a.faction !== faction &&
        a.locationType === 'LOCATION');
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
                if (gameConstants_1.DEBUG_AI)
                    console.log(`[AI MILITARY ${faction}] Campaign ${mission.id} (${mission.stage}): Sustaining Reinforcements (Deficit ${deficit})`);
                (0, movement_1.pullReinforcements)(stagingId, armies, state, faction, assigned, deficit);
            }
        }
    }
    // STATE MACHINE
    if (mission.stage === 'GATHERING') {
        handleGatheringStage(mission, faction, armies, assigned, state, stagingId, strengthToSend, minAttackForce, strengthAtTarget, totalStrengthAtStaging);
    }
    if (mission.stage === 'MOVING' || mission.stage === 'SIEGING') {
        const shouldContinue = handleMovingStage(mission, faction, armies, assigned, state, armiesToMove, armiesIncludingEnRoute, targetId, stagingId, minGarrison, strengthToSend, strengthAtTarget);
        if (!shouldContinue)
            return;
    }
    // SIEGE DECISION
    handleSiegeDecision(mission, faction, armies, assigned, state, targetLoc, armiesAtTarget, enemyGarrisonStr, strengthAtTarget);
}
/**
 * Handle CONVERGENT campaign - synchronize attacks from multiple staging points.
 */
function handleConvergentCampaign(mission, state, faction, armies, assigned, profile) {
    const { targetId } = mission;
    const stagingIds = mission.data?.stagingIds || [];
    const reqStrength = mission.data?.requiredStrength || 1000;
    const targetLoc = state.locations.find(l => l.id === targetId);
    if (!targetLoc)
        return;
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
            (0, movement_1.pullReinforcements)(stageId, armies, state, faction, assigned, strengthPerStaging - strengthAtStaging);
        }
    }
    mission.data.convergentReadiness = readinessMap;
    // GATHERING stage: Wait until all points are ready
    if (mission.stage === 'GATHERING') {
        if (allReady) {
            if (gameConstants_1.DEBUG_AI)
                console.log(`[AI MILITARY ${faction}] CONVERGENT Campaign ${mission.id}: ALL staging points ready - LAUNCHING`);
            mission.stage = 'MOVING';
            // Assign armies from ALL staging points
            for (const stageId of stagingIds) {
                const armiesAtStaging = armies.filter(a => a.locationId === stageId &&
                    a.faction === faction &&
                    a.locationType === 'LOCATION' &&
                    !assigned.has(a.id));
                for (const army of armiesAtStaging) {
                    if (army.strength >= 200) {
                        mission.assignedArmyIds.push(army.id);
                        assigned.add(army.id);
                    }
                }
            }
        }
        else {
            if (gameConstants_1.DEBUG_AI)
                console.log(`[AI MILITARY ${faction}] CONVERGENT Campaign ${mission.id}: Waiting for all staging points...`);
        }
        return;
    }
    // MOVING stage: Move all assigned armies toward target
    if (mission.stage === 'MOVING') {
        for (const armyId of mission.assignedArmyIds) {
            const army = armies.find(a => a.id === armyId);
            if (!army || army.isSpent)
                continue;
            if (army.locationId === targetId) {
                continue; // Already at target
            }
            // Find road to target and start moving
            const armyStaging = army.locationId;
            const road = state.roads.find(r => (r.from === armyStaging && r.to === targetId) ||
                (r.to === armyStaging && r.from === targetId));
            if (road && army.locationType === 'LOCATION') {
                (0, movement_1.moveArmiesTo)([army], targetId, state, armies, assigned);
                if (gameConstants_1.DEBUG_AI)
                    console.log(`[AI MILITARY ${faction}] CONVERGENT: Moving army from ${armyStaging} toward ${targetId}`);
            }
        }
    }
}
function prepareDeployment(stagingId, faction, armies, assigned, state) {
    // Get ALL armies at staging (campaigns take priority over garrison duty)
    const allArmiesAtStaging = armies.filter(a => a.locationId === stagingId &&
        a.faction === faction &&
        a.locationType === 'LOCATION');
    const totalStrengthAtStaging = allArmiesAtStaging.reduce((s, a) => s + a.strength, 0);
    // Calculate minimum garrison for staging
    const stagingLoc = state.locations.find(l => l.id === stagingId);
    const minGarrison = (0, garrison_1.getMinGarrison)(stagingLoc, state.characters, faction);
    const availableStrength = totalStrengthAtStaging - minGarrison;
    // Select armies to send, leaving minimum behind
    let strengthToSend = 0;
    const armiesToMove = [];
    const availableAtStaging = allArmiesAtStaging.filter(a => !assigned.has(a.id));
    const sortedAvailable = availableAtStaging.sort((a, b) => b.strength - a.strength);
    for (const army of sortedAvailable) {
        const room = availableStrength - strengthToSend;
        if (room <= 0)
            break;
        if (army.strength <= room) {
            armiesToMove.push(army);
            strengthToSend += army.strength;
        }
        else if (room >= 200) {
            // Army is too big, SPLIT IT
            if (gameConstants_1.DEBUG_AI)
                console.log(`[AI MILITARY ${faction}] Splitting army ${army.id} to fill campaign capacity (Taking ${room}, Leaving ${army.strength - room})`);
            const idx = armies.findIndex(x => x.id === army.id);
            if (idx !== -1) {
                const stayStrength = army.strength - room;
                const moveStrength = room;
                armies[idx] = { ...army, strength: moveStrength };
                armiesToMove.push(armies[idx]);
                strengthToSend += moveStrength;
                const garrisonArmy = {
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
function checkAndFixBrokenCampaign(mission, faction, reqStrength, strengthIncludingEnRoute, stagingId, armies, state, assigned) {
    const activeStages = ['MOVING', 'SIEGING', 'ASSAULTING'];
    if (activeStages.includes(mission.stage)) {
        const threshold = Math.max(500, reqStrength * 0.3);
        if (strengthIncludingEnRoute < threshold) {
            if (gameConstants_1.DEBUG_AI)
                console.log(`[AI MILITARY ${faction}] Campaign ${mission.id}: ZOMBIE/BROKEN DETECTED (Str ${strengthIncludingEnRoute} < ${threshold}). Reverting to GATHERING.`);
            mission.stage = 'GATHERING';
        }
    }
}
function handleGatheringStage(mission, faction, armies, assigned, state, stagingId, strengthToSend, minAttackForce, strengthAtTarget, totalStrengthAtStaging) {
    const canLaunch = strengthToSend >= minAttackForce;
    if (canLaunch || strengthAtTarget > 500 || strengthToSend > 2000) {
        if (gameConstants_1.DEBUG_AI)
            console.log(`[AI MILITARY ${faction}] Campaign ${mission.id}: TRANSITIONING to MOVING (sending ${strengthToSend}, needed ${Math.floor(minAttackForce)})`);
        mission.stage = 'MOVING';
    }
    else {
        if (gameConstants_1.DEBUG_AI)
            console.log(`[AI MILITARY ${faction}] Campaign ${mission.id}: GATHERING Reinforcements (Have ${totalStrengthAtStaging}/${minAttackForce} at staging)`);
        (0, movement_1.pullReinforcements)(stagingId, armies, state, faction, assigned);
        const allAtStaging = armies.filter(a => a.locationId === stagingId && a.faction === faction && !assigned.has(a.id));
        allAtStaging.forEach(a => assigned.add(a.id));
    }
}
function handleMovingStage(mission, faction, armies, assigned, state, armiesToMove, armiesIncludingEnRoute, targetId, stagingId, minGarrison, strengthToSend, strengthAtTarget) {
    const armiesEnRoute = armiesToMove.length > 0 ? armiesToMove : armiesIncludingEnRoute;
    const movingStrength = armiesEnRoute.reduce((s, a) => s + a.strength, 0);
    // TACTICAL CHECK - Look ahead for threats
    const immediateThreat = state.armies
        .filter(a => a.faction !== faction && (a.locationId === targetId || (a.locationType === 'ROAD' && a.destinationId === stagingId)))
        .reduce((s, a) => s + a.strength, 0);
    const isSuicide = immediateThreat > movingStrength * 1.5;
    if (isSuicide && immediateThreat > 1000) {
        if (gameConstants_1.DEBUG_AI)
            console.log(`[AI MILITARY ${faction}] Campaign ${mission.id}: TACTICAL PAUSE - Threat ${immediateThreat} vs Moving ${movingStrength}`);
        // Stop existing movement and request reinforcements
        armiesEnRoute.forEach(a => {
            const idx = armies.findIndex(x => x.id === a.id);
            if (idx !== -1 && a.locationType === 'LOCATION' && a.locationId === stagingId) {
                if (gameConstants_1.DEBUG_AI)
                    console.log(`[AI MILITARY ${faction}] Holding at ${stagingId} to reinforce/fortify.`);
            }
        });
        const deficit = Math.floor(immediateThreat * 1.1) - movingStrength;
        if (deficit > 0) {
            if (gameConstants_1.DEBUG_AI)
                console.log(`[AI MILITARY ${faction}] Requesting reinforcements: ${deficit}`);
            (0, movement_1.pullReinforcements)(stagingId, armies, state, faction, assigned, deficit);
        }
        return false; // SKIP MOVEMENT this turn
    }
    // Execute movement
    if (armiesToMove.length > 0) {
        if (gameConstants_1.DEBUG_AI)
            console.log(`[AI MILITARY ${faction}] Campaign ${mission.id}: MOVING ${armiesToMove.length} armies (${strengthToSend} troops) to ${targetId}, leaving ${minGarrison} garrison`);
        armiesToMove.forEach(a => {
            const idx = armies.findIndex(x => x.id === a.id);
            if (idx !== -1) {
                armies[idx] = { ...armies[idx], isGarrisoned: false, action: undefined };
            }
        });
        const refreshedArmiesToMove = armiesToMove.map(a => armies.find(x => x.id === a.id)).filter(Boolean);
        (0, movement_1.moveArmiesTo)(refreshedArmiesToMove, targetId, state, armies, assigned);
    }
    if (strengthAtTarget > 0 && mission.stage === 'MOVING') {
        mission.stage = 'SIEGING';
    }
    return true;
}
function handleSiegeDecision(mission, faction, armies, assigned, state, targetLoc, armiesAtTarget, enemyGarrisonStr, strengthAtTarget) {
    const targetId = mission.targetId;
    let shouldSiege = false;
    let siegeCost = 0;
    let requiredManpower = 500;
    const isFortified = targetLoc.fortificationLevel > 0;
    const hasDefenders = enemyGarrisonStr >= 500;
    const isNeutral = targetLoc.faction === types_1.FactionId.NEUTRAL;
    const defBonus = constants_1.FORTIFICATION_LEVELS[targetLoc.fortificationLevel]?.bonus || 0;
    const effectiveDef = enemyGarrisonStr + defBonus;
    const canAssault = strengthAtTarget > effectiveDef * 1.5;
    // FIX: Nobles CAN siege - only Neutral faction is excluded
    // Nobles just can't negotiate with neutrals (handled below)
    if ((hasDefenders || !canAssault) && isFortified && faction !== types_1.FactionId.NEUTRAL) {
        let canNegotiate = false;
        // Only Republicans and Conspirators can negotiate with neutrals
        if (isNeutral && faction !== types_1.FactionId.NOBLES) {
            canNegotiate = state.locations.some(l => l.faction === faction &&
                l.type === 'CITY' &&
                l.foodStock >= 150 &&
                l.foodIncome > 0 &&
                (0, utils_1.getDistance)(l.id, targetId, state.roads) <= 3);
            if (canNegotiate) {
                if (gameConstants_1.DEBUG_AI)
                    console.log(`[AI MILITARY ${faction}] Skipping Siege at ${targetId} (Neutral) - Preferring Negotiation`);
            }
        }
        if (!canNegotiate) {
            requiredManpower = targetLoc.fortificationLevel >= 3 ? 1000 : 500;
            siegeCost = types_2.SIEGE_COST_TABLE[targetLoc.fortificationLevel] || 100;
            if (state.resources[faction].gold >= siegeCost && strengthAtTarget >= requiredManpower) {
                shouldSiege = true;
                if (gameConstants_1.DEBUG_AI)
                    console.log(`[AI MILITARY ${faction}] Siege CHECK PASSED at ${targetId}: Fortification=${targetLoc.fortificationLevel}, Cost=${siegeCost}, Manpower=${strengthAtTarget}/${requiredManpower}`);
            }
            else {
                if (gameConstants_1.DEBUG_AI)
                    console.log(`[AI MILITARY ${faction}] Siege Check FAILED at ${targetId}: Gold=${state.resources[faction].gold}/${siegeCost}, Manpower=${strengthAtTarget}/${requiredManpower}`);
            }
        }
    }
    if (shouldSiege && mission.stage !== 'ASSAULTING') {
        executeSiege(mission, faction, armies, assigned, state, targetLoc, armiesAtTarget, enemyGarrisonStr, siegeCost, requiredManpower);
    }
    else {
        handleNonSiegeScenario(mission, faction, armies, assigned, targetLoc, armiesAtTarget, strengthAtTarget);
    }
}
function executeSiege(mission, faction, armies, assigned, state, targetLoc, armiesAtTarget, enemyGarrisonStr, siegeCost, requiredManpower) {
    const targetId = mission.targetId;
    // 1. Spend Gold
    state.resources[faction].gold -= siegeCost;
    // 2. Reduce Fortification
    const newLvl = Math.max(0, targetLoc.fortificationLevel - 1);
    const newDef = constants_1.FORTIFICATION_LEVELS[newLvl].bonus;
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
    if (!siegeArmy)
        return;
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
            const newSiegeArmy = {
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
    }
    else {
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
    state.logs.push(`${faction} lays siege to ${targetLoc.name}! Defenses reduce to Level ${newLvl}.`);
    if (gameConstants_1.DEBUG_AI)
        console.log(`[AI MILITARY ${faction}] EXECUTED SIEGE at ${targetId}. Cost: ${siegeCost}, Manpower: ${requiredManpower}`);
    // 5. POST SIEGE ATTACK DECISION
    const nonSiegingArmies = armies.filter(a => a.locationId === targetId &&
        a.faction === faction &&
        a.locationType === 'LOCATION' &&
        !a.isSieging &&
        !a.isSpent &&
        !a.isInsurgent &&
        !a.action);
    const offensiveStr = nonSiegingArmies.reduce((s, a) => s + a.strength, 0);
    const effectiveDefenderStr = enemyGarrisonStr + newDef;
    if (offensiveStr > effectiveDefenderStr) {
        if (gameConstants_1.DEBUG_AI)
            console.log(`[AI MILITARY ${faction}] Post-Siege Attack: ${offensiveStr} vs ${effectiveDefenderStr} - CHARGE!`);
        mission.stage = 'ASSAULTING';
        nonSiegingArmies.forEach(a => {
            const idx = armies.findIndex(x => x.id === a.id);
            if (idx !== -1) {
                armies[idx] = { ...a, isSieging: false, isGarrisoned: false };
                assigned.add(a.id);
            }
        });
    }
    else {
        if (gameConstants_1.DEBUG_AI)
            console.log(`[AI MILITARY ${faction}] Post-Siege Wait: ${offensiveStr} vs ${effectiveDefenderStr} - HOLD.`);
        nonSiegingArmies.forEach(a => {
            const idx = armies.findIndex(x => x.id === a.id);
            if (idx !== -1) {
                armies[idx] = { ...a, isGarrisoned: true };
                assigned.add(a.id);
            }
        });
    }
}
function handleNonSiegeScenario(mission, faction, armies, assigned, targetLoc, armiesAtTarget, strengthAtTarget) {
    const targetId = mission.targetId;
    armiesAtTarget.forEach(a => {
        const idx = armies.findIndex(x => x.id === a.id);
        if (idx !== -1) {
            armies[idx] = { ...a, isSieging: false };
            assigned.add(a.id);
        }
    });
    if (targetLoc.fortificationLevel === 0 || strengthAtTarget > (targetLoc.defense + 2000) * 1.5) {
        mission.stage = 'ASSAULTING';
    }
    if (targetLoc.faction === faction) {
        mission.status = 'COMPLETED';
    }
}
