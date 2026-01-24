/**
 * Unified Assignment Service
 *
 * Implements unified IPG comparison across all leader roles:
 * - Governor (nearby territories only)
 * - Clandestine Major (Grand/Neutral)
 * - Clandestine Minor (Undermine)
 * - Commander
 *
 * Phase 0: Reserve leaders with fixed roles (MOVING, ON_MISSION, Urgent Governor)
 * Phase 1: Generate all possible assignments with IPG
 * Phase 2: Sort by IPG and assign, respecting budget and limits
 *
 * @module shared/services/ai/leaders/core
 */
import { Location, Army, FactionId, GameState } from '../../../../types';
import { AILeaderRole, RoleAssignment, TerritoryStatus } from '../types';
import { ClandestineActionId } from '../../../../types/clandestineTypes';
export interface PotentialAssignment {
    leaderId: string;
    leaderName: string;
    role: AILeaderRole;
    targetId: string;
    targetName: string;
    ipg: number;
    missionType?: 'MAJOR' | 'MINOR';
    targetActionId?: ClandestineActionId;
    goldRequired: number;
    travelTime: number;
    details: string;
}
export interface AssignmentContext {
    state: GameState;
    faction: FactionId;
    budget: number;
    turn: number;
    isCampaignActive: boolean;
}
/**
 * Generate unified assignments for all leaders of a faction.
 *
 * @returns Sorted list of role assignments, ready for execution
 */
export declare function generateUnifiedAssignments(context: AssignmentContext, territories: TerritoryStatus[], enemyLocations: Location[], armies: Army[]): RoleAssignment[];
