/**
 * Nobles Recruitment Domain Service
 * 
 * Pure functions for handling Nobles faction leader recruitment.
 * Part of the Clean Hexagonal architecture - domain logic only, no UI dependencies.
 * 
 * Unlike Conspirators who pay gold, Nobles must grant fiefdoms (territories)
 * which reduce production by 30 food or 30 gold while controlled.
 */

import { Character, CharacterStatus, Location, FactionId } from '../../../types';

// ============================================================
// Constants
// ============================================================

/** Production penalty per fiefdom granted */
export const NOBLES_FIEFDOM_PENALTY = 30;

/** 
 * Ordered list of recruitable Nobles leader IDs.
 * Leaders appear in this order in the Prospective Leaders panel.
 */
export const NOBLES_RECRUITABLE_ORDER: string[] = [
    'vergier',
    'georges_cadal',
    'klemath',
    'baron_ystrir',
    'duke_great_plains',
    'spelttiller',
    'duke_esmarch',
    'duke_hornvale',
    'demain'
];

/**
 * Leaders who appear at a specific location (show "Location:" line).
 * Others have special recruitment effects (show effect description).
 */
export const NOBLES_LOCATION_LEADERS: string[] = [
    'vergier',
    'klemath',
    'baron_ystrir',
    'spelttiller',
    'demain'
];

/**
 * Default recruitment locations per leader.
 * Only for leaders in NOBLES_LOCATION_LEADERS.
 */
const DEFAULT_RECRUITMENT_LOCATIONS: Record<string, string> = {
    vergier: 'northern_barony',
    baron_ystrir: 'brinewaith',
    spelttiller: 'great_plains',
    demain: 'port-de-sable'
    // klemath: depends on Baron Lekal's location
};

// ============================================================
// Query Functions
// ============================================================

/**
 * Get all living (not DEAD) Nobles leaders.
 */
export function getLivingNoblesLeaders(characters: Character[]): Character[] {
    return characters.filter(
        c => c.faction === FactionId.NOBLES && c.status !== CharacterStatus.DEAD
    );
}

/**
 * Get recruitable leaders for Nobles (isRecruitableLeader=true AND in NOBLES_RECRUITABLE_ORDER).
 * Returns them in the specified display order.
 */
export function getRecruitableNoblesLeaders(characters: Character[]): Character[] {
    const recruitableMap = new Map<string, Character>();

    characters.forEach(c => {
        if (c.isRecruitableLeader && NOBLES_RECRUITABLE_ORDER.includes(c.id)) {
            recruitableMap.set(c.id, c);
        }
    });

    // Return in the specified order
    return NOBLES_RECRUITABLE_ORDER
        .filter(id => recruitableMap.has(id))
        .map(id => recruitableMap.get(id)!);
}

/**
 * Check if a leader has a location-based recruitment (shows "Location:" line).
 * Special effect leaders show their effect text instead, even if they have a fixed location.
 */
export function isLocationBasedRecruitment(leaderId: string): boolean {
    // Special effect leaders show effect text, not location
    if (SPECIAL_EFFECT_LEADERS.includes(leaderId)) {
        return false;
    }
    return NOBLES_LOCATION_LEADERS.includes(leaderId);
}

/**
 * Find Baron Lekal's current location.
 * Returns null if Baron Lekal is dead or not found.
 */
export function getBaronLekalLocation(characters: Character[]): string | null {
    const baronLekal = characters.find(c => c.id === 'lekal');
    if (!baronLekal || baronLekal.status === CharacterStatus.DEAD) {
        return null;
    }
    return baronLekal.locationId;
}

/**
 * Get the default recruitment location for a leader.
 * For klemath, this depends on Baron Lekal's position.
 */
export function getDefaultRecruitmentLocation(
    leaderId: string,
    characters: Character[]
): string | null {
    if (leaderId === 'klemath') {
        return getBaronLekalLocation(characters);
    }
    return DEFAULT_RECRUITMENT_LOCATIONS[leaderId] || null;
}

/**
 * Get the most populous location controlled by Nobles.
 * Priority: cities first, then rural areas.
 */
function getMostPopulousNoblesLocation(
    noblesLocations: Location[],
    type?: 'CITY' | 'RURAL'
): Location | null {
    const filtered = type 
        ? noblesLocations.filter(l => l.type === type)
        : noblesLocations;
    
    if (filtered.length === 0) return null;
    
    return filtered.reduce((a, b) =>
        (a.population || 0) > (b.population || 0) ? a : b
    );
}

