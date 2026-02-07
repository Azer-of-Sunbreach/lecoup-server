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
        exceptional: LeaderRole | null;
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
export declare const LEADER_PROFILES: LeaderProfile[];
/**
 * Get leader profile by ID or name.
 */
export declare const getLeaderProfile: (name: string, id?: string) => LeaderProfile | undefined;
/**
 * Get all leader profiles for a faction.
 */
export declare const getLeaderProfilesForFaction: (faction: FactionId) => LeaderProfile[];
/**
 * Check if a leader has a specific role in their priorities.
 */
export declare const hasRole: (profile: LeaderProfile | undefined, role: LeaderRole) => boolean;
/**
 * Check if a leader has COMMANDER role in their priorities.
 * Leaders without COMMANDER should always be detached for clandestine operations.
 */
export declare const hasCommanderRole: (profile: LeaderProfile | undefined) => boolean;
/**
 * Get the priority level of a role for a leader (1=primary, 2=secondary, 3=tertiary, 4=exceptional, 0=not found).
 */
export declare const getRolePriority: (profile: LeaderProfile | undefined, role: LeaderRole) => number;
/**
 * Get role score bonus based on priority (for scoring algorithms).
 * Higher bonus for preferred roles, penalty for exceptional roles.
 */
export declare const getRoleScoreBonus: (profile: LeaderProfile | undefined, role: LeaderRole) => number;
export declare const isRoleValidForSituation: (role: LeaderRole, leader: any, state: any) => boolean;
