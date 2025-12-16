
import { FactionId } from '../../../shared/types';

export type LeaderRole = 'COMMANDER' | 'MANAGER' | 'INSURRECTION' | 'STABILIZER' | 'PROTECTOR';

export interface LeaderProfile {
    id?: string; // Optional, defaults to name if not present
    name: string;
    faction: FactionId;
    isVIP: boolean;
    priorities: {
        primary: LeaderRole;
        secondary: LeaderRole;
        tertiary: LeaderRole | null;
        exceptional: LeaderRole | null;
    };
}

export const LEADER_PROFILES: LeaderProfile[] = [
    // REPUBLICANS
    {
        id: 'azer', name: 'Sir Azer', faction: FactionId.REPUBLICANS, isVIP: true,
        priorities: { primary: 'STABILIZER', secondary: 'COMMANDER', tertiary: null, exceptional: 'INSURRECTION' }
    },
    {
        id: 'argo', name: 'Argo', faction: FactionId.REPUBLICANS, isVIP: false,
        priorities: { primary: 'MANAGER', secondary: 'INSURRECTION', tertiary: null, exceptional: null }
    },
    {
        id: 'alia', name: 'Alia', faction: FactionId.REPUBLICANS, isVIP: false,
        priorities: { primary: 'INSURRECTION', secondary: 'INSURRECTION', tertiary: null, exceptional: null } // Fallback to INSURRECTION
    },
    {
        id: 'lain', name: 'Lain', faction: FactionId.REPUBLICANS, isVIP: false,
        priorities: { primary: 'INSURRECTION', secondary: 'INSURRECTION', tertiary: null, exceptional: null }
    },
    {
        id: 'caelan', name: 'Caelan', faction: FactionId.REPUBLICANS, isVIP: false,
        priorities: { primary: 'INSURRECTION', secondary: 'INSURRECTION', tertiary: null, exceptional: null }
    },
    {
        id: 'tordis', name: 'Tordis', faction: FactionId.REPUBLICANS, isVIP: true,
        priorities: { primary: 'STABILIZER', secondary: 'COMMANDER', tertiary: null, exceptional: 'INSURRECTION' }
    },
    {
        id: 'averic', name: 'Sir Averic', faction: FactionId.REPUBLICANS, isVIP: false,
        priorities: { primary: 'INSURRECTION', secondary: 'COMMANDER', tertiary: null, exceptional: null }
    },
    {
        id: 'gebren', name: 'Sir Gebren', faction: FactionId.REPUBLICANS, isVIP: false,
        priorities: { primary: 'INSURRECTION', secondary: 'COMMANDER', tertiary: null, exceptional: null }
    },
    {
        id: 'odeke', name: 'Sir Odeke', faction: FactionId.REPUBLICANS, isVIP: false,
        priorities: { primary: 'INSURRECTION', secondary: 'COMMANDER', tertiary: null, exceptional: null }
    },

    // CONSPIRATORS
    {
        id: 'rivenberg', name: 'Count Rivenberg', faction: FactionId.CONSPIRATORS, isVIP: true,
        priorities: { primary: 'STABILIZER', secondary: 'MANAGER', tertiary: 'COMMANDER', exceptional: 'INSURRECTION' }
    },
    {
        id: 'barrett', name: 'Sir Barrett', faction: FactionId.CONSPIRATORS, isVIP: true,
        priorities: { primary: 'STABILIZER', secondary: 'COMMANDER', tertiary: 'PROTECTOR', exceptional: 'INSURRECTION' }
    },
    {
        id: 'jadis', name: 'Jadis', faction: FactionId.CONSPIRATORS, isVIP: false,
        priorities: { primary: 'INSURRECTION', secondary: 'STABILIZER', tertiary: 'MANAGER', exceptional: null }
    },
    {
        id: 'tymon', name: 'Sir Tymon', faction: FactionId.CONSPIRATORS, isVIP: false,
        priorities: { primary: 'STABILIZER', secondary: 'INSURRECTION', tertiary: 'COMMANDER', exceptional: null }
    },
    {
        id: 'ethell', name: 'Lady Ethell', faction: FactionId.CONSPIRATORS, isVIP: false,
        priorities: { primary: 'INSURRECTION', secondary: 'INSURRECTION', tertiary: null, exceptional: null }
    },

    // NOBLES
    {
        id: 'lekal', name: 'Baron Lekal', faction: FactionId.NOBLES, isVIP: true,
        priorities: { primary: 'STABILIZER', secondary: 'MANAGER', tertiary: null, exceptional: 'INSURRECTION' }
    },
    {
        id: 'thane', name: 'Duke of Thane', faction: FactionId.NOBLES, isVIP: false,
        priorities: { primary: 'STABILIZER', secondary: 'COMMANDER', tertiary: 'INSURRECTION', exceptional: null }
    },
    {
        id: 'wrenfield', name: 'Lord Wrenfield', faction: FactionId.NOBLES, isVIP: false,
        priorities: { primary: 'STABILIZER', secondary: 'INSURRECTION', tertiary: null, exceptional: null }
    },
    {
        id: 'haraldic', name: 'Sir Haraldic', faction: FactionId.NOBLES, isVIP: true,
        priorities: { primary: 'COMMANDER', secondary: 'PROTECTOR', tertiary: null, exceptional: 'INSURRECTION' }
    },
    {
        id: 'gullwing_duke', name: 'Duke of Gullwing', faction: FactionId.NOBLES, isVIP: false,
        priorities: { primary: 'INSURRECTION', secondary: 'COMMANDER', tertiary: null, exceptional: null }
    },
    {
        id: 'lys', name: 'Castellan Lys', faction: FactionId.NOBLES, isVIP: false,
        priorities: { primary: 'INSURRECTION', secondary: 'INSURRECTION', tertiary: null, exceptional: null }
    },
    {
        id: 'saltcraw', name: 'Viscount of Saltcraw', faction: FactionId.NOBLES, isVIP: false,
        priorities: { primary: 'INSURRECTION', secondary: 'INSURRECTION', tertiary: null, exceptional: null }
    },
    {
        id: 'shorclyff', name: 'Castellan Shorclyff', faction: FactionId.NOBLES, isVIP: false,
        priorities: { primary: 'INSURRECTION', secondary: 'INSURRECTION', tertiary: null, exceptional: null }
    }
];

export const getLeaderProfile = (name: string, id?: string): LeaderProfile | undefined => {
    if (id) {
        const byId = LEADER_PROFILES.find(p => p.id === id);
        if (byId) return byId;
    }
    return LEADER_PROFILES.find(p => p.name === name);
}

// Logic helpers for Leader evaluation
export const isRoleValidForSituation = (role: LeaderRole, leader: any, state: any): boolean => {
    // Placeholder for complex validation logic described in specs
    return true;
}

/**
 * Check if a leader has any COMMANDER role in their priorities.
 * Leaders without COMMANDER should always be detached for insurrections.
 */
export const hasCommanderRole = (profile: LeaderProfile | undefined): boolean => {
    if (!profile) return true; // Unknown leaders assumed to have commander role (safe default)
    const { primary, secondary, tertiary, exceptional } = profile.priorities;
    return primary === 'COMMANDER' || secondary === 'COMMANDER' ||
        tertiary === 'COMMANDER' || exceptional === 'COMMANDER';
}