/**
 * Check if Nobles can recruit leaders (have at least one territory).
 */
export function canRecruitLeader(
    noblesLocations: Location[]
): { canRecruit: boolean; reason?: 'NO_TERRITORY' | 'NO_RECRUITABLE' } {
    if (noblesLocations.length === 0) {
        return { canRecruit: false, reason: 'NO_TERRITORY' };
    }
    return { canRecruit: true };
}

/**
 * Determine the actual recruitment destination for a leader.
 * 
 * Priority:
 * 1. Default location if controlled by Nobles
 * 2. Most populous CITY controlled by Nobles
 * 3. Most populous RURAL area controlled by Nobles
 */
export function getRecruitmentDestination(
    leaderId: string,
    characters: Character[],
    allLocations: Location[],
    noblesLocations: Location[]
): string | null {
    if (noblesLocations.length === 0) {
        return null;
    }

    // Special handling for duke_great_plains: always goes to Windward
    if (leaderId === 'duke_great_plains') {
        return 'windward';
    }

    // Special handling for duke_esmarch: priority esmarch_duchy > mirebridge > fallback
    if (leaderId === 'duke_esmarch') {
        if (noblesLocations.some(l => l.id === 'esmarch_duchy')) {
            return 'esmarch_duchy';
        }
        if (noblesLocations.some(l => l.id === 'mirebridge')) {
            return 'mirebridge';
        }
        // Fall through to fallback logic
    }

    // Only location-based leaders have a default location
    if (isLocationBasedRecruitment(leaderId)) {
        const defaultLocation = getDefaultRecruitmentLocation(leaderId, characters);

        if (defaultLocation) {
            // Check if default location is controlled by Nobles
            const hasDefaultLocation = noblesLocations.some(l => l.id === defaultLocation);
            if (hasDefaultLocation) {
                return defaultLocation;
            }
        }
    }

    // Fallback: most populous city
    const mostPopulousCity = getMostPopulousNoblesLocation(noblesLocations, 'CITY');
    if (mostPopulousCity) {
        return mostPopulousCity.id;
    }

    // Fallback: most populous rural area
    const mostPopulousRural = getMostPopulousNoblesLocation(noblesLocations, 'RURAL');
    if (mostPopulousRural) {
        return mostPopulousRural.id;
    }

    // Ultimate fallback: first controlled location
    return noblesLocations[0].id;
}

// ============================================================
// Special Leader Functions
// ============================================================

/** Special leaders with unique effects (show effect text instead of location) */
export const SPECIAL_EFFECT_LEADERS: string[] = [
    'georges_cadal',
    'baron_ystrir',
    'duke_great_plains',
    'duke_esmarch',
    'duke_hornvale'
];

/** Territories for georges_cadal insurrection */
export const GEORGES_CADAL_TERRITORIES = ['gullwing', 'gullwing_duchy', 'fairemere_viscounty', 'cathair'];

/** Territories for duke_hornvale insurrection */
export const DUKE_HORNVALE_TERRITORIES = ['hornvale', 'hornvale_duchy'];

/** Budget for georges_cadal grand insurrection */
export const GEORGES_CADAL_BUDGET = 400;

/** Budget for duke_hornvale grand insurrection */
export const DUKE_HORNVALE_BUDGET = 300;

/** Budget for duke_great_plains undercover mission */
export const DUKE_GREAT_PLAINS_BUDGET = 400;

/** Gold bonus from baron_ystrir */
export const BARON_YSTRIR_GOLD = 550;

/** Soldiers from duke_esmarch */
export const DUKE_ESMARCH_SOLDIERS = 2000;

/**
 * Check if a leader has a special effect (not location-based).
 */
export function hasSpecialEffect(leaderId: string): boolean {
    return SPECIAL_EFFECT_LEADERS.includes(leaderId);
}

/**
 * Get the effect text key for a special leader.
 * Returns the translation key to use for the effect description.
 */
