/**
 * Tutorial Recruitment Domain Service
 * 
 * Pure functions for handling tutorial leader recruitment (LARION_KNIGHTS).
 * Simplified compared to Conspirators: no max leaders cap, single recruitable leader.
 * Part of the Clean Hexagonal architecture - domain logic only, no UI dependencies.
 */

import { Character, CharacterStatus, Location, FactionId } from '../../../types';

// ============================================================
// Constants
// ============================================================

/** Gold cost to recruit a tutorial leader */
export const TUTORIAL_RECRUITMENT_COST = 150;

// ============================================================
// Query Functions
// ============================================================

/**
 * Get recruitable leaders for the tutorial map.
 * Returns characters with isRecruitableLeader=true that are still DEAD (not yet recruited).
 */
export function getRecruitableTutorialLeaders(characters: Character[]): Character[] {
    return characters.filter(
        c => c.isRecruitableLeader && c.status === CharacterStatus.DEAD
    );
}

/**
 * Check if the player can recruit a tutorial leader.
 */
export function canRecruitTutorialLeader(
    characters: Character[],
    playerGold: number,
    playerLocations: Location[]
): { canRecruit: boolean; reason?: 'NO_TERRITORY' | 'NOT_ENOUGH_GOLD' | 'NO_RECRUITABLE' } {
    const recruitableLeaders = getRecruitableTutorialLeaders(characters);
    if (recruitableLeaders.length === 0) {
        return { canRecruit: false, reason: 'NO_RECRUITABLE' };
    }

    if (playerLocations.length === 0) {
        return { canRecruit: false, reason: 'NO_TERRITORY' };
    }

    if (playerGold < TUTORIAL_RECRUITMENT_COST) {
        return { canRecruit: false, reason: 'NOT_ENOUGH_GOLD' };
    }

    return { canRecruit: true };
}

/**
 * Determine recruitment destination for the tutorial.
 * Returns the most populous city controlled by the player, or first controlled location.
 */
export function getTutorialRecruitmentDestination(
    playerLocations: Location[]
): string | null {
    if (playerLocations.length === 0) return null;

    const cities = playerLocations.filter(l => l.type === 'CITY');
    if (cities.length > 0) {
        return cities.reduce((a, b) =>
            (a.population || 0) > (b.population || 0) ? a : b
        ).id;
    }

    return playerLocations[0].id;
}

// ============================================================
// Command Functions
// ============================================================

export interface TutorialRecruitResult {
    success: boolean;
    error?: string;
    updatedCharacters?: Character[];
    goldCost?: number;
    destinationId?: string;
}

/**
 * Execute leader recruitment for the tutorial.
 * 
 * Effects:
 * - Leader status changes from DEAD to AVAILABLE
 * - Leader faction changes from NEUTRAL to the player's faction
 * - Leader moves to recruitment destination
 * - isRecruitableLeader flag set to false
 * - Gold cost deducted (handled by caller)
 */
export function executeTutorialRecruitLeader(
    characters: Character[],
    leaderId: string,
    playerLocations: Location[],
    playerGold: number,
    playerFaction: FactionId
): TutorialRecruitResult {
    const leader = characters.find(c => c.id === leaderId);
    if (!leader) {
        return { success: false, error: 'Leader not found' };
    }
    if (!leader.isRecruitableLeader) {
        return { success: false, error: 'Leader is not recruitable' };
    }
    if (leader.status !== CharacterStatus.DEAD) {
        return { success: false, error: 'Leader already recruited' };
    }

    const canRecruit = canRecruitTutorialLeader(characters, playerGold, playerLocations);
    if (!canRecruit.canRecruit) {
        return { success: false, error: canRecruit.reason };
    }

    const destinationId = getTutorialRecruitmentDestination(playerLocations);
    if (!destinationId) {
        return { success: false, error: 'No valid recruitment destination' };
    }

    const updatedCharacters = characters.map(c => {
        if (c.id === leaderId) {
            return {
                ...c,
                status: CharacterStatus.AVAILABLE,
                faction: playerFaction,
                locationId: destinationId,
                isRecruitableLeader: false
            };
        }
        return c;
    });

    return {
        success: true,
        updatedCharacters,
        goldCost: TUTORIAL_RECRUITMENT_COST,
        destinationId
    };
}
