"use strict";
/**
 * Leader Profiles Configuration
 *
 * Defines the role priorities and capabilities for each leader.
 * Based on user-provided classification tables.
 *
 * @module shared/services/ai/leaders/utils
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeaderProfiles = getLeaderProfiles;
exports.getLeaderProfile = getLeaderProfile;
exports.isLeaderVIP = isLeaderVIP;
exports.getGovernorCapability = getGovernorCapability;
exports.getRolePriority = getRolePriority;
const types_1 = require("../../../../types");
const types_2 = require("../types");
// ============================================================================
// REPUBLICAN LEADERS
// ============================================================================
const REPUBLICAN_PROFILES = [
    {
        leaderId: 'sir_azer',
        isVIP: true,
        governorCapability: 'GREAT',
        primaryRole: types_2.AILeaderRole.STABILIZER,
        secondaryRole: types_2.AILeaderRole.GOVERNOR,
        tertiaryRole: types_2.AILeaderRole.COMMANDER,
        exceptionalRole: types_2.AILeaderRole.CLANDESTINE
    },
    {
        leaderId: 'argo',
        isVIP: false,
        governorCapability: 'GREAT',
        primaryRole: types_2.AILeaderRole.GOVERNOR,
        secondaryRole: types_2.AILeaderRole.CLANDESTINE
    },
    {
        leaderId: 'alia',
        isVIP: false,
        governorCapability: 'WEAK',
        primaryRole: types_2.AILeaderRole.CLANDESTINE
        // Exceptional: FIREBRAND ability
    },
    {
        leaderId: 'lain',
        isVIP: false,
        governorCapability: 'WEAK',
        primaryRole: types_2.AILeaderRole.CLANDESTINE
    },
    {
        leaderId: 'caelan',
        isVIP: false,
        governorCapability: 'WEAK',
        primaryRole: types_2.AILeaderRole.CLANDESTINE
    },
    {
        leaderId: 'tordis',
        isVIP: false,
        governorCapability: 'ACCEPTABLE',
        primaryRole: types_2.AILeaderRole.GOVERNOR,
        secondaryRole: types_2.AILeaderRole.CLANDESTINE,
        tertiaryRole: types_2.AILeaderRole.COMMANDER
    },
    {
        leaderId: 'sir_averic',
        isVIP: false,
        governorCapability: 'ACCEPTABLE',
        primaryRole: types_2.AILeaderRole.GOVERNOR,
        secondaryRole: types_2.AILeaderRole.CLANDESTINE,
        tertiaryRole: types_2.AILeaderRole.COMMANDER
    },
    {
        leaderId: 'sir_gebren',
        isVIP: false,
        governorCapability: 'ACCEPTABLE',
        primaryRole: types_2.AILeaderRole.GOVERNOR,
        secondaryRole: types_2.AILeaderRole.CLANDESTINE,
        tertiaryRole: types_2.AILeaderRole.COMMANDER
        // Note: PARANOID + IRON_FIST - good for hunting agents, generates resentment
    },
    {
        leaderId: 'sir_odeke',
        isVIP: false,
        governorCapability: 'ACCEPTABLE',
        primaryRole: types_2.AILeaderRole.GOVERNOR,
        secondaryRole: types_2.AILeaderRole.CLANDESTINE,
        tertiaryRole: types_2.AILeaderRole.COMMANDER
    }
];
// ============================================================================
// CONSPIRATOR LEADERS
// ============================================================================
const CONSPIRATOR_PROFILES = [
    {
        leaderId: 'count_rivenberg',
        isVIP: true,
        governorCapability: 'GREAT',
        primaryRole: types_2.AILeaderRole.STABILIZER,
        secondaryRole: types_2.AILeaderRole.GOVERNOR,
        tertiaryRole: types_2.AILeaderRole.COMMANDER,
        exceptionalRole: types_2.AILeaderRole.CLANDESTINE
    },
    {
        leaderId: 'sir_barrett',
        isVIP: true,
        governorCapability: 'GREAT',
        primaryRole: types_2.AILeaderRole.STABILIZER,
        secondaryRole: types_2.AILeaderRole.GOVERNOR,
        tertiaryRole: types_2.AILeaderRole.COMMANDER,
        exceptionalRole: types_2.AILeaderRole.PROTECTOR // LEGENDARY
    },
    {
        leaderId: 'jadis',
        isVIP: false,
        governorCapability: 'GREAT',
        primaryRole: types_2.AILeaderRole.GOVERNOR,
        secondaryRole: types_2.AILeaderRole.CLANDESTINE
    },
    {
        leaderId: 'sir_tymon',
        isVIP: false,
        governorCapability: 'GREAT',
        primaryRole: types_2.AILeaderRole.GOVERNOR,
        secondaryRole: types_2.AILeaderRole.CLANDESTINE,
        tertiaryRole: types_2.AILeaderRole.COMMANDER
    },
    {
        leaderId: 'lady_ethell',
        isVIP: false,
        governorCapability: 'ACCEPTABLE',
        primaryRole: types_2.AILeaderRole.CLANDESTINE,
        secondaryRole: types_2.AILeaderRole.GOVERNOR
        // Note: DAREDEVIL - can escape capture
    }
];
// ============================================================================
// NOBLE LEADERS
// ============================================================================
const NOBLE_PROFILES = [
    {
        leaderId: 'baron_lekal',
        isVIP: true,
        governorCapability: 'GREAT',
        primaryRole: types_2.AILeaderRole.STABILIZER,
        secondaryRole: types_2.AILeaderRole.GOVERNOR,
        exceptionalRole: types_2.AILeaderRole.CLANDESTINE
        // Note: PARANOID
    },
    {
        leaderId: 'duke_of_thane',
        isVIP: true,
        governorCapability: 'WEAK',
        primaryRole: types_2.AILeaderRole.STABILIZER,
        secondaryRole: types_2.AILeaderRole.COMMANDER,
        tertiaryRole: types_2.AILeaderRole.GOVERNOR,
        exceptionalRole: types_2.AILeaderRole.CLANDESTINE
    },
    {
        leaderId: 'lord_wrenfield',
        isVIP: false,
        governorCapability: 'GREAT',
        primaryRole: types_2.AILeaderRole.GOVERNOR,
        secondaryRole: types_2.AILeaderRole.CLANDESTINE
    },
    {
        leaderId: 'sir_haraldic',
        isVIP: false,
        governorCapability: 'GREAT',
        primaryRole: types_2.AILeaderRole.CLANDESTINE,
        secondaryRole: types_2.AILeaderRole.GOVERNOR,
        tertiaryRole: types_2.AILeaderRole.COMMANDER,
        exceptionalRole: types_2.AILeaderRole.PROTECTOR // LEGENDARY
        // Special: Good at everything but complex (IRON_FIST + SCORCHED_EARTH)
    },
    {
        leaderId: 'duke_of_gullwing',
        isVIP: false,
        governorCapability: 'WEAK',
        primaryRole: types_2.AILeaderRole.CLANDESTINE,
        secondaryRole: types_2.AILeaderRole.COMMANDER,
        tertiaryRole: types_2.AILeaderRole.GOVERNOR
        // Note: PARANOID
    },
    {
        leaderId: 'castellan_lys',
        isVIP: false,
        governorCapability: 'ACCEPTABLE',
        primaryRole: types_2.AILeaderRole.CLANDESTINE,
        secondaryRole: types_2.AILeaderRole.GOVERNOR
        // Note: FIREBRAND - excellent for Grand Insurrection
    },
    {
        leaderId: 'viscount_of_saltcraw',
        isVIP: false,
        governorCapability: 'WEAK',
        primaryRole: types_2.AILeaderRole.CLANDESTINE,
        secondaryRole: types_2.AILeaderRole.GOVERNOR
    },
    {
        leaderId: 'castellan_shorclyff',
        isVIP: false,
        governorCapability: 'ACCEPTABLE',
        primaryRole: types_2.AILeaderRole.CLANDESTINE,
        secondaryRole: types_2.AILeaderRole.GOVERNOR
    }
];
// ============================================================================
// EXPORTS
// ============================================================================
/**
 * Get all leader profiles for a faction.
 */
