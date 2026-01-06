/**
 * Leader Profiles Configuration
 * 
 * Defines the role priorities and capabilities for each leader.
 * Based on user-provided classification tables.
 * 
 * @module shared/services/ai/leaders/utils
 */

import { FactionId } from '../../../../types';
import { AILeaderRole, LeaderProfile, GovernorCapability } from '../types';

// ============================================================================
// REPUBLICAN LEADERS
// ============================================================================

const REPUBLICAN_PROFILES: LeaderProfile[] = [
    {
        leaderId: 'sir_azer',
        isVIP: true,
        governorCapability: 'GREAT',
        primaryRole: AILeaderRole.STABILIZER,
        secondaryRole: AILeaderRole.GOVERNOR,
        tertiaryRole: AILeaderRole.COMMANDER,
        exceptionalRole: AILeaderRole.CLANDESTINE
    },
    {
        leaderId: 'argo',
        isVIP: false,
        governorCapability: 'GREAT',
        primaryRole: AILeaderRole.GOVERNOR,
        secondaryRole: AILeaderRole.CLANDESTINE
    },
    {
        leaderId: 'alia',
        isVIP: false,
        governorCapability: 'WEAK',
        primaryRole: AILeaderRole.CLANDESTINE
        // Exceptional: FIREBRAND ability
    },
    {
        leaderId: 'lain',
        isVIP: false,
        governorCapability: 'WEAK',
        primaryRole: AILeaderRole.CLANDESTINE
    },
    {
        leaderId: 'caelan',
        isVIP: false,
        governorCapability: 'WEAK',
        primaryRole: AILeaderRole.CLANDESTINE
    },
    {
        leaderId: 'tordis',
        isVIP: false,
        governorCapability: 'ACCEPTABLE',
        primaryRole: AILeaderRole.GOVERNOR,
        secondaryRole: AILeaderRole.CLANDESTINE,
        tertiaryRole: AILeaderRole.COMMANDER
    },
    {
        leaderId: 'sir_averic',
        isVIP: false,
        governorCapability: 'ACCEPTABLE',
        primaryRole: AILeaderRole.GOVERNOR,
        secondaryRole: AILeaderRole.CLANDESTINE,
        tertiaryRole: AILeaderRole.COMMANDER
    },
    {
        leaderId: 'sir_gebren',
        isVIP: false,
        governorCapability: 'ACCEPTABLE',
        primaryRole: AILeaderRole.GOVERNOR,
        secondaryRole: AILeaderRole.CLANDESTINE,
        tertiaryRole: AILeaderRole.COMMANDER
        // Note: PARANOID + IRON_FIST - good for hunting agents, generates resentment
    },
    {
        leaderId: 'sir_odeke',
        isVIP: false,
        governorCapability: 'ACCEPTABLE',
        primaryRole: AILeaderRole.GOVERNOR,
        secondaryRole: AILeaderRole.CLANDESTINE,
        tertiaryRole: AILeaderRole.COMMANDER
    }
];

// ============================================================================
// CONSPIRATOR LEADERS
// ============================================================================

const CONSPIRATOR_PROFILES: LeaderProfile[] = [
    {
        leaderId: 'count_rivenberg',
        isVIP: true,
        governorCapability: 'GREAT',
        primaryRole: AILeaderRole.STABILIZER,
        secondaryRole: AILeaderRole.GOVERNOR,
        tertiaryRole: AILeaderRole.COMMANDER,
        exceptionalRole: AILeaderRole.CLANDESTINE
    },
    {
        leaderId: 'sir_barrett',
        isVIP: true,
        governorCapability: 'GREAT',
        primaryRole: AILeaderRole.STABILIZER,
        secondaryRole: AILeaderRole.GOVERNOR,
        tertiaryRole: AILeaderRole.COMMANDER,
        exceptionalRole: AILeaderRole.PROTECTOR  // LEGENDARY
    },
    {
        leaderId: 'jadis',
        isVIP: false,
        governorCapability: 'GREAT',
        primaryRole: AILeaderRole.GOVERNOR,
        secondaryRole: AILeaderRole.CLANDESTINE
    },
    {
        leaderId: 'sir_tymon',
        isVIP: false,
        governorCapability: 'GREAT',
        primaryRole: AILeaderRole.GOVERNOR,
        secondaryRole: AILeaderRole.CLANDESTINE,
        tertiaryRole: AILeaderRole.COMMANDER
    },
    {
        leaderId: 'lady_ethell',
        isVIP: false,
        governorCapability: 'ACCEPTABLE',
        primaryRole: AILeaderRole.CLANDESTINE,
        secondaryRole: AILeaderRole.GOVERNOR
        // Note: DAREDEVIL - can escape capture
    }
];

