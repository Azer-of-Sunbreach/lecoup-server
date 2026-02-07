"use strict";
/**
 * Nobles Recruitment Domain Service
 *
 * Pure functions for handling Nobles faction leader recruitment.
 * Part of the Clean Hexagonal architecture - domain logic only, no UI dependencies.
 *
 * Unlike Conspirators who pay gold, Nobles must grant fiefdoms (territories)
 * which reduce production by 30 food or 30 gold while controlled.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DUKE_ESMARCH_SOLDIERS = exports.BARON_YSTRIR_GOLD = exports.DUKE_GREAT_PLAINS_BUDGET = exports.DUKE_HORNVALE_BUDGET = exports.GEORGES_CADAL_BUDGET = exports.DUKE_HORNVALE_TERRITORIES = exports.GEORGES_CADAL_TERRITORIES = exports.SPECIAL_EFFECT_LEADERS = exports.NOBLES_LOCATION_LEADERS = exports.NOBLES_RECRUITABLE_ORDER = exports.NOBLES_FIEFDOM_PENALTY = void 0;
exports.getLivingNoblesLeaders = getLivingNoblesLeaders;
exports.getRecruitableNoblesLeaders = getRecruitableNoblesLeaders;
exports.isLocationBasedRecruitment = isLocationBasedRecruitment;
exports.getBaronLekalLocation = getBaronLekalLocation;
exports.getDefaultRecruitmentLocation = getDefaultRecruitmentLocation;
exports.canRecruitLeader = canRecruitLeader;
exports.getRecruitmentDestination = getRecruitmentDestination;
exports.hasSpecialEffect = hasSpecialEffect;
exports.getSpecialLeaderEffectText = getSpecialLeaderEffectText;
exports.getDukeEsmarchDestination = getDukeEsmarchDestination;
exports.isLeaderBlocked = isLeaderBlocked;
exports.executeRecruitLeader = executeRecruitLeader;
const types_1 = require("../../../types");
// ============================================================
// Constants
// ============================================================
/** Production penalty per fiefdom granted */
exports.NOBLES_FIEFDOM_PENALTY = 30;
/**
 * Ordered list of recruitable Nobles leader IDs.
 * Leaders appear in this order in the Prospective Leaders panel.
 */
