"use strict";
// Fight Resolver - Handles direct combat (FIGHT choice)
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveFight = void 0;
const types_1 = require("../../types");
const constants_1 = require("../../constants");
const powerCalculation_1 = require("./powerCalculation");
const leaderSurvival_1 = require("./leaderSurvival");
const orphanedLeaders_1 = require("./orphanedLeaders");
const helpers_1 = require("./helpers");
const makeExamples_1 = require("../domain/governor/makeExamples");
const governorService_1 = require("../domain/governor/governorService");
const leaderStatusUpdates_1 = require("../turnLogic/leaderStatusUpdates");
/**
 * Resolve a direct combat engagement (FIGHT choice)
 */
const resolveFight = (combat, armies, characters, locations, roads, stats, turn = 0) => {
    let newArmies = [...armies];
    let newCharacters = [...characters];
    let newLocations = [...locations];
    let newRoads = [...roads];
    let newStats = { ...stats };
    let logMsg = "";
    const actualAttackers = (0, helpers_1.getArmiesAtCombatLocation)(combat.attackerFaction, newArmies, combat);
    const actualDefenders = (0, helpers_1.getArmiesAtCombatLocation)(combat.defenderFaction, newArmies, combat);
    const attStr = (0, powerCalculation_1.calculateCombatStrength)(actualAttackers, newCharacters, 0);
    const defenseVal = combat.isInsurgentBattle ? 0 : combat.defenseBonus;
    const rawDefTroops = actualDefenders.reduce((s, a) => s + a.strength, 0);
    const effectiveDefense = rawDefTroops >= 500 ? defenseVal : 0;
    const defStr = (0, powerCalculation_1.calculateCombatStrength)(actualDefenders, newCharacters, effectiveDefense);
    const attWin = attStr > defStr;
    const locationName = (0, helpers_1.getLocationName)(combat, locations, roads);
    const involvedIds = [...actualAttackers, ...actualDefenders].map(a => a.id);
    newArmies = newArmies.filter(a => !involvedIds.includes(a.id));
    if (attWin) {
        // Process defender leader survival
        const survivalResult = (0, leaderSurvival_1.processLeaderSurvival)(actualDefenders.map(a => a.id), false, newCharacters, { combat, attackerWon: true, locations });
        newCharacters = survivalResult.updatedCharacters;
        survivalResult.logMessages.forEach(msg => logMsg += ` ${msg}`);
        // Death Toll: All defenders lost
        newStats.deathToll += actualDefenders.reduce((sum, a) => sum + a.strength, 0);
        const losses = defStr;
        // Death Toll: Attackers lose `losses` (or max strength if fewer)
        const totalAttackerStrength = actualAttackers.reduce((sum, a) => sum + a.strength, 0);
        newStats.deathToll += Math.min(totalAttackerStrength, losses);
        const { updatedArmies: survivingAttackers } = (0, powerCalculation_1.applySequentialLosses)(actualAttackers, losses);
        if (survivingAttackers.length === 0 && actualAttackers.length > 0) {
            // Pyrrhic Victory (Spec 7.5.3 Règle du Dernier Survivant)
            const survivor = { ...actualAttackers[0], strength: 1, isSpent: true };
            newStats.deathToll = Math.max(0, newStats.deathToll - 1);
            if (combat.locationId) {
                survivor.locationType = 'LOCATION';
                survivor.locationId = combat.locationId;
                survivor.roadId = null;
                survivor.destinationId = null;
                survivor.lastSafePosition = { type: 'LOCATION', id: combat.locationId };
                survivor.foodSourceId = combat.locationId;
            }
            newArmies.push(survivor);
        }
        else {
            survivingAttackers.forEach(ua => {
                const isRoadBattle = !!combat.roadId;
                const movedArmy = {
                    ...ua,
                    isSpent: !isRoadBattle,
                    justMoved: true
                };
                if (combat.locationId) {
                    movedArmy.locationType = 'LOCATION';
                    movedArmy.locationId = combat.locationId;
                    movedArmy.roadId = null;
                    movedArmy.destinationId = null;
                    movedArmy.tripDestinationId = null;
                    movedArmy.lastSafePosition = { type: 'LOCATION', id: combat.locationId };
                    movedArmy.foodSourceId = combat.locationId;
                }
                else if (combat.roadId && combat.stageIndex !== undefined) {
                    movedArmy.locationType = 'ROAD';
                    movedArmy.roadId = combat.roadId;
                    movedArmy.stageIndex = combat.stageIndex;
                    movedArmy.lastSafePosition = { type: 'ROAD', id: combat.roadId, stageIndex: combat.stageIndex };
                }
                newArmies.push(movedArmy);
            });
        }
        logMsg += `Victory at ${locationName}! Defenders wiped out.`;
        if (combat.locationId) {
            newLocations = newLocations.map(l => {
                if (l.id === combat.locationId) {
                    const newFortLevel = Math.max(0, l.fortificationLevel - 1);
                    const newDefense = constants_1.FORTIFICATION_LEVELS[newFortLevel].bonus;
                    // Stability handling for insurgent victories:
                    // - Faction insurrections (attackerFaction != NEUTRAL): +10 stability max
                    // - Spontaneous neutral uprisings (attackerFaction == NEUTRAL): no change
                    let newStability = l.stability;
                    if (combat.isInsurgentBattle) {
                        if (combat.attackerFaction !== types_1.FactionId.NEUTRAL) {
                            // Faction insurrection victory: +10 stability max
                            newStability = Math.min(l.stability + 10, 100);
                        }
                        // Neutral spontaneous uprising: no stability change
                    }
                    const updatedLoc = {
                        ...l,
                        faction: combat.attackerFaction,
                        defense: newDefense,
                        fortificationLevel: newFortLevel,
                        stability: newStability,
                        // Clear governor policies when location changes hands
                        governorPolicies: {}
                    };
                    // GOVERNOR VALIDATION for previous owner
                    const governor = newCharacters.find(c => c.locationId === combat.locationId && c.status === types_1.CharacterStatus.GOVERNING && c.faction === l.faction);
                    if (governor) {
                        // Use newLocations (which contains other potential friendly territories) for flee destination
                        const validation = (0, governorService_1.validateGovernorStatus)(governor, updatedLoc, newLocations, newRoads, 0); // Turn 0?
                        if (!validation.isValid) {
                            newCharacters = newCharacters.map(c => c.id === validation.character.id ? validation.character : c);
                            if (validation.log)
                                logMsg += ` ${validation.log.message}`;
                        }
                    }
                    // UPDATE LEADER STATUS: UNDERCOVER -> AVAILABLE for winner, AVAILABLE -> UNDERCOVER for loser
                    newCharacters = (0, leaderStatusUpdates_1.handleLeaderStatusOnCapture)(updatedLoc.id, updatedLoc.faction, newCharacters);
                    return updatedLoc;
                }
                return l;
            });
        }
        if (combat.roadId && combat.stageIndex !== undefined) {
            newRoads = newRoads.map(r => r.id === combat.roadId ? {
                ...r,
                stages: r.stages.map(s => s.index === combat.stageIndex ? { ...s, faction: combat.attackerFaction, fortificationLevel: 0 } : s)
            } : r);
        }
    }
    else {
        // Defender wins
        // Process attacker leader survival
        const survivalResult = (0, leaderSurvival_1.processLeaderSurvival)(actualAttackers.map(a => a.id), true, newCharacters, { combat, attackerWon: false, locations });
        newCharacters = survivalResult.updatedCharacters;
        survivalResult.logMessages.forEach(msg => logMsg += ` ${msg}`);
        // Death Toll: All attackers lost
        newStats.deathToll += actualAttackers.reduce((sum, a) => sum + a.strength, 0);
        const losses = Math.max(0, attStr - effectiveDefense);
        const totalDefenderStrength = actualDefenders.reduce((sum, a) => sum + a.strength, 0);
        newStats.deathToll += Math.min(totalDefenderStrength, losses);
        const { updatedArmies: survivingDefenders } = (0, powerCalculation_1.applySequentialLosses)(actualDefenders, losses);
        if (survivingDefenders.length === 0 && actualDefenders.length > 0) {
            const survivor = { ...actualDefenders[0], strength: 1 };
            newStats.deathToll = Math.max(0, newStats.deathToll - 1);
            newArmies.push(survivor);
        }
        else {
            // FIX: Winning defenders on roads should advance one stage
            // They were blocked by the attacker, now they can continue their march
            // CRITICAL: Only if they were ACTIVELY MOVING (not garrisoned)
            survivingDefenders.forEach(ud => {
                let advancedArmy = { ...ud };
                // Only advance if: road battle, defender has destination, on road, AND was not garrisoned
                const wasActivelyMoving = ud.destinationId && !ud.isGarrisoned;
                if (combat.roadId && combat.stageIndex !== undefined && wasActivelyMoving && ud.locationType === 'ROAD') {
                    const road = roads.find(r => r.id === combat.roadId);
                    if (road) {
                        const nextStage = ud.stageIndex + (ud.direction === 'FORWARD' ? 1 : -1);
                        if (nextStage >= 0 && nextStage < road.stages.length) {
                            // Advance to next stage
                            advancedArmy.stageIndex = nextStage;
                            advancedArmy.justMoved = true; // They moved this turn
                        }
                        else {
                            // Arrived at destination
                            const destId = ud.direction === 'FORWARD' ? road.to : road.from;
                            advancedArmy.locationType = 'LOCATION';
                            advancedArmy.locationId = destId;
                            advancedArmy.roadId = null;
                            advancedArmy.stageIndex = 0;
                            advancedArmy.destinationId = null;
                            advancedArmy.justMoved = true;
                        }
                    }
                }
                newArmies.push(advancedArmy);
            });
        }
        logMsg += `Defeat at ${locationName}. Attackers wiped out.`;
        // === MAKE EXAMPLES PROCESSING ===
        // When an insurrection is repressed and MAKE_EXAMPLES is active
        if (combat.isInsurgentBattle && combat.locationId) {
            const locIndex = newLocations.findIndex(l => l.id === combat.locationId);
            if (locIndex !== -1) {
                const loc = newLocations[locIndex];
                // Check if Make Examples policy is active
                if ((0, makeExamples_1.isMakeExamplesActive)(loc)) {
                    const insurgentStrength = actualAttackers.reduce((s, a) => s + a.strength, 0);
                    // Find governor doing the repression
                    // Note: 'characters' arg includes all chars.
                    const governor = characters.find(c => c.locationId === loc.id &&
                        c.faction === combat.defenderFaction &&
                        c.status !== types_1.CharacterStatus.DEAD &&
                        c.status !== types_1.CharacterStatus.UNDERCOVER);
                    const governorName = governor ? governor.name : "The Governor";
                    const result = (0, makeExamples_1.processMakeExamples)({
                        location: loc,
                        controllerFaction: combat.defenderFaction,
                        insurgentStrength,
                        turn,
                        governorName
                    });
                    // Apply updates
                    newLocations[locIndex] = result.location;
                    newStats.deathToll += result.casualties;
                    logMsg += ` Governor made brutal examples. ${result.casualties} civilians executed.`;
                }
            }
        }
    }
    // Identify armies that will be removed (strength <= 0)
    const removedArmyIds = newArmies.filter(a => a.strength <= 0).map(a => a.id);
    newArmies = newArmies.filter(a => a.strength > 0);
    // Process orphaned leaders from winning faction (Pyrrhic victory scenario)
    // Leaders of the LOSING faction are already handled by processLeaderSurvival above.
    const winningFaction = attWin ? combat.attackerFaction : combat.defenderFaction;
    const orphanedResult = (0, orphanedLeaders_1.processOrphanedLeaders)(removedArmyIds, newArmies, newCharacters, { combat, winningFaction, locations, roads });
    newCharacters = orphanedResult.updatedCharacters;
    return {
        armies: newArmies,
        locations: newLocations,
        roads: newRoads,
        characters: newCharacters,
        stats: newStats,
        logMessage: logMsg
    };
};
exports.resolveFight = resolveFight;
