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
/**
 * Get all leader profiles for a faction.
 */
export declare function getLeaderProfiles(faction: FactionId): LeaderProfile[];
/**
 * Get profile for a specific leader.
 */
export declare function getLeaderProfile(leaderId: string): LeaderProfile | undefined;
/**
 * Check if a leader is VIP for their faction.
 */
export declare function isLeaderVIP(leaderId: string): boolean;
/**
 * Get governor capability for a leader.
 */
export declare function getGovernorCapability(leaderId: string): GovernorCapability;
/**
 * Check if a role is appropriate for a leader.
 * Returns priority: 1 = primary, 2 = secondary, 3 = tertiary, 4 = exceptional, 0 = not recommended
 */
export declare function getRolePriority(leaderId: string, role: AILeaderRole): number;