function getLeaderProfiles(faction) {
    switch (faction) {
        case types_1.FactionId.REPUBLICANS:
            return REPUBLICAN_PROFILES;
        case types_1.FactionId.CONSPIRATORS:
            return CONSPIRATOR_PROFILES;
        case types_1.FactionId.NOBLES:
            return NOBLE_PROFILES;
        default:
            return [];
    }
}
/**
 * Get profile for a specific leader.
 */
function getLeaderProfile(leaderId) {
    // Normalize ID (lowercase, replace spaces with underscores)
    const normalizedId = leaderId.toLowerCase().replace(/\s+/g, '_');
    const allProfiles = [
        ...REPUBLICAN_PROFILES,
        ...CONSPIRATOR_PROFILES,
        ...NOBLE_PROFILES
    ];
    return allProfiles.find(p => p.leaderId === normalizedId);
}
/**
 * Check if a leader is VIP for their faction.
 */
function isLeaderVIP(leaderId) {
    const profile = getLeaderProfile(leaderId);
    return profile?.isVIP ?? false;
}
/**
 * Get governor capability for a leader.
 */
function getGovernorCapability(leaderId) {
    const profile = getLeaderProfile(leaderId);
    return profile?.governorCapability ?? 'WEAK';
}
/**
 * Check if a role is appropriate for a leader.
 * Returns priority: 1 = primary, 2 = secondary, 3 = tertiary, 4 = exceptional, 0 = not recommended
 */
function getRolePriority(leaderId, role) {
    const profile = getLeaderProfile(leaderId);
    if (!profile)
        return 0;
    if (profile.primaryRole === role)
        return 1;
    if (profile.secondaryRole === role)
        return 2;
    if (profile.tertiaryRole === role)
        return 3;
    if (profile.exceptionalRole === role)
        return 4;
    // Governor is always acceptable as fallback
    if (role === types_2.AILeaderRole.GOVERNOR)
        return 3;
    return 0;
}
