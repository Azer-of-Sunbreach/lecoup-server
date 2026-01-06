
import { FactionId } from '../../types';

/**
 * Leader role classification for AI decision making.
 * 
 * Roles:
 * - COMMANDER: Lead armies for combat bonus
 * - GOVERNOR: Manage territories (stability, economy, hunt networks)
 * - AGENT: Clandestine operations in enemy territory (was INSURRECTION)
 * - STABILIZER: Passive stability bonus each turn
 * - PROTECTOR: LEGENDARY ability blocks enemy insurrections
 * - MANAGER: +20 gold/turn in cities (tied to MANAGER ability)
 */
export type LeaderRole = 'COMMANDER' | 'GOVERNOR' | 'AGENT' | 'STABILIZER' | 'PROTECTOR';

// Backward compatibility alias
export type LegacyLeaderRole = 'INSURRECTION';

/**
 * Governor quality - how effective a leader is at governing.
 * 
 * - GREAT: High statesmanship, effective at all policies
 * - ACCEPTABLE: Moderate effectiveness
 * - WEAK: Low effectiveness, use only if necessary
 * 
 * Note: WEAK governors can still govern if needed, but may not be cost-effective.
 * They can always use "Improve Economic Conditions" which is free.
 */
export type GovernorQuality = 'GREAT' | 'ACCEPTABLE' | 'WEAK';

export interface LeaderProfile {
    id: string;
    name: string;
    faction: FactionId;
    isVIP: boolean;
    governorQuality: GovernorQuality;
    priorities: {
        primary: LeaderRole;
        secondary: LeaderRole | null;
        tertiary: LeaderRole | null;
        exceptional: LeaderRole | null;  // Only use as last resort
    };
}

/**
 * Leader profiles with updated classifications per user specifications.
 * 
 * Key changes from previous version:
 * - Added governorQuality (GREAT/ACCEPTABLE/WEAK)
 * - Renamed INSURRECTION → AGENT
 * - Added GOVERNOR role for territory management
 * - Updated priorities based on detailed analysis
 */
