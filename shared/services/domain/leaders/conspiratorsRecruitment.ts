/**
 * Conspirators Recruitment Domain Service
 * 
 * Pure functions for handling Conspirators faction leader recruitment.
 * Part of the Clean Hexagonal architecture - domain logic only, no UI dependencies.
 */

import { Character, CharacterStatus, Location, FactionId } from '../../../types';

// ============================================================
// Constants
// ============================================================

/** Maximum number of living leaders for Conspirators faction */
export const CONSPIRATORS_MAX_LEADERS = 5;

/** Gold cost to recruit a new leader */
export const CONSPIRATORS_RECRUITMENT_COST = 150;

/** 
 * Ordered list of recruitable Conspirator leader IDs.
 * Leaders appear in this order in the Prospective Leaders panel.
 */
export const CONSPIRATORS_RECRUITABLE_ORDER: string[] = [
    'enoch',
    'alb_turvrard',
    'father_tallysse',
    'maxime_jacob',
    'holvein',
    'lazare_montagne',
    'vendemer',
    'armand'
];

/**
 * Default recruitment locations per leader.
 * If not listed, defaults to 'windward'.
 */
const DEFAULT_RECRUITMENT_LOCATIONS: Record<string, string> = {
    enoch: 'stormbay',
    holvein: 'stormbay',
    vendemer: 'stormbay',
    armand: 'stormbay',
    alb_turvrard: 'windward',
    father_tallysse: 'windward',
    maxime_jacob: 'windward',
    lazare_montagne: 'windward'
};

// ============================================================
// Query Functions
// ============================================================

/**
 * Get the default recruitment location for a leader.
 */
export function getDefaultRecruitmentLocation(leaderId: string): string {
    return DEFAULT_RECRUITMENT_LOCATIONS[leaderId] || 'windward';
}

/**
 * Get all living (not DEAD) Conspirator leaders.
 */
export function getLivingConspiratorLeaders(characters: Character[]): Character[] {
    return characters.filter(
        c => c.faction === FactionId.CONSPIRATORS && c.status !== CharacterStatus.DEAD
    );
}

/**
 * Get recruitable leaders for Conspirators (isRecruitableLeader=true AND in CONSPIRATORS_RECRUITABLE_ORDER).
 * Returns them in the specified display order.
 */
export function getRecruitableConspiratorLeaders(characters: Character[]): Character[] {
    const recruitableMap = new Map<string, Character>();

    characters.forEach(c => {
        if (c.isRecruitableLeader && CONSPIRATORS_RECRUITABLE_ORDER.includes(c.id)) {
            recruitableMap.set(c.id, c);
        }
    });

    // Return in the specified order
    return CONSPIRATORS_RECRUITABLE_ORDER
        .filter(id => recruitableMap.has(id))
        .map(id => recruitableMap.get(id)!);
}

/**
 * Check if Conspirators can recruit a new leader.
 * Returns { canRecruit, reason } where reason explains why not if canRecruit is false.
 */
export function canRecruitLeader(
    characters: Character[],
    playerGold: number,
    playerLocations: Location[]
): { canRecruit: boolean; reason?: 'MAX_LEADERS' | 'NO_TERRITORY' | 'NOT_ENOUGH_GOLD' | 'NO_RECRUITABLE' } {
    // Check if already at max leaders
    const livingLeaders = getLivingConspiratorLeaders(characters);
    if (livingLeaders.length >= CONSPIRATORS_MAX_LEADERS) {
        return { canRecruit: false, reason: 'MAX_LEADERS' };
    }

    // Check if there are recruitable leaders available
    const recruitableLeaders = getRecruitableConspiratorLeaders(characters);
    if (recruitableLeaders.length === 0) {
        return { canRecruit: false, reason: 'NO_RECRUITABLE' };
    }

    // Check if player controls any territory
    if (playerLocations.length === 0) {
        return { canRecruit: false, reason: 'NO_TERRITORY' };
    }

    // Check gold requirement
    if (playerGold < CONSPIRATORS_RECRUITMENT_COST) {
        return { canRecruit: false, reason: 'NOT_ENOUGH_GOLD' };
    }

    return { canRecruit: true };
}

