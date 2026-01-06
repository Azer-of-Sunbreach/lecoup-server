/**
 * Assassinate Leader - Clandestine Action
 * 
 * Logic for the assassination mission:
 * - Availability checks (Trust calculation, Traits)
 * - Success probability calculation
 * - Result processing
 */

import { Character, Location, LogEntry, FactionId } from '../../../types';
import { CharacterTrait } from '../../../types/leaderTypes';

/**
 * Check if the assassination action is available.
 * 
 * Conditions:
 * 1. Trust towards enemy <= 24. (Trust = Stability - Resentment against controller)
 * 2. Leader is not Faint-hearted.
 * 
 * @returns { available: boolean, reason?: string }
 */
export function isAssassinationAvailable(
    location: Location,
    leader: Character
): { available: boolean; reason?: string } {
    // 1. Check Trait
    if (leader.stats.traits && leader.stats.traits.includes(CharacterTrait.FAINT_HEARTED)) {
        return {
            available: false,
            reason: `${leader.name} would refuse to obey such an order.`
        };
    }

    // 2. Check Trust
    const controllerFaction = location.faction;

    // Safety check for Neutral faction (no resentment tracked)
    if (controllerFaction === FactionId.NEUTRAL) {
        // If neutral, assume 0 resentment? 
        // Or specific behavior? For now, 0 resentment -> Trust = Stability.
        // If stability > 24, unavailable.
        // Usually Neutral is not 'Enemy', but specifications refer to "Trust towards the enemy".
        // Let's assume standard calculation with 0 resentment.
    }

    const factionKey = controllerFaction !== FactionId.NEUTRAL ? controllerFaction : null;
    const resentment = (factionKey && location.resentment?.[factionKey]) ?? 0;
    const stability = location.stability;

    // Trust = Stability - Resentment
    const trust = stability - resentment;

    if (trust > 24) {
        return {
            available: false,
            reason: 'Trust towards the enemy is too high here.'
        };
    }

    return { available: true };
}

/**
 * Calculate the success chance (0-100) for the assassination.
 * 
 * Formula:
 * (Resentment/4 * (Gold/50)) - Stability - (EnemySoldiers/200)
 */
export function calculateAssassinationChance(
    location: Location,
    goldSpent: number,
    enemySoldiersCount: number
): number {
    const controllerFaction = location.faction;
    const factionKey = controllerFaction !== FactionId.NEUTRAL ? controllerFaction : null;
    const resentment = (factionKey && location.resentment?.[factionKey]) ?? 0;
    const stability = location.stability;

    // Term 1: Resentment influence scaled by gold
    // (Resentment / 4) * (Gold / 50)
    // Note: Gold is 50-200. Gold/50 is 1-4.
    const term1 = (resentment / 4) * (goldSpent / 50);

    // Term 2: Stability penalty
    const term2 = stability;

    // Term 3: Garrison penalty
    const term3 = enemySoldiersCount / 200;

    const chance = term1 - term2 - term3;

    // Clamp between 0 and 100
    return Math.max(0, Math.min(100, Math.round(chance)));
}

/**
 * Check if target is valid and present in the region or attached territory.
 * @param targetId Target leader ID
 * @param assassinLocation Location of the assassin
 * @param allCharacters List of all characters to find target
 * @param allLocations List of all locations to check attachments
 * 
 * @returns True if valid, False if target left area (should cancel)
 */
export function isTargetAccessible(
    targetId: string,
    assassinLocation: Location,
    allCharacters: Character[],
    allLocations: Location[]
): boolean {
    const target = allCharacters.find(c => c.id === targetId);
    if (!target || target.status === 'DEAD') return false;

    // Target must be in:
    // 1. Same region
    // 2. Attached territory (City <-> Rural)

    if (target.locationId === assassinLocation.id) return true;

    // Check availability in attached territory
    if (assassinLocation.linkedLocationId && target.locationId === assassinLocation.linkedLocationId) {
        return true;
    }

    // Also check if target's location links back to assassin's location (bidirectional safety)
    const targetLocation = allLocations.find(l => l.id === target.locationId);
    if (targetLocation && targetLocation.linkedLocationId === assassinLocation.id) {
        return true;
    }

    return false;
}
