"use strict";
// AI Battle Resolution Module - Resolve AI vs AI battles
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAIBattles = resolveAIBattles;
exports.getPlayerBattles = getPlayerBattles;
const types_1 = require("../../types");
const constants_1 = require("../../constants");
const combatDetection_1 = require("../combatDetection");
const combat_1 = require("../combat");
const logFactory_1 = require("../logs/logFactory");
const makeExamples_1 = require("../domain/governor/makeExamples");
const governorService_1 = require("../domain/governor/governorService");
const leaderStatusUpdates_1 = require("../turnLogic/leaderStatusUpdates");
/**
 * Resolve all AI vs AI battles for the current turn.
 *
 * This function loops to handle cascading battles (e.g., winner fights next invader).
 * It filters out player battles and sieging battles.
 *
 * @param state - Current game state
 * @param existingInsurrectionNotification - Existing notification from earlier in the turn
 * @returns Updated game state elements and logs
 */
function resolveAIBattles(state, existingInsurrectionNotification) {
    const logs = [];
    let locations = state.locations.map(l => ({ ...l }));
    let roads = state.roads.map(r => ({ ...r, stages: r.stages.map(s => ({ ...s })) }));
    let armies = [...state.armies];
    let characters = [...state.characters];
    let stats = { ...state.stats };
    let insurrectionNotification = existingInsurrectionNotification;
    let loops = 0;
    let battles = [];
    while (loops < 10) {
        loops++;
        battles = (0, combatDetection_1.detectBattles)(locations, armies, roads);
        const humanFactions = state.humanFactions || [state.playerFaction];
        // Filter out battles involving ANY human faction, and sieging battles
        const activeAiBattles = battles.filter(b => !humanFactions.includes(b.attackerFaction) &&
            !humanFactions.includes(b.defenderFaction) &&
            !b.attackers.some(a => a.isSieging));
        if (activeAiBattles.length === 0) {
            // AI siege logs removed per user request
            break;
        }
        // Resolve only the first battle, then re-detect
        const battle = activeAiBattles[0];
        // Calculate combat strengths
        const attStr = (0, combat_1.calculateCombatStrength)(battle.attackers, characters, 0);
        const defStr = (0, combat_1.calculateCombatStrength)(battle.defenders, characters, battle.defenseBonus);
        const attWin = attStr > defStr;
        const loserArmies = attWin ? battle.defenders : battle.attackers;
        const winnerArmies = attWin ? battle.attackers : battle.defenders;
        const losses = attWin ? defStr : Math.max(0, attStr - battle.defenseBonus);
        // Calculate death toll
        const deadDef = battle.defenders.reduce((s, a) => s + a.strength, 0);
        const deadAtt = battle.attackers.reduce((s, a) => s + a.strength, 0);
        if (attWin) {
            stats.deathToll += deadDef + Math.min(deadAtt, losses);
            // Update location control
            if (battle.locationId) {
                const locIndex = locations.findIndex(l => l.id === battle.locationId);
                if (locIndex !== -1) {
                    const loc = locations[locIndex];
                    const newFort = Math.max(0, loc.fortificationLevel - 1);
                    let stability = loc.stability;
                    // Spec: Insurrection stability adjustment
                    if (battle.isInsurgentBattle && battle.attackerFaction !== types_1.FactionId.NEUTRAL) {
                        if (stability < 49) {
                            stability = Math.min(49, stability + 10);
                        }
                    }
                    const updatedLoc = {
                        ...loc,
                        faction: battle.attackerFaction,
                        defense: constants_1.FORTIFICATION_LEVELS[newFort].bonus,
                        fortificationLevel: newFort,
                        stability
                    };
                    locations[locIndex] = updatedLoc;
                    // Governor Validation for previous owner
                    const governor = characters.find(c => c.locationId === loc.id && c.status === types_1.CharacterStatus.GOVERNING && c.faction === loc.faction);
                    if (governor) {
                        const validation = (0, governorService_1.validateGovernorStatus)(governor, updatedLoc, locations, roads, state.turn);
                        if (!validation.isValid) {
                            characters = characters.map(c => c.id === validation.character.id ? validation.character : c);
                            if (validation.log)
                                logs.push(validation.log);
                        }
                    }
                    // UPDATE LEADER STATUS: UNDERCOVER -> AVAILABLE for winner, AVAILABLE -> UNDERCOVER for loser
                    characters = (0, leaderStatusUpdates_1.handleLeaderStatusOnCapture)(updatedLoc.id, updatedLoc.faction, characters);
                }
            }
            // Handle insurgent armies
            if (battle.isInsurgentBattle) {
                armies = armies.map(a => battle.attackers.some(atk => atk.id === a.id)
                    ? { ...a, isInsurgent: false }
                    : a);
                // Create notification if none exists
                if (!insurrectionNotification) {
                    const armyIds = battle.attackers.map(a => a.id);
                    const leader = characters.find(c => c.armyId && armyIds.includes(c.armyId));
                    const locName = locations.find(l => l.id === battle.locationId)?.name || "Unknown";
                    const notifType = battle.attackerFaction === types_1.FactionId.NEUTRAL ? 'SUCCESS_NEUTRAL' : 'SUCCESS_AI';
                    insurrectionNotification = {
                        type: notifType,
                        faction: battle.attackerFaction,
                        targetName: locName,
                        leaderName: leader?.name || "A leader",
                        loserFaction: battle.defenderFaction
                    };
                }
            }
            // AI Battle log removed per user request
        }
        else {
            stats.deathToll += Math.min(deadDef, losses) + deadAtt;
            // AI Battle log removed per user request
            // === MAKE EXAMPLES PROCESSING ===
            // When an insurrection is repressed and MAKE_EXAMPLES is active
            if (battle.isInsurgentBattle && battle.locationId) {
                const locIndex = locations.findIndex(l => l.id === battle.locationId);
                if (locIndex !== -1) {
                    const loc = locations[locIndex];
                    // Check if Make Examples policy is active
                    if ((0, makeExamples_1.isMakeExamplesActive)(loc)) {
                        const insurgentStrength = battle.attackers.reduce((s, a) => s + a.strength, 0);
                        // Find governor doing the repression
                        // (Leader present + same faction + not dead/undercover)
                        const governor = characters.find(c => c.locationId === loc.id &&
                            c.faction === battle.defenderFaction &&
                            c.status !== types_1.CharacterStatus.DEAD &&
                            c.status !== types_1.CharacterStatus.UNDERCOVER);
                        const governorName = governor ? governor.name : "The Governor";
                        const result = (0, makeExamples_1.processMakeExamples)({
                            location: loc,
                            controllerFaction: battle.defenderFaction,
                            insurgentStrength,
                            turn: state.turn,
                            governorName
                        });
                        // Apply updates
                        locations[locIndex] = result.location;
                        stats.deathToll += result.casualties;
                        // Add repression log
                        if (result.log) {
                            logs.push(result.log);
                        }
                    }
                }
            }
            // Failure notification for non-neutral insurrections
            if (battle.isInsurgentBattle && !insurrectionNotification && battle.attackerFaction !== types_1.FactionId.NEUTRAL) {
                const armyIds = battle.attackers.map(a => a.id);
                const leader = characters.find(c => c.armyId && armyIds.includes(c.armyId));
                const locName = locations.find(l => l.id === battle.locationId)?.name || "Unknown";
                insurrectionNotification = {
                    type: 'FAILURE',
                    faction: battle.attackerFaction,
                    targetName: locName,
                    leaderName: leader?.name || "A leader",
                    loserFaction: battle.defenderFaction
                };
            }
        }
        // Apply losses
        const loserIds = loserArmies.map(a => a.id);
        const { updatedArmies } = (0, combat_1.applySequentialLosses)(winnerArmies, losses);
        armies = armies.filter(a => !loserIds.includes(a.id) && !winnerArmies.some(wa => wa.id === a.id));
        updatedArmies.forEach(ua => {
            if (ua.strength > 0) {
                armies.push({ ...ua, isSpent: true });
            }
        });
        // Process leader deaths
        [...battle.attackers, ...battle.defenders].forEach(army => {
            const leadersInArmy = characters.filter(c => c.armyId === army.id);
            leadersInArmy.forEach(leader => {
                if (!armies.find(a => a.id === army.id)) {
                    let died = Math.random() > 0.5;
                    // Insurrection leaders always die on defeat
                    if (battle.isInsurgentBattle && army.faction === battle.attackerFaction) {
                        died = true;
                    }
                    if (died) {
                        characters = characters.map(c => c.id === leader.id
                            ? { ...c, status: types_1.CharacterStatus.DEAD }
                            : c);
                        // Leader death log - INFO severity
                        const deathLog = (0, logFactory_1.createLeaderDiedLog)(leader.name, state.turn);
                        logs.push(deathLog);
                    }
                    else {
                        const escapeLocs = locations.filter(loc => loc.faction === leader.faction);
                        const target = escapeLocs.length
                            ? escapeLocs[Math.floor(Math.random() * escapeLocs.length)].id
                            : null;
                        if (target) {
                            characters = characters.map(c => c.id === leader.id
                                ? { ...c, status: types_1.CharacterStatus.AVAILABLE, armyId: null, locationId: target }
                                : c);
                        }
                        else {
                            characters = characters.map(c => c.id === leader.id
                                ? { ...c, status: types_1.CharacterStatus.DEAD }
                                : c);
                        }
                    }
                }
            });
        });
    }
    return {
        locations,
        roads,
        armies,
        characters,
        stats,
        logs,
        insurrectionNotification
    };
}
/**
 * Get player-relevant battles from the current state.
 * Used to determine if player needs to make combat decisions.
 *
 * @param battles - All detected battles
 * @param playerFaction - The player's faction
 * @returns Battles where player is attacker or defender
 */
function getPlayerBattles(battles, playerFaction) {
    return battles.filter(b => b.attackerFaction === playerFaction ||
        b.defenderFaction === playerFaction);
}
