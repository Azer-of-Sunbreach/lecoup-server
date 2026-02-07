/**
 * Leaders Domain Services - Index
 */

export * from './leaderPathfinding';
export * from './infiltrationRisk';

// Conspirators Recruitment - explicit exports to avoid conflicts with Nobles
export {
    CONSPIRATORS_RECRUITMENT_COST,
    CONSPIRATORS_MAX_LEADERS,
    CONSPIRATORS_RECRUITABLE_ORDER,
    getLivingConspiratorLeaders,
    getRecruitableConspiratorLeaders,
    canRecruitLeader as canRecruitConspiratorLeader,
    getDefaultRecruitmentLocation as getDefaultConspiratorRecruitmentLocation,
    getRecruitmentDestination as getConspiratorRecruitmentDestination,
    executeRecruitLeader as executeConspiratorRecruitLeader
} from './conspiratorsRecruitment';

// Nobles Recruitment - explicit exports to avoid conflicts with Conspirators
export {
    NOBLES_FIEFDOM_PENALTY,
    NOBLES_RECRUITABLE_ORDER,
    NOBLES_LOCATION_LEADERS,
    SPECIAL_EFFECT_LEADERS,
    GEORGES_CADAL_TERRITORIES,
    DUKE_HORNVALE_TERRITORIES,
    GEORGES_CADAL_BUDGET,
    DUKE_HORNVALE_BUDGET,
    DUKE_GREAT_PLAINS_BUDGET,
    BARON_YSTRIR_GOLD,
    DUKE_ESMARCH_SOLDIERS,
    getLivingNoblesLeaders,
    getRecruitableNoblesLeaders,
    isLocationBasedRecruitment,
    getBaronLekalLocation,
    getDefaultRecruitmentLocation as getDefaultNoblesRecruitmentLocation,
    canRecruitLeader as canRecruitNoblesLeader,
    getRecruitmentDestination as getNoblesRecruitmentDestination,
    hasSpecialEffect,
    getSpecialLeaderEffectText,
    getDukeEsmarchDestination,
    isLeaderBlocked,
    executeRecruitLeader as executeNoblesRecruitLeader
} from './noblesRecruitment';

// Nobles Leader Availability
export * from './noblesLeaderAvailability';