exports.NOBLES_RECRUITABLE_ORDER = [
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
exports.NOBLES_LOCATION_LEADERS = [
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
const DEFAULT_RECRUITMENT_LOCATIONS = {
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
function getLivingNoblesLeaders(characters) {
    return characters.filter(c => c.faction === types_1.FactionId.NOBLES && c.status !== types_1.CharacterStatus.DEAD);
}
/**
 * Get recruitable leaders for Nobles (isRecruitableLeader=true AND in NOBLES_RECRUITABLE_ORDER).
 * Returns them in the specified display order.
 */
function getRecruitableNoblesLeaders(characters) {
    const recruitableMap = new Map();
    characters.forEach(c => {
        if (c.isRecruitableLeader && exports.NOBLES_RECRUITABLE_ORDER.includes(c.id)) {
            recruitableMap.set(c.id, c);
        }
    });
    // Return in the specified order
    return exports.NOBLES_RECRUITABLE_ORDER
        .filter(id => recruitableMap.has(id))
        .map(id => recruitableMap.get(id));
}
/**
 * Check if a leader has a location-based recruitment (shows "Location:" line).
 * Special effect leaders show their effect text instead, even if they have a fixed location.
 */
function isLocationBasedRecruitment(leaderId) {
    // Special effect leaders show effect text, not location
    if (exports.SPECIAL_EFFECT_LEADERS.includes(leaderId)) {
        return false;
    }
    return exports.NOBLES_LOCATION_LEADERS.includes(leaderId);
}
/**
 * Find Baron Lekal's current location.
 * Returns null if Baron Lekal is dead or not found.
 */
function getBaronLekalLocation(characters) {
    const baronLekal = characters.find(c => c.id === 'lekal');
    if (!baronLekal || baronLekal.status === types_1.CharacterStatus.DEAD) {
        return null;
    }
    return baronLekal.locationId;
}
/**
 * Get the default recruitment location for a leader.
 * For klemath, this depends on Baron Lekal's position.
 */
function getDefaultRecruitmentLocation(leaderId, characters) {
    if (leaderId === 'klemath') {
        return getBaronLekalLocation(characters);
    }
    return DEFAULT_RECRUITMENT_LOCATIONS[leaderId] || null;
}
/**
 * Get the most populous location controlled by Nobles.
 * Priority: cities first, then rural areas.
 */
function getMostPopulousNoblesLocation(noblesLocations, type) {
    const filtered = type
        ? noblesLocations.filter(l => l.type === type)
        : noblesLocations;
    if (filtered.length === 0)
        return null;
    return filtered.reduce((a, b) => (a.population || 0) > (b.population || 0) ? a : b);
}
/**
 * Check if Nobles can recruit leaders (have at least one territory).
 */
function canRecruitLeader(noblesLocations) {
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
function getRecruitmentDestination(leaderId, characters, allLocations, noblesLocations) {
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
exports.SPECIAL_EFFECT_LEADERS = [
    'georges_cadal',
    'baron_ystrir',
    'duke_great_plains',
    'duke_esmarch',
    'duke_hornvale'
];
/** Territories for georges_cadal insurrection */
exports.GEORGES_CADAL_TERRITORIES = ['gullwing', 'gullwing_duchy', 'fairemere_viscounty', 'cathair'];
/** Territories for duke_hornvale insurrection */
exports.DUKE_HORNVALE_TERRITORIES = ['hornvale', 'hornvale_duchy'];
/** Budget for georges_cadal grand insurrection */
exports.GEORGES_CADAL_BUDGET = 400;
/** Budget for duke_hornvale grand insurrection */
exports.DUKE_HORNVALE_BUDGET = 300;
/** Budget for duke_great_plains undercover mission */
exports.DUKE_GREAT_PLAINS_BUDGET = 400;
/** Gold bonus from baron_ystrir */
exports.BARON_YSTRIR_GOLD = 550;
/** Soldiers from duke_esmarch */
exports.DUKE_ESMARCH_SOLDIERS = 2000;
/**
 * Check if a leader has a special effect (not location-based).
 */
function hasSpecialEffect(leaderId) {
    return exports.SPECIAL_EFFECT_LEADERS.includes(leaderId);
}
/**
 * Get the effect text key for a special leader.
 * Returns the translation key to use for the effect description.
 */
function getSpecialLeaderEffectText(leaderId, locations, noblesLocations) {
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
function getDukeEsmarchDestination(allLocations, noblesLocations) {
    // Check if esmarch_duchy is controlled by Nobles
    if (noblesLocations.some(l => l.id === 'esmarch_duchy')) {
        return 'esmarch_duchy';
    }
    // Check if mirebridge is controlled by Nobles
    if (noblesLocations.some(l => l.id === 'mirebridge')) {
        return 'mirebridge';
    }
    // Fallback to most populous Nobles location
    if (noblesLocations.length === 0)
        return null;
    return noblesLocations.reduce((a, b) => (a.population || 0) > (b.population || 0) ? a : b).id;
}
/**
 * Check if a leader is blocked from recruitment.
 * Currently only duke_great_plains can be blocked.
 */
function isLeaderBlocked(leaderId, characters, locations, noblesLocations) {
    if (leaderId === 'duke_great_plains') {
        // Check if Windward is controlled by enemy
        const windward = locations.find(l => l.id === 'windward');
        const windwardControlledByEnemy = windward && windward.faction !== types_1.FactionId.NOBLES;
        if (windwardControlledByEnemy) {
            // Check if we already have an agent at Windward
            const hasAgentAtWindward = characters.some(c => c.faction === types_1.FactionId.NOBLES &&
                c.id !== 'duke_great_plains' &&
                (
                // Leader is UNDERCOVER or ON_MISSION at Windward
                ((c.status === types_1.CharacterStatus.UNDERCOVER || c.status === types_1.CharacterStatus.ON_MISSION) && c.locationId === 'windward') ||
                    // Leader is MOVING to Windward
                    (c.status === types_1.CharacterStatus.MOVING && c.destinationId === 'windward')));
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
function executeRecruitLeader(characters, leaderId, allLocations, noblesLocations, destinationId, fiefdomLocationId) {
    // Validate leader exists and is recruitable
    const leader = characters.find(c => c.id === leaderId);
    if (!leader) {
        return { success: false, error: 'Leader not found' };
    }
    if (!leader.isRecruitableLeader) {
        return { success: false, error: 'Leader is not recruitable' };
    }
    if (!exports.NOBLES_RECRUITABLE_ORDER.includes(leaderId)) {
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
    if (fiefLocation.faction !== types_1.FactionId.NOBLES) {
        return { success: false, error: 'Fiefdom location not controlled by Nobles' };
    }
    if (fiefLocation.grantedFief) {
        return { success: false, error: 'Fiefdom already granted at this location' };
    }
    // Determine leader status and special effects based on leader type
    const destinationLocation = allLocations.find(l => l.id === destinationId);
    const isEnemyTerritory = destinationLocation && destinationLocation.faction !== types_1.FactionId.NOBLES;
    // Default status
    let newStatus = isEnemyTerritory ? types_1.CharacterStatus.UNDERCOVER : types_1.CharacterStatus.AVAILABLE;
    // Special effect tracking
    let goldBonus;
    let newArmy;
    let triggerInsurrection;
    let clandestineBudget;
    // Handle special leader effects
    switch (leaderId) {
        case 'baron_ystrir':
            // Baron Ystrir gives 550 gold to treasury
            goldBonus = exports.BARON_YSTRIR_GOLD;
            break;
        case 'duke_great_plains':
            // Duke of Great Plains always goes to Windward
            // If Windward is controlled by Nobles: gives 400 gold
            // If Windward is enemy: goes UNDERCOVER with 400 budget
            if (destinationLocation?.faction === types_1.FactionId.NOBLES) {
                goldBonus = exports.DUKE_GREAT_PLAINS_BUDGET;
                newStatus = types_1.CharacterStatus.AVAILABLE;
            }
            else {
                newStatus = types_1.CharacterStatus.UNDERCOVER;
                clandestineBudget = exports.DUKE_GREAT_PLAINS_BUDGET;
            }
            break;
        case 'duke_esmarch':
            // Duke of Esmarch brings 2000 soldiers as a new army
            newArmy = {
                strength: exports.DUKE_ESMARCH_SOLDIERS,
                locationId: destinationId,
                leaderId
            };
            break;
        case 'georges_cadal':
            // Georges Cadal: if going to enemy territory, triggers grand insurrection
            if (isEnemyTerritory) {
                newStatus = types_1.CharacterStatus.UNDERCOVER;
                clandestineBudget = exports.GEORGES_CADAL_BUDGET;
                triggerInsurrection = {
                    locationId: destinationId,
                    budget: exports.GEORGES_CADAL_BUDGET,
                    leaderId
                };
            }
            break;
        case 'duke_hornvale':
            // Duke of Hornvale: if going to enemy territory, triggers grand insurrection
            if (isEnemyTerritory) {
                newStatus = types_1.CharacterStatus.UNDERCOVER;
                clandestineBudget = exports.DUKE_HORNVALE_BUDGET;
                triggerInsurrection = {
                    locationId: destinationId,
                    budget: exports.DUKE_HORNVALE_BUDGET,
                    leaderId
                };
            }
            break;
    }
    // Update characters
    const updatedCharacters = characters.map(c => {
        if (c.id === leaderId) {
            const updatedLeader = {
                ...c,
                status: newStatus,
                faction: types_1.FactionId.NOBLES,
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
                    grantedBy: types_1.FactionId.NOBLES
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
