import { Character, CombatState, Location } from '../../types';
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
export declare const processLeaderSurvival: (armyIds: string[], isAttacker: boolean, characters: Character[], context: SurvivalContext) => LeaderSurvivalResult;
export {};
