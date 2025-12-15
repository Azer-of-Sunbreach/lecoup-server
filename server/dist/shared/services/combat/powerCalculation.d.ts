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
export declare const applySequentialLosses: (armies: Army[], totalLosses: number) => LossResult;
/**
 * Calculate the combat strength of a group of armies.
 * Applies leader command bonuses and defense bonuses.
 *
 * @param armies - List of armies to calculate strength for
 * @param characters - List of all characters (to find attached leaders)
 * @param defenseBonus - Bonus from fortifications/terrain (default: 0)
 * @returns Total combat strength as a rounded integer
 */
export declare const calculateCombatStrength: (armies: Army[], characters: Character[], defenseBonus?: number) => number;
