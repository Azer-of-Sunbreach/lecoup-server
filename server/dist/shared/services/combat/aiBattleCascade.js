"use strict";
// AI Battle Cascade - Auto-resolution of AI vs AI battles
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlayerBattles = exports.resolveAIBattleCascade = void 0;
const types_1 = require("../../types");
const constants_1 = require("../../constants");
const combatDetection_1 = require("../combatDetection");
const powerCalculation_1 = require("./powerCalculation");
const governorService_1 = require("../domain/governor/governorService");
const leaderStatusUpdates_1 = require("../turnLogic/leaderStatusUpdates");
/**
 * Auto-resolve all AI vs AI battles (neither faction is player)
 * Loops until no more AI battles exist (max 10 iterations for safety)
 *
 * @param playerFaction - The player's faction (or AI faction in multiplayer)
 * @param armies - Current armies
 * @param characters - Current characters
 * @param locations - Current locations
 * @param roads - Current roads
 * @param stats - Current game stats
 * @param humanFactions - Array of human-controlled factions (for multiplayer)
 */
const resolveAIBattleCascade = (playerFaction, armies, characters, locations, roads, stats, humanFactions) => {
    let newArmies = [...armies];
    let newCharacters = [...characters];
    let newLocations = [...locations];
    let newRoads = [...roads];
    let newStats = { ...stats };
    const logMessages = [];
    const logEntries = [];
    let currentBattles = (0, combatDetection_1.detectBattles)(newLocations, newArmies, newRoads);
    let loops = 0;
    while (loops < 10) {
        loops++;
        // FIX: In multiplayer, check against ALL human factions, not just playerFaction
        // In single-player, humanFactions is undefined so we fall back to playerFaction check
        const isHumanFaction = (faction) => {
            if (humanFactions && humanFactions.length > 0) {
                return humanFactions.includes(faction);
            }
            return faction === playerFaction;
        };
        const aiBattles = currentBattles.filter(b => !isHumanFaction(b.attackerFaction) &&
            !isHumanFaction(b.defenderFaction) &&
            !b.attackers.some(a => a.isSieging));
        if (aiBattles.length === 0)
            break;
        const battle = aiBattles[0];
        const attStr = (0, powerCalculation_1.calculateCombatStrength)(battle.attackers, newCharacters, 0);
        const defStr = (0, powerCalculation_1.calculateCombatStrength)(battle.defenders, newCharacters, battle.defenseBonus);
        const attWin = attStr > defStr;
        const loserArmies = attWin ? battle.defenders : battle.attackers;
        const winnerArmies = attWin ? battle.attackers : battle.defenders;
        const losses = attWin ? defStr : Math.max(0, attStr - battle.defenseBonus);
        const deadDef = battle.defenders.reduce((s, a) => s + a.strength, 0);
        const deadAtt = battle.attackers.reduce((s, a) => s + a.strength, 0);
        newStats.deathToll += attWin ? (deadDef + Math.min(deadAtt, losses)) : (Math.min(deadDef, losses) + deadAtt);
        if (attWin) {
            const locName = battle.locationId ? newLocations.find(l => l.id === battle.locationId)?.name : 'road';
            logMessages.push(`AI Battle: ${types_1.FACTION_NAMES[battle.attackerFaction]} took ${locName}.`);
            if (battle.locationId) {
                newLocations = newLocations.map(l => {
                    if (l.id === battle.locationId) {
                        const newFort = Math.max(0, l.fortificationLevel - 1);
                        // Stability handling for insurgent victories:
                        // - Faction insurrections (attackerFaction != NEUTRAL): +10 stability max
                        // - Spontaneous neutral uprisings (attackerFaction == NEUTRAL): no change
                        let newStability = l.stability;
                        if (battle.isInsurgentBattle) {
                            if (battle.attackerFaction !== types_1.FactionId.NEUTRAL) {
                                // Faction insurrection victory: +10 stability max
                                newStability = Math.min(l.stability + 10, 100);
                            }
                            // Neutral spontaneous uprising: no stability change
                        }
                        const updatedLoc = {
                            ...l,
                            faction: battle.attackerFaction,
                            defense: constants_1.FORTIFICATION_LEVELS[newFort].bonus,
                            fortificationLevel: newFort,
                            stability: newStability
                        };
                        // GOVERNOR VALIDATION for previous owner
                        // Default to turn 0 as we don't have turn info here
                        const governor = newCharacters.find(c => c.locationId === battle.locationId && c.status === types_1.CharacterStatus.GOVERNING && c.faction === l.faction);
                        if (governor) {
                            const validation = (0, governorService_1.validateGovernorStatus)(governor, updatedLoc, newLocations, newRoads, 0);
                            if (!validation.isValid) {
                                newCharacters = newCharacters.map(c => c.id === validation.character.id ? validation.character : c);
                                if (validation.log)
                                    logMessages.push(validation.log.message);
                            }
                        }
                        // UPDATE LEADER STATUS: UNDERCOVER -> AVAILABLE for winner, AVAILABLE -> UNDERCOVER for loser
                        newCharacters = (0, leaderStatusUpdates_1.handleLeaderStatusOnCapture)(updatedLoc.id, updatedLoc.faction, newCharacters);
                        return updatedLoc;
                    }
                    return l;
                });
            }
            else if (battle.roadId) {
                newRoads = newRoads.map(r => r.id === battle.roadId ? {
                    ...r,
                    stages: r.stages.map(s => s.index === battle.stageIndex ? {
                        ...s,
                        faction: battle.attackerFaction,
                        fortificationLevel: Math.max(0, s.fortificationLevel - 1)
                    } : s)
                } : r);
            }
            if (battle.isInsurgentBattle) {
                newArmies = newArmies.map(a => battle.attackers.some(atk => atk.id === a.id) ? { ...a, isInsurgent: false } : a);
            }
            logEntries.push({
                key: 'aiBattleWon',
                params: { faction: battle.attackerFaction, location: battle.locationId || locName }
            });
        }
        else {
            logMessages.push(`AI Battle: ${types_1.FACTION_NAMES[battle.attackerFaction]} repelled.`);
            logEntries.push({
                key: 'aiBattleRepelled',
                params: { faction: battle.attackerFaction }
            });
        }
        const loserIds = loserArmies.map(a => a.id);
        const { updatedArmies } = (0, powerCalculation_1.applySequentialLosses)(winnerArmies, losses);
        newArmies = newArmies.filter(a => !loserIds.includes(a.id) && !winnerArmies.some(wa => wa.id === a.id));
        updatedArmies.forEach(ua => { if (ua.strength > 0)
            newArmies.push({ ...ua, isSpent: true }); });
        // Leader casualty check
        const engagedArmies = [...battle.attackers, ...battle.defenders];
        const engagedArmyIds = engagedArmies.map(a => a.id);
        const leaders = newCharacters.filter(c => c.armyId && engagedArmyIds.includes(c.armyId));
        leaders.forEach(l => {
            if (!newArmies.find(a => a.id === l.armyId)) {
                let died = Math.random() > 0.5;
                if (battle.isInsurgentBattle)
                    died = true;
                if (died) {
                    newCharacters = newCharacters.map(c => c.id === l.id ? { ...c, status: types_1.CharacterStatus.DEAD } : c);
                    logMessages.push(`${l.name} died.`);
                }
                else {
                    newCharacters = newCharacters.map(c => c.id === l.id ? { ...c, status: types_1.CharacterStatus.AVAILABLE, armyId: null } : c);
                }
            }
        });
        currentBattles = (0, combatDetection_1.detectBattles)(newLocations, newArmies, newRoads);
    }
    return {
        armies: newArmies,
        locations: newLocations,
        roads: newRoads,
        characters: newCharacters,
        stats: newStats,
        logMessages
    };
};
exports.resolveAIBattleCascade = resolveAIBattleCascade;
/**
 * Filter battles to only include those involving the player
 */
const getPlayerBattles = (battles, playerFaction) => {
    return battles.filter(b => b.attackerFaction === playerFaction ||
        b.defenderFaction === playerFaction);
};
exports.getPlayerBattles = getPlayerBattles;
