// AI Battle Cascade - Auto-resolution of AI vs AI battles

import { Army, Character, Location, Road, CombatState, FactionId, GameStats, CharacterStatus, FACTION_NAMES } from '../../types';
import { FORTIFICATION_LEVELS } from '../../constants';
import { detectBattles } from '../combatDetection';
import { applySequentialLosses, calculateCombatStrength } from './powerCalculation';

export interface CascadeResult {
    armies: Army[];
    locations: Location[];
    roads: Road[];
    characters: Character[];
    stats: GameStats;
    logMessages: string[];
}

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
export const resolveAIBattleCascade = (
    playerFaction: FactionId,
    armies: Army[],
    characters: Character[],
    locations: Location[],
    roads: Road[],
    stats: GameStats,
    humanFactions?: FactionId[]
): CascadeResult => {
    let newArmies = [...armies];
    let newCharacters = [...characters];
    let newLocations = [...locations];
    let newRoads = [...roads];
    let newStats = { ...stats };
    const logMessages: string[] = [];

    let currentBattles = detectBattles(newLocations, newArmies, newRoads);
    let loops = 0;

    while (loops < 10) {
        loops++;

        // FIX: In multiplayer, check against ALL human factions, not just playerFaction
        // In single-player, humanFactions is undefined so we fall back to playerFaction check
        const isHumanFaction = (faction: FactionId) => {
            if (humanFactions && humanFactions.length > 0) {
                return humanFactions.includes(faction);
            }
            return faction === playerFaction;
        };

        const aiBattles = currentBattles.filter(b =>
            !isHumanFaction(b.attackerFaction) &&
            !isHumanFaction(b.defenderFaction) &&
            !b.attackers.some(a => a.isSieging)
        );

        if (aiBattles.length === 0) break;

        const battle = aiBattles[0];
        const attStr = calculateCombatStrength(battle.attackers, newCharacters, 0);
        const defStr = calculateCombatStrength(battle.defenders, newCharacters, battle.defenseBonus);
        const attWin = attStr > defStr;

        const loserArmies = attWin ? battle.defenders : battle.attackers;
        const winnerArmies = attWin ? battle.attackers : battle.defenders;
        const losses = attWin ? defStr : Math.max(0, attStr - battle.defenseBonus);

        const deadDef = battle.defenders.reduce((s, a) => s + a.strength, 0);
        const deadAtt = battle.attackers.reduce((s, a) => s + a.strength, 0);
        newStats.deathToll += attWin ? (deadDef + Math.min(deadAtt, losses)) : (Math.min(deadDef, losses) + deadAtt);

        if (attWin) {
            const locName = battle.locationId ? newLocations.find(l => l.id === battle.locationId)?.name : 'road';
            logMessages.push(`AI Battle: ${FACTION_NAMES[battle.attackerFaction]} took ${locName}.`);

            if (battle.locationId) {
                newLocations = newLocations.map(l => {
                    if (l.id === battle.locationId) {
                        const newFort = Math.max(0, l.fortificationLevel - 1);
                        return {
                            ...l,
                            faction: battle.attackerFaction,
                            defense: FORTIFICATION_LEVELS[newFort].bonus,
                            fortificationLevel: newFort,
                            stability: battle.isInsurgentBattle ? Math.max(49, l.stability) : l.stability
                        };
                    }
                    return l;
                });
            } else if (battle.roadId) {
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
        } else {
            logMessages.push(`AI Battle: ${FACTION_NAMES[battle.attackerFaction]} repelled.`);
        }

        const loserIds = loserArmies.map(a => a.id);
        const { updatedArmies } = applySequentialLosses(winnerArmies, losses);

        newArmies = newArmies.filter(a => !loserIds.includes(a.id) && !winnerArmies.some(wa => wa.id === a.id));
        updatedArmies.forEach(ua => { if (ua.strength > 0) newArmies.push({ ...ua, isSpent: true }); });

        // Leader casualty check
        const engagedArmies = [...battle.attackers, ...battle.defenders];
        const engagedArmyIds = engagedArmies.map(a => a.id);
        const leaders = newCharacters.filter(c => c.armyId && engagedArmyIds.includes(c.armyId));

        leaders.forEach(l => {
            if (!newArmies.find(a => a.id === l.armyId)) {
                let died = Math.random() > 0.5;
                if (battle.isInsurgentBattle) died = true;
                if (died) {
                    newCharacters = newCharacters.map(c => c.id === l.id ? { ...c, status: CharacterStatus.DEAD } : c);
                    logMessages.push(`${l.name} died.`);
                } else {
                    newCharacters = newCharacters.map(c => c.id === l.id ? { ...c, status: CharacterStatus.AVAILABLE, armyId: null } : c);
                }
            }
        });

        currentBattles = detectBattles(newLocations, newArmies, newRoads);
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

/**
 * Filter battles to only include those involving the player
 */
export const getPlayerBattles = (
    battles: CombatState[],
    playerFaction: FactionId
): CombatState[] => {
    return battles.filter(b =>
        b.attackerFaction === playerFaction ||
        b.defenderFaction === playerFaction
    );
};
