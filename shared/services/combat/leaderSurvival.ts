// Leader Survival Module - Process leader survival after combat

import { Character, CharacterStatus, CombatState, LocationType, Location } from '../../types';
import { LeaderSurvivalResult } from './types';

/**
 * Survival chances based on combat context:
 * - Failed insurrection: 0% (automatic death)
 * - Attacker: 90%
 * - Defender in City: 25%
 * - Defender in Rural: 75%
 * - Defender on Road: 50%
 */

interface SurvivalContext {
    combat: CombatState;
    attackerWon: boolean;
    locations: Location[];
}

/**
 * Process leader survival for armies that lost combat.
 * 
 * @param armyIds - IDs of armies to process leaders for
 * @param isAttacker - Whether these armies were attackers
 * @param characters - Current list of all characters
 * @param context - Combat context (combat state, whether attacker won, locations)
 * @returns Updated characters array and log messages
 */
export const processLeaderSurvival = (
    armyIds: string[],
    isAttacker: boolean,
    characters: Character[],
    context: SurvivalContext
): LeaderSurvivalResult => {
    const { combat, attackerWon, locations } = context;
    let updatedCharacters = [...characters];
    const logMessages: string[] = [];

    armyIds.forEach(armyId => {
        const leaders = updatedCharacters.filter(c => c.armyId === armyId);

        leaders.forEach(leader => {
            let survivalChance = calculateSurvivalChance(
                isAttacker,
                attackerWon,
                combat,
                locations
            );

            if (Math.random() < survivalChance) {
                // Leader survives - escape to friendly territory
                const escapeLocs = locations.filter(l => l.faction === leader.faction);

                if (escapeLocs.length > 0) {
                    const target = escapeLocs[Math.floor(Math.random() * escapeLocs.length)];
                    updatedCharacters = updatedCharacters.map(c =>
                        c.id === leader.id
                            ? { ...c, status: CharacterStatus.AVAILABLE, armyId: null, locationId: target.id }
                            : c
                    );
                    logMessages.push(`${leader.name} escaped to ${target.name}.`);
                } else {
                    // No escape locations - leader dies
                    updatedCharacters = updatedCharacters.map(c =>
                        c.id === leader.id
                            ? { ...c, status: CharacterStatus.DEAD }
                            : c
                    );
                    logMessages.push(`${leader.name} fell (no escape).`);
                }
            } else {
                // Leader dies
                updatedCharacters = updatedCharacters.map(c =>
                    c.id === leader.id
                        ? { ...c, status: CharacterStatus.DEAD }
                        : c
                );
                logMessages.push(`${leader.name} fell in battle.`);
            }
        });
    });

    return { updatedCharacters, logMessages };
};

/**
 * Calculate survival chance based on combat context.
 */
function calculateSurvivalChance(
    isAttacker: boolean,
    attackerWon: boolean,
    combat: CombatState,
    locations: Location[]
): number {
    // Failed insurrection = 0% survival
    if (combat.isInsurgentBattle && !attackerWon) {
        return 0;
    }

    // Attackers have 90% survival
    if (isAttacker) {
        return 0.90;
    }

    // Defenders - survival depends on location type
    if (combat.locationId) {
        const loc = locations.find(l => l.id === combat.locationId);
        if (loc?.type === LocationType.CITY) return 0.25;
        if (loc?.type === LocationType.RURAL) return 0.75;
    }

    // Road battle - 50% survival
    return 0.50;
}
