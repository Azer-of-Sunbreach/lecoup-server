// Power Calculation Module - Combat strength calculations and loss application

import { Army, Character } from '../../types';
import { LossResult } from './types';

/**
 * Apply losses sequentially to a list of armies.
 * Armies are reduced in order until all losses are applied.
 * 
 * @param armies - List of armies to apply losses to
 * @param totalLosses - Total number of soldiers lost
 * @returns Object containing surviving armies and IDs of destroyed armies
 */
export const applySequentialLosses = (armies: Army[], totalLosses: number): LossResult => {
    let remainingLosses = totalLosses;
    const updatedArmies: Army[] = [];
    const deadArmyIds: string[] = [];

    const workingArmies = armies.map(a => ({ ...a }));

    for (const army of workingArmies) {
        if (remainingLosses <= 0) {
            updatedArmies.push(army);
            continue;
        }

        if (remainingLosses >= army.strength) {
            remainingLosses -= army.strength;
            deadArmyIds.push(army.id);
        } else {
            army.strength -= remainingLosses;
            remainingLosses = 0;
            // Prevent 0 strength armies surviving
            if (army.strength > 0) {
                updatedArmies.push(army);
            } else {
                deadArmyIds.push(army.id);
            }
        }
    }

    return { updatedArmies, deadArmyIds };
};

/**
 * Calculate the combat strength of a group of armies.
 * Applies leader command bonuses and defense bonuses.
 * 
 * @param armies - List of armies to calculate strength for
 * @param characters - List of all characters (to find attached leaders)
 * @param defenseBonus - Bonus from fortifications/terrain (default: 0)
 * @returns Total combat strength as a rounded integer
 */
export const calculateCombatStrength = (
    armies: Army[],
    characters: Character[],
    defenseBonus: number = 0
): number => {
    const rawStrength = armies.reduce((total, army) => {
        const leaders = characters.filter(c => c.armyId === army.id);
        let multiplier = 1;
        leaders.forEach(l => multiplier += l.stats.commandBonus);
        return total + (army.strength * multiplier);
    }, 0);
    return Math.round(rawStrength + defenseBonus);
};