export const LEADER_PROFILES: LeaderProfile[] = [
    // ========================================================================
    // REPUBLICANS
    // ========================================================================
    {
        id: 'azer', name: 'Sir Azer', faction: FactionId.REPUBLICANS, isVIP: true,
        governorQuality: 'GREAT',
        // Only Republican with positive stability bonus (+5/turn)
        priorities: { primary: 'STABILIZER', secondary: 'GOVERNOR', tertiary: 'COMMANDER', exceptional: 'AGENT' }
    },
    {
        id: 'argo', name: 'Argo', faction: FactionId.REPUBLICANS, isVIP: false,
        governorQuality: 'GREAT',
        // Has MANAGER ability, less statesmanship than Tordis
        priorities: { primary: 'GOVERNOR', secondary: 'AGENT', tertiary: null, exceptional: null }
    },
    {
        id: 'alia', name: 'Alia', faction: FactionId.REPUBLICANS, isVIP: false,
        governorQuality: 'WEAK',
        // Exceptional clandestine ops + FIREBRAND (+33% insurgents)
        priorities: { primary: 'AGENT', secondary: null, tertiary: null, exceptional: null }
    },
    {
        id: 'lain', name: 'Lain', faction: FactionId.REPUBLICANS, isVIP: false,
        governorQuality: 'WEAK',
        // Pure agent
        priorities: { primary: 'AGENT', secondary: null, tertiary: null, exceptional: null }
    },
    {
        id: 'caelan', name: 'Caelan', faction: FactionId.REPUBLICANS, isVIP: false,
        governorQuality: 'WEAK',
        // Pure agent
        priorities: { primary: 'AGENT', secondary: null, tertiary: null, exceptional: null }
    },
    {
        id: 'tordis', name: 'Tordis', faction: FactionId.REPUBLICANS, isVIP: false,
        governorQuality: 'ACCEPTABLE',
        // Higher statesmanship than Argo but no MANAGER
        priorities: { primary: 'GOVERNOR', secondary: 'AGENT', tertiary: 'COMMANDER', exceptional: null }
    },
    {
        id: 'averic', name: 'Sir Averic', faction: FactionId.REPUBLICANS, isVIP: false,
        governorQuality: 'ACCEPTABLE',
        priorities: { primary: 'GOVERNOR', secondary: 'AGENT', tertiary: 'COMMANDER', exceptional: null }
    },
    {
        id: 'gebren', name: 'Sir Gebren', faction: FactionId.REPUBLICANS, isVIP: false,
        governorQuality: 'ACCEPTABLE',
        // PARANOID (good for hunting agents) + IRON_FIST (generates resentment)
        priorities: { primary: 'GOVERNOR', secondary: 'AGENT', tertiary: 'COMMANDER', exceptional: null }
    },
    {
        id: 'odeke', name: 'Sir Odeke', faction: FactionId.REPUBLICANS, isVIP: false,
        governorQuality: 'ACCEPTABLE',
        priorities: { primary: 'GOVERNOR', secondary: 'AGENT', tertiary: 'COMMANDER', exceptional: null }
    },

    // ========================================================================
    // CONSPIRATORS
    // ========================================================================
    {
        id: 'rivenberg', name: 'Count Rivenberg', faction: FactionId.CONSPIRATORS, isVIP: true,
        governorQuality: 'GREAT',
        // +10 stability/turn, +30% command, MANAGER, GHOST
        priorities: { primary: 'STABILIZER', secondary: 'GOVERNOR', tertiary: 'COMMANDER', exceptional: 'AGENT' }
    },
    {
        id: 'barrett', name: 'Sir Barrett', faction: FactionId.CONSPIRATORS, isVIP: true,
        governorQuality: 'GREAT',
        // +10 stability/turn, +30% command, LEGENDARY
        priorities: { primary: 'STABILIZER', secondary: 'GOVERNOR', tertiary: 'COMMANDER', exceptional: 'PROTECTOR' }
    },
    {
        id: 'jadis', name: 'Jadis', faction: FactionId.CONSPIRATORS, isVIP: false,
        governorQuality: 'GREAT',
        priorities: { primary: 'GOVERNOR', secondary: 'AGENT', tertiary: null, exceptional: null }
    },
    {
        id: 'tymon', name: 'Sir Tymon', faction: FactionId.CONSPIRATORS, isVIP: false,
        governorQuality: 'GREAT',
        priorities: { primary: 'GOVERNOR', secondary: 'AGENT', tertiary: 'COMMANDER', exceptional: null }
    },
    {
        id: 'ethell', name: 'Lady Ethell', faction: FactionId.CONSPIRATORS, isVIP: false,
        governorQuality: 'ACCEPTABLE',
        // DAREDEVIL - chance to escape death, ideal for early game agent
        priorities: { primary: 'AGENT', secondary: 'GOVERNOR', tertiary: null, exceptional: null }
    },

    // ========================================================================
    // NOBLES
    // ========================================================================
    {
        id: 'lekal', name: 'Baron Lekal', faction: FactionId.NOBLES, isVIP: true,
        governorQuality: 'GREAT',
        // +5 stability/turn, MANAGER, PARANOID
        priorities: { primary: 'STABILIZER', secondary: 'GOVERNOR', tertiary: null, exceptional: 'AGENT' }
    },
    {
        id: 'thane', name: 'Duke of Thane', faction: FactionId.NOBLES, isVIP: true,
        governorQuality: 'WEAK',
        // +5 stability/turn, +30% command, IRON_FIST
        priorities: { primary: 'STABILIZER', secondary: 'COMMANDER', tertiary: 'GOVERNOR', exceptional: 'AGENT' }
    },
    {
        id: 'wrenfield', name: 'Lord Wrenfield', faction: FactionId.NOBLES, isVIP: false,
        governorQuality: 'GREAT',
        // +5 stability/turn bonus
        priorities: { primary: 'GOVERNOR', secondary: 'AGENT', tertiary: null, exceptional: null }
    },
    {
        id: 'haraldic', name: 'Sir Haraldic', faction: FactionId.NOBLES, isVIP: false,
        governorQuality: 'GREAT',
        // LEGENDARY, FIREBRAND, PARANOID, DAREDEVIL + IRON_FIST, SCORCHED_EARTH
        // Excellent in all domains but has negative traits
        priorities: { primary: 'AGENT', secondary: 'GOVERNOR', tertiary: 'COMMANDER', exceptional: 'PROTECTOR' }
    },
    {
        id: 'gullwing_duke', name: 'Duke of Gullwing', faction: FactionId.NOBLES, isVIP: false,
        governorQuality: 'WEAK',
        // PARANOID
        priorities: { primary: 'AGENT', secondary: 'COMMANDER', tertiary: 'GOVERNOR', exceptional: null }
    },
    {
        id: 'lys', name: 'Castellan Lys', faction: FactionId.NOBLES, isVIP: false,
        governorQuality: 'ACCEPTABLE',
        // FIREBRAND - ideal for GRAND_INSURRECTION, PARANOID
        priorities: { primary: 'AGENT', secondary: 'GOVERNOR', tertiary: null, exceptional: null }
    },
    {
        id: 'saltcraw', name: 'Viscount of Saltcraw', faction: FactionId.NOBLES, isVIP: false,
        governorQuality: 'WEAK',
        priorities: { primary: 'AGENT', secondary: 'GOVERNOR', tertiary: null, exceptional: null }
    },
    {
        id: 'shorclyff', name: 'Castellan Shorclyff', faction: FactionId.NOBLES, isVIP: false,
        governorQuality: 'ACCEPTABLE',
        priorities: { primary: 'AGENT', secondary: 'GOVERNOR', tertiary: null, exceptional: null }
    }
];

