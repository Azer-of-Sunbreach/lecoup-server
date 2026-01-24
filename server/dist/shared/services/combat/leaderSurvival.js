"use strict";
// Leader Survival Module - Process leader survival after combat
Object.defineProperty(exports, "__esModule", { value: true });
exports.processLeaderSurvival = void 0;
const types_1 = require("../../types");
/**
 * Process leader survival for armies that lost combat.
 *
 * @param armyIds - IDs of armies to process leaders for
 * @param isAttacker - Whether these armies were attackers
 * @param characters - Current list of all characters
 * @param context - Combat context (combat state, whether attacker won, locations)
 * @returns Updated characters array and log messages
 */
const processLeaderSurvival = (armyIds, isAttacker, characters, context) => {
    const { combat, attackerWon, locations } = context;
    let updatedCharacters = [...characters];
    const logMessages = [];
    armyIds.forEach(armyId => {
        const leaders = updatedCharacters.filter(c => c.armyId === armyId);
        leaders.forEach(leader => {
            let survivalChance = calculateSurvivalChance(leader, isAttacker, attackerWon, combat, locations);
            if (Math.random() < survivalChance) {
                // Leader survives - escape to friendly territory
                const escapeLocs = locations.filter(l => l.faction === leader.faction);
                if (escapeLocs.length > 0) {
                    const target = escapeLocs[Math.floor(Math.random() * escapeLocs.length)];
                    updatedCharacters = updatedCharacters.map(c => c.id === leader.id
                        ? { ...c, status: types_1.CharacterStatus.AVAILABLE, armyId: null, locationId: target.id }
                        : c);
                    logMessages.push(`${leader.name} escaped to ${target.name}.`);
                }
                else {
                    // No escape locations - leader dies
                    updatedCharacters = updatedCharacters.map(c => c.id === leader.id
                        ? { ...c, status: types_1.CharacterStatus.DEAD }
                        : c);
                    logMessages.push(`${leader.name} fell (no escape).`);
                }
            }
            else {
                // Leader dies
                updatedCharacters = updatedCharacters.map(c => c.id === leader.id
                    ? { ...c, status: types_1.CharacterStatus.DEAD }
                    : c);
                logMessages.push(`${leader.name} fell in battle.`);
            }
        });
    });
    return { updatedCharacters, logMessages };
};
exports.processLeaderSurvival = processLeaderSurvival;
/**
 * Calculate survival chance based on combat context.
 */
function calculateSurvivalChance(leader, isAttacker, attackerWon, combat, locations) {
    // Failed insurrection = 0% survival (unless Daredevil)
    if (combat.isInsurgentBattle && !attackerWon) {
        if (leader.stats.ability.includes('DAREDEVIL')) {
            return 0.75; // 75% chance to escape
        }
        return 0;
    }
    // Attackers have 90% survival
    if (isAttacker) {
        return 0.90;
    }
    // Defenders - survival depends on location type
    if (combat.locationId) {
        const loc = locations.find(l => l.id === combat.locationId);
        if (loc?.type === types_1.LocationType.CITY)
            return 0.25;
        if (loc?.type === types_1.LocationType.RURAL)
            return 0.75;
    }
    // Road battle - 50% survival
    return 0.50;
}