// ============================================================================
// NOBLE LEADERS
// ============================================================================

const NOBLE_PROFILES: LeaderProfile[] = [
    {
        leaderId: 'baron_lekal',
        isVIP: true,
        governorCapability: 'GREAT',
        primaryRole: AILeaderRole.STABILIZER,
        secondaryRole: AILeaderRole.GOVERNOR,
        exceptionalRole: AILeaderRole.CLANDESTINE
        // Note: PARANOID
    },
    {
        leaderId: 'duke_of_thane',
        isVIP: true,
        governorCapability: 'WEAK',
        primaryRole: AILeaderRole.STABILIZER,
        secondaryRole: AILeaderRole.COMMANDER,
        tertiaryRole: AILeaderRole.GOVERNOR,
        exceptionalRole: AILeaderRole.CLANDESTINE
    },
    {
        leaderId: 'lord_wrenfield',
        isVIP: false,
        governorCapability: 'GREAT',
        primaryRole: AILeaderRole.GOVERNOR,
        secondaryRole: AILeaderRole.CLANDESTINE
    },
    {
        leaderId: 'sir_haraldic',
        isVIP: false,
        governorCapability: 'GREAT',
        primaryRole: AILeaderRole.CLANDESTINE,
        secondaryRole: AILeaderRole.GOVERNOR,
        tertiaryRole: AILeaderRole.COMMANDER,
        exceptionalRole: AILeaderRole.PROTECTOR  // LEGENDARY
        // Special: Good at everything but complex (IRON_FIST + SCORCHED_EARTH)
    },
    {
        leaderId: 'duke_of_gullwing',
        isVIP: false,
        governorCapability: 'WEAK',
        primaryRole: AILeaderRole.CLANDESTINE,
        secondaryRole: AILeaderRole.COMMANDER,
        tertiaryRole: AILeaderRole.GOVERNOR
        // Note: PARANOID
    },
    {
        leaderId: 'castellan_lys',
        isVIP: false,
        governorCapability: 'ACCEPTABLE',
        primaryRole: AILeaderRole.CLANDESTINE,
        secondaryRole: AILeaderRole.GOVERNOR
        // Note: FIREBRAND - excellent for Grand Insurrection
    },
    {
        leaderId: 'viscount_of_saltcraw',
        isVIP: false,
        governorCapability: 'WEAK',
        primaryRole: AILeaderRole.CLANDESTINE,
        secondaryRole: AILeaderRole.GOVERNOR
    },
    {
        leaderId: 'castellan_shorclyff',
        isVIP: false,
        governorCapability: 'ACCEPTABLE',
        primaryRole: AILeaderRole.CLANDESTINE,
        secondaryRole: AILeaderRole.GOVERNOR
    }
];

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Get all leader profiles for a faction.
 */
export function getLeaderProfiles(faction: FactionId): LeaderProfile[] {
    switch (faction) {
        case FactionId.REPUBLICANS:
            return REPUBLICAN_PROFILES;
        case FactionId.CONSPIRATORS:
            return CONSPIRATOR_PROFILES;
        case FactionId.NOBLES:
            return NOBLE_PROFILES;
        default:
            return [];
    }
}

/**
 * Get profile for a specific leader.
 */
export function getLeaderProfile(leaderId: string): LeaderProfile | undefined {
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
export function isLeaderVIP(leaderId: string): boolean {
    const profile = getLeaderProfile(leaderId);
    return profile?.isVIP ?? false;
}

/**
 * Get governor capability for a leader.
 */
export function getGovernorCapability(leaderId: string): GovernorCapability {
    const profile = getLeaderProfile(leaderId);
    return profile?.governorCapability ?? 'WEAK';
}

/**
 * Check if a role is appropriate for a leader.
 * Returns priority: 1 = primary, 2 = secondary, 3 = tertiary, 4 = exceptional, 0 = not recommended
 */
export function getRolePriority(leaderId: string, role: AILeaderRole): number {
    const profile = getLeaderProfile(leaderId);
    if (!profile) return 0;

    if (profile.primaryRole === role) return 1;
    if (profile.secondaryRole === role) return 2;
    if (profile.tertiaryRole === role) return 3;
    if (profile.exceptionalRole === role) return 4;

    // Governor is always acceptable as fallback
    if (role === AILeaderRole.GOVERNOR) return 3;

    return 0;
}
