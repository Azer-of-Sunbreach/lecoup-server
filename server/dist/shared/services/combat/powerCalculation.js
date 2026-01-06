"use strict";
// Power Calculation Module - Combat strength calculations and loss application
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCombatStrength = exports.applySequentialLosses = void 0;
/**
 * Apply losses sequentially to a list of armies.
 * Armies are reduced in order until all losses are applied.
 *
 * @param armies - List of armies to apply losses to
 * @param totalLosses - Total number of soldiers lost
 * @returns Object containing surviving armies and IDs of destroyed armies
 */
const applySequentialLosses = (armies, totalLosses) => {
    let remainingLosses = totalLosses;
    const updatedArmies = [];
    const deadArmyIds = [];
    const workingArmies = armies.map(a => ({ ...a }));
    for (const army of workingArmies) {
        if (remainingLosses <= 0) {
            updatedArmies.push(army);
            continue;
        }
        if (remainingLosses >= army.strength) {
            remainingLosses -= army.strength;
            deadArmyIds.push(army.id);
        }
        else {
            army.strength -= remainingLosses;
            remainingLosses = 0;
            // Prevent 0 strength armies surviving
            if (army.strength > 0) {
                updatedArmies.push(army);
            }
            else {
                deadArmyIds.push(army.id);
            }
        }
    }
    return { updatedArmies, deadArmyIds };
};
exports.applySequentialLosses = applySequentialLosses;
/**
 * Calculate the combat strength of a group of armies.
 * Applies leader command bonuses and defense bonuses.
 *
 * @param armies - List of armies to calculate strength for
 * @param characters - List of all characters (to find attached leaders)
 * @param defenseBonus - Bonus from fortifications/terrain (default: 0)
 * @returns Total combat strength as a rounded integer
 */
const calculateCombatStrength = (armies, characters, defenseBonus = 0) => {
    const rawStrength = armies.reduce((total, army) => {
        const leaders = characters.filter(c => c.armyId === army.id);
        let multiplier = 1;
        leaders.forEach(l => multiplier += l.stats.commandBonus);
        return total + (army.strength * multiplier);
    }, 0);
    return Math.round(rawStrength + defenseBonus);
};
exports.calculateCombatStrength = calculateCombatStrength;