export function getSpecialLeaderEffectText(
    leaderId: string,
    locations: Location[],
    noblesLocations: Location[]
): { key: string; params?: Record<string, string> } | null {
    switch (leaderId) {
        case 'georges_cadal':
            return { key: 'noblesRecruitment.specialEffects.georges_cadal' };
        case 'baron_ystrir':
            return { key: 'noblesRecruitment.specialEffects.baron_ystrir' };
        case 'duke_great_plains':
            return { key: 'noblesRecruitment.specialEffects.duke_great_plains' };
        case 'duke_esmarch': {
            const destId = getDukeEsmarchDestination(locations, noblesLocations);
            return { 
                key: 'noblesRecruitment.specialEffects.duke_esmarch',
                params: { location: destId || 'unknown' }
            };
        }
        case 'duke_hornvale':
            return { key: 'noblesRecruitment.specialEffects.duke_hornvale' };
        default:
            return null;
    }
}

/**
 * Get the destination for duke_esmarch.
 * Priority: esmarch_duchy > mirebridge > most populous Nobles location
 */
export function getDukeEsmarchDestination(
    allLocations: Location[],
    noblesLocations: Location[]
): string | null {
    // Check if esmarch_duchy is controlled by Nobles
    if (noblesLocations.some(l => l.id === 'esmarch_duchy')) {
        return 'esmarch_duchy';
    }
    
    // Check if mirebridge is controlled by Nobles
    if (noblesLocations.some(l => l.id === 'mirebridge')) {
        return 'mirebridge';
    }
    
    // Fallback to most populous Nobles location
    if (noblesLocations.length === 0) return null;
    
    return noblesLocations.reduce((a, b) =>
        (a.population || 0) > (b.population || 0) ? a : b
    ).id;
}

/**
 * Check if a leader is blocked from recruitment.
 * Currently only duke_great_plains can be blocked.
 */
export function isLeaderBlocked(
    leaderId: string,
    characters: Character[],
    locations: Location[],
    noblesLocations: Location[]
): { blocked: boolean; reason?: string } {
    if (leaderId === 'duke_great_plains') {
        // Check if Windward is controlled by enemy
        const windward = locations.find(l => l.id === 'windward');
        const windwardControlledByEnemy = windward && windward.faction !== FactionId.NOBLES;
        
        if (windwardControlledByEnemy) {
            // Check if we already have an agent at Windward
            const hasAgentAtWindward = characters.some(c => 
                c.faction === FactionId.NOBLES &&
                c.id !== 'duke_great_plains' &&
                (
                    // Leader is UNDERCOVER or ON_MISSION at Windward
                    ((c.status === CharacterStatus.UNDERCOVER || c.status === CharacterStatus.ON_MISSION) && c.locationId === 'windward') ||
                    // Leader is MOVING to Windward
                    (c.status === CharacterStatus.MOVING && c.destinationId === 'windward')
                )
            );
            
            if (hasAgentAtWindward) {
                return { 
                    blocked: true, 
                    reason: 'noblesRecruitment.blocked.windwardAgent'
                };
            }
        }
    }
    
    return { blocked: false };
}

// ============================================================
// Command Functions (to be expanded later for actual recruitment)
// ============================================================

export interface NoblesRecruitLeaderResult {
    success: boolean;
    error?: string;
    updatedCharacters?: Character[];
    updatedLocations?: Location[];
    destinationId?: string;
    fiefdomLocationId?: string;
    // Special effects
    goldBonus?: number;           // baron_ystrir: +550, duke_great_plains: +400 if controlled
    newArmy?: {                   // duke_esmarch: create army with 2000 soldiers
        strength: number;
        locationId: string;
        leaderId: string;
    };
    triggerInsurrection?: {       // georges_cadal, duke_hornvale
        locationId: string;
        budget: number;
        leaderId: string;
    };
}

/**
 * Execute leader recruitment for Nobles.
 * 
 * Effects:
 * - Leader status changes from DEAD to AVAILABLE (or UNDERCOVER if in enemy territory)
 * - Leader faction changes from NEUTRAL to NOBLES
 * - Leader moves to recruitment destination
 * - isRecruitableLeader flag set to false
 * - Fiefdom granted in selected territory (grantedFief.grantedBy = NOBLES)
 */