/**
 * Determine the actual recruitment destination for a leader.
 * 
 * Priority:
 * 1. Default location (stormbay/windward) if controlled by Conspirators
 * 2. Most populous CITY controlled by Conspirators
 * 3. Most populous RURAL area controlled by Conspirators
 */
export function getRecruitmentDestination(
    leaderId: string,
    allLocations: Location[],
    conspiratorLocations: Location[]
): string | null {
    if (conspiratorLocations.length === 0) {
        return null;
    }

    const defaultLocation = getDefaultRecruitmentLocation(leaderId);

    // Check if default location is controlled
    const hasDefaultLocation = conspiratorLocations.some(l => l.id === defaultLocation);
    if (hasDefaultLocation) {
        return defaultLocation;
    }

    // Find most populous city
    const cities = conspiratorLocations.filter(l => l.type === 'CITY');
    if (cities.length > 0) {
        const mostPopulousCity = cities.reduce((a, b) =>
            (a.population || 0) > (b.population || 0) ? a : b
        );
        return mostPopulousCity.id;
    }

    // Find most populous rural area
    const ruralAreas = conspiratorLocations.filter(l => l.type === 'RURAL');
    if (ruralAreas.length > 0) {
        const mostPopulousRural = ruralAreas.reduce((a, b) =>
            (a.population || 0) > (b.population || 0) ? a : b
        );
        return mostPopulousRural.id;
    }

    // Fallback: first controlled location
    return conspiratorLocations[0].id;
}

// ============================================================
// Command Functions
// ============================================================

export interface RecruitLeaderResult {
    success: boolean;
    error?: string;
    updatedCharacters?: Character[];
    goldCost?: number;
    destinationId?: string;
}

/**
 * Execute leader recruitment for Conspirators.
 * 
 * Effects:
 * - Leader status changes from DEAD to AVAILABLE
 * - Leader faction changes from NEUTRAL to CONSPIRATORS
 * - Leader moves to recruitment destination
 * - isRecruitableLeader flag set to false
 * - Gold cost deducted (handled by caller)
 */
export function executeRecruitLeader(
    characters: Character[],
    leaderId: string,
    allLocations: Location[],
    conspiratorLocations: Location[],
    playerGold: number
): RecruitLeaderResult {
    // Validate leader exists and is recruitable
    const leader = characters.find(c => c.id === leaderId);
    if (!leader) {
        return { success: false, error: 'Leader not found' };
    }
    if (!leader.isRecruitableLeader) {
        return { success: false, error: 'Leader is not recruitable' };
    }
    if (!CONSPIRATORS_RECRUITABLE_ORDER.includes(leaderId)) {
        return { success: false, error: 'Leader not available for Conspirators' };
    }

    // Validate recruitment conditions
    const canRecruit = canRecruitLeader(characters, playerGold, conspiratorLocations);
    if (!canRecruit.canRecruit) {
        return { success: false, error: canRecruit.reason };
    }

    // Determine destination
    const destinationId = getRecruitmentDestination(leaderId, allLocations, conspiratorLocations);
    if (!destinationId) {
        return { success: false, error: 'No valid recruitment destination' };
    }

    // Update characters
    const updatedCharacters = characters.map(c => {
        if (c.id === leaderId) {
            return {
                ...c,
                status: CharacterStatus.AVAILABLE,
                faction: FactionId.CONSPIRATORS,
                locationId: destinationId,
                isRecruitableLeader: false
            };
        }
        return c;
    });

    return {
        success: true,
        updatedCharacters,
        goldCost: CONSPIRATORS_RECRUITMENT_COST,
        destinationId
    };
}
