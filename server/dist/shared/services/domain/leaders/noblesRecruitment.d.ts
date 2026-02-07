/**
 * Nobles Recruitment Domain Service
 *
 * Pure functions for handling Nobles faction leader recruitment.
 * Part of the Clean Hexagonal architecture - domain logic only, no UI dependencies.
 *
 * Unlike Conspirators who pay gold, Nobles must grant fiefdoms (territories)
 * which reduce production by 30 food or 30 gold while controlled.
 */
import { Character, Location } from '../../../types';
/** Production penalty per fiefdom granted */
export declare const NOBLES_FIEFDOM_PENALTY = 30;
/**
 * Ordered list of recruitable Nobles leader IDs.
 * Leaders appear in this order in the Prospective Leaders panel.
 */
export declare const NOBLES_RECRUITABLE_ORDER: string[];
/**
 * Leaders who appear at a specific location (show "Location:" line).
 * Others have special recruitment effects (show effect description).
 */
export declare const NOBLES_LOCATION_LEADERS: string[];
/**
 * Get all living (not DEAD) Nobles leaders.
 */
export declare function getLivingNoblesLeaders(characters: Character[]): Character[];
/**
 * Get recruitable leaders for Nobles (isRecruitableLeader=true AND in NOBLES_RECRUITABLE_ORDER).
 * Returns them in the specified display order.
 */
export declare function getRecruitableNoblesLeaders(characters: Character[]): Character[];
/**
 * Check if a leader has a location-based recruitment (shows "Location:" line).
 * Special effect leaders show their effect text instead, even if they have a fixed location.
 */
export declare function isLocationBasedRecruitment(leaderId: string): boolean;
/**
 * Find Baron Lekal's current location.
 * Returns null if Baron Lekal is dead or not found.
 */
export declare function getBaronLekalLocation(characters: Character[]): string | null;
/**
 * Get the default recruitment location for a leader.
 * For klemath, this depends on Baron Lekal's position.
 */
export declare function getDefaultRecruitmentLocation(leaderId: string, characters: Character[]): string | null;
/**
 * Check if Nobles can recruit leaders (have at least one territory).
 */
export declare function canRecruitLeader(noblesLocations: Location[]): {
    canRecruit: boolean;
    reason?: 'NO_TERRITORY' | 'NO_RECRUITABLE';
};
/**
 * Determine the actual recruitment destination for a leader.
 *
 * Priority:
 * 1. Default location if controlled by Nobles
 * 2. Most populous CITY controlled by Nobles
 * 3. Most populous RURAL area controlled by Nobles
 */
export declare function getRecruitmentDestination(leaderId: string, characters: Character[], allLocations: Location[], noblesLocations: Location[]): string | null;
/** Special leaders with unique effects (show effect text instead of location) */
export declare const SPECIAL_EFFECT_LEADERS: string[];
/** Territories for georges_cadal insurrection */
export declare const GEORGES_CADAL_TERRITORIES: string[];
/** Territories for duke_hornvale insurrection */
export declare const DUKE_HORNVALE_TERRITORIES: string[];
/** Budget for georges_cadal grand insurrection */
export declare const GEORGES_CADAL_BUDGET = 400;
/** Budget for duke_hornvale grand insurrection */
export declare const DUKE_HORNVALE_BUDGET = 300;
/** Budget for duke_great_plains undercover mission */
export declare const DUKE_GREAT_PLAINS_BUDGET = 400;
/** Gold bonus from baron_ystrir */
export declare const BARON_YSTRIR_GOLD = 550;
/** Soldiers from duke_esmarch */
export declare const DUKE_ESMARCH_SOLDIERS = 2000;
/**
 * Check if a leader has a special effect (not location-based).
 */
export declare function hasSpecialEffect(leaderId: string): boolean;
/**
 * Get the effect text key for a special leader.
 * Returns the translation key to use for the effect description.
 */
export declare function getSpecialLeaderEffectText(leaderId: string, locations: Location[], noblesLocations: Location[]): {
    key: string;
    params?: Record<string, string>;
} | null;
/**
 * Get the destination for duke_esmarch.
 * Priority: esmarch_duchy > mirebridge > most populous Nobles location
 */
export declare function getDukeEsmarchDestination(allLocations: Location[], noblesLocations: Location[]): string | null;
/**
 * Check if a leader is blocked from recruitment.
 * Currently only duke_great_plains can be blocked.
 */
export declare function isLeaderBlocked(leaderId: string, characters: Character[], locations: Location[], noblesLocations: Location[]): {
    blocked: boolean;
    reason?: string;
};
export interface NoblesRecruitLeaderResult {
    success: boolean;
    error?: string;
    updatedCharacters?: Character[];
    updatedLocations?: Location[];
    destinationId?: string;
    fiefdomLocationId?: string;
    goldBonus?: number;
    newArmy?: {
        strength: number;
        locationId: string;
        leaderId: string;
    };
    triggerInsurrection?: {
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
export declare function executeRecruitLeader(characters: Character[], leaderId: string, allLocations: Location[], noblesLocations: Location[], destinationId: string, fiefdomLocationId: string): NoblesRecruitLeaderResult;