export function executeRecruitLeader(
    characters: Character[],
    leaderId: string,
    allLocations: Location[],
    noblesLocations: Location[],
    destinationId: string,
    fiefdomLocationId: string
): NoblesRecruitLeaderResult {
    // Validate leader exists and is recruitable
    const leader = characters.find(c => c.id === leaderId);
    if (!leader) {
        return { success: false, error: 'Leader not found' };
    }
    if (!leader.isRecruitableLeader) {
        return { success: false, error: 'Leader is not recruitable' };
    }
    if (!NOBLES_RECRUITABLE_ORDER.includes(leaderId)) {
        return { success: false, error: 'Leader not available for Nobles' };
    }

    // Validate recruitment conditions
    const recruitCheck = canRecruitLeader(noblesLocations);
    if (!recruitCheck.canRecruit) {
        return { success: false, error: recruitCheck.reason };
    }

    // Validate destination
    if (!destinationId) {
        return { success: false, error: 'No valid recruitment destination' };
    }

    // Validate fiefdom location
    const fiefLocation = allLocations.find(l => l.id === fiefdomLocationId);
    if (!fiefLocation) {
        return { success: false, error: 'Fiefdom location not found' };
    }
    if (fiefLocation.faction !== FactionId.NOBLES) {
        return { success: false, error: 'Fiefdom location not controlled by Nobles' };
    }
    if (fiefLocation.grantedFief) {
        return { success: false, error: 'Fiefdom already granted at this location' };
    }

    // Determine leader status and special effects based on leader type
    const destinationLocation = allLocations.find(l => l.id === destinationId);
    const isEnemyTerritory = destinationLocation && destinationLocation.faction !== FactionId.NOBLES;
    
    // Default status
    let newStatus = isEnemyTerritory ? CharacterStatus.UNDERCOVER : CharacterStatus.AVAILABLE;
    
    // Special effect tracking
    let goldBonus: number | undefined;
    let newArmy: { strength: number; locationId: string; leaderId: string } | undefined;
    let triggerInsurrection: { locationId: string; budget: number; leaderId: string } | undefined;
    let clandestineBudget: number | undefined;

    // Handle special leader effects
    switch (leaderId) {
        case 'baron_ystrir':
            // Baron Ystrir gives 550 gold to treasury
            goldBonus = BARON_YSTRIR_GOLD;
            break;
            
        case 'duke_great_plains':
            // Duke of Great Plains always goes to Windward
            // If Windward is controlled by Nobles: gives 400 gold
            // If Windward is enemy: goes UNDERCOVER with 400 budget
            if (destinationLocation?.faction === FactionId.NOBLES) {
                goldBonus = DUKE_GREAT_PLAINS_BUDGET;
                newStatus = CharacterStatus.AVAILABLE;
            } else {
                newStatus = CharacterStatus.UNDERCOVER;
                clandestineBudget = DUKE_GREAT_PLAINS_BUDGET;
            }
            break;
            
        case 'duke_esmarch':
            // Duke of Esmarch brings 2000 soldiers as a new army
            newArmy = {
                strength: DUKE_ESMARCH_SOLDIERS,
                locationId: destinationId,
                leaderId
            };
            break;
            
        case 'georges_cadal':
            // Georges Cadal: if going to enemy territory, triggers grand insurrection
            if (isEnemyTerritory) {
                newStatus = CharacterStatus.UNDERCOVER;
                clandestineBudget = GEORGES_CADAL_BUDGET;
                triggerInsurrection = {
                    locationId: destinationId,
                    budget: GEORGES_CADAL_BUDGET,
                    leaderId
                };
            }
            break;
            
        case 'duke_hornvale':
            // Duke of Hornvale: if going to enemy territory, triggers grand insurrection
            if (isEnemyTerritory) {
                newStatus = CharacterStatus.UNDERCOVER;
                clandestineBudget = DUKE_HORNVALE_BUDGET;
                triggerInsurrection = {
                    locationId: destinationId,
                    budget: DUKE_HORNVALE_BUDGET,
                    leaderId
                };
            }
            break;
    }

    // Update characters
    const updatedCharacters = characters.map(c => {
        if (c.id === leaderId) {
            const updatedLeader: Character = {
                ...c,
                status: newStatus,
                faction: FactionId.NOBLES,
                locationId: destinationId,
                isRecruitableLeader: false
            };
            
            // Add clandestine budget if applicable
            if (clandestineBudget !== undefined) {
                updatedLeader.clandestineBudget = clandestineBudget;
            }
            
            return updatedLeader;
        }
        return c;
    });

    // Update locations - grant fiefdom
    const updatedLocations = allLocations.map(loc => {
        if (loc.id === fiefdomLocationId) {
            return {
                ...loc,
                grantedFief: {
                    grantedBy: FactionId.NOBLES
                }
            };
        }
        return loc;
    });

    return {
        success: true,
        updatedCharacters,
        updatedLocations,
        destinationId,
        fiefdomLocationId,
        goldBonus,
        newArmy,
        triggerInsurrection
    };
}