/**
 * Get leader profile by ID or name.
 */
export const getLeaderProfile = (name: string, id?: string): LeaderProfile | undefined => {
    if (id) {
        const byId = LEADER_PROFILES.find(p => p.id === id);
        if (byId) return byId;
    }
    return LEADER_PROFILES.find(p => p.name === name || p.id === name.toLowerCase().replace(/\s+/g, '_'));
}

/**
 * Get all leader profiles for a faction.
 */
export const getLeaderProfilesForFaction = (faction: FactionId): LeaderProfile[] => {
    return LEADER_PROFILES.filter(p => p.faction === faction);
}

/**
 * Check if a leader has a specific role in their priorities.
 */
export const hasRole = (profile: LeaderProfile | undefined, role: LeaderRole): boolean => {
    if (!profile) return false;
    const { primary, secondary, tertiary, exceptional } = profile.priorities;
    return primary === role || secondary === role || tertiary === role || exceptional === role;
}

/**
 * Check if a leader has COMMANDER role in their priorities.
 * Leaders without COMMANDER should always be detached for clandestine operations.
 */
export const hasCommanderRole = (profile: LeaderProfile | undefined): boolean => {
    return hasRole(profile, 'COMMANDER');
}

/**
 * Get the priority level of a role for a leader (1=primary, 2=secondary, 3=tertiary, 4=exceptional, 0=not found).
 */
export const getRolePriority = (profile: LeaderProfile | undefined, role: LeaderRole): number => {
    if (!profile) return 0;
    const { primary, secondary, tertiary, exceptional } = profile.priorities;
    if (primary === role) return 1;
    if (secondary === role) return 2;
    if (tertiary === role) return 3;
    if (exceptional === role) return 4;
    return 0;
}

/**
 * Get role score bonus based on priority (for scoring algorithms).
 * Higher bonus for preferred roles, penalty for exceptional roles.
 */
export const getRoleScoreBonus = (profile: LeaderProfile | undefined, role: LeaderRole): number => {
    const priority = getRolePriority(profile, role);
    switch (priority) {
        case 1: return 50;   // Primary role - strong bonus
        case 2: return 25;   // Secondary role - moderate bonus
        case 3: return 10;   // Tertiary role - small bonus
        case 4: return -30;  // Exceptional role - penalty (use as last resort)
        default: return 0;   // Role not in priorities
    }
}

// Legacy compatibility
export const isRoleValidForSituation = (role: LeaderRole, leader: any, state: any): boolean => {
    return true; // Placeholder
}
