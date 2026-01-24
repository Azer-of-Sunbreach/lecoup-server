/**
 * Assassinate Leader - Clandestine Action
 *
 * Logic for the assassination mission:
 * - Availability checks (Trust calculation, Traits)
 * - Success probability calculation
 * - Result processing
 */
import { Character, Location } from '../../../types';
/**
 * Check if the assassination action is available.
 *
 * Conditions:
 * 1. Trust towards enemy <= 24. (Trust = Stability - Resentment against controller)
 * 2. Leader is not Faint-hearted.
 *
 * @returns { available: boolean, reason?: string }
 */
export declare function isAssassinationAvailable(location: Location, leader: Character): {
    available: boolean;
    reason?: string;
};
/**
 * Calculate the success chance (0-100) for the assassination.
 *
 * Formula:
 * (Resentment/4 * (Gold/50)) - Stability - (EnemySoldiers/200)
 */
export declare function calculateAssassinationChance(location: Location, goldSpent: number, enemySoldiersCount: number): number;
/**
 * Check if target is valid and present in the region or attached territory.
 * @param targetId Target leader ID
 * @param assassinLocation Location of the assassin
 * @param allCharacters List of all characters to find target
 * @param allLocations List of all locations to check attachments
 *
 * @returns True if valid, False if target left area (should cancel)
 */
export declare function isTargetAccessible(targetId: string, assassinLocation: Location, allCharacters: Character[], allLocations: Location[]): boolean;
