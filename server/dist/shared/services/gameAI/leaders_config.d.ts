import { FactionId } from '../../types';
export type LeaderRole = 'COMMANDER' | 'MANAGER' | 'INSURRECTION' | 'STABILIZER' | 'PROTECTOR';
export interface LeaderProfile {
    id?: string;
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
export declare const LEADER_PROFILES: LeaderProfile[];
export declare const getLeaderProfile: (name: string, id?: string) => LeaderProfile | undefined;
export declare const isRoleValidForSituation: (role: LeaderRole, leader: any, state: any) => boolean;
/**
 * Check if a leader has any COMMANDER role in their priorities.
 * Leaders without COMMANDER should always be detached for insurrections.
 */
export declare const hasCommanderRole: (profile: LeaderProfile | undefined) => boolean;
