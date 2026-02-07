/**
 * AI Leader System - Core Types
 * 
 * Defines all types used by the AI leader decision system.
 * These are separate from game domain types (shared/types/) and specific
 * to AI decision-making logic.
 * 
 * @module shared/services/ai/leaders
 */

import { Character, FactionId, Location } from '../../../types';
import { GovernorPolicy } from '../../../types/governorTypes';
import { ClandestineActionId } from '../../../types/clandestineTypes';

// ============================================================================
// ROLE DEFINITIONS
// ============================================================================

/**
 * Roles a leader can be assigned by the AI.
 * 
 * Governor: Manages a territory (policies, stability, economy)
 * Clandestine: Operates undercover in enemy territory
 * Commander: Leads an army (attached for combat bonus)
 * Protector: LEGENDARY leader blocking enemy insurrections
 * Stabilizer: Leader with passive stability bonus
 * Idle: No current assignment, waiting for opportunity
 */
export enum AILeaderRole {
    GOVERNOR = 'GOVERNOR',
    CLANDESTINE = 'CLANDESTINE',
    COMMANDER = 'COMMANDER',
    PROTECTOR = 'PROTECTOR',
    STABILIZER = 'STABILIZER',
    IDLE = 'IDLE'
}

/**
 * Governor capability rating.
 * Affects priority for governance tasks.
 */
export type GovernorCapability = 'GREAT' | 'ACCEPTABLE' | 'WEAK';

/**
 * Leader profile for AI decision-making.
 * Maps leaders to their preferred roles and capabilities.
 */
export interface LeaderProfile {
    leaderId: string;
    isVIP: boolean;
    governorCapability: GovernorCapability;
    primaryRole: AILeaderRole;
    secondaryRole?: AILeaderRole;
    tertiaryRole?: AILeaderRole;
    exceptionalRole?: AILeaderRole; // Only used in desperate situations
}

// ============================================================================
// SITUATION ANALYSIS
// ============================================================================

/**
 * Territory status for AI analysis.
 */
export interface TerritoryStatus {
    location: Location;
    stability: number;
    stabilityTrend: 'RISING' | 'STABLE' | 'FALLING' | 'CRITICAL';
    hasEnemyAgent: boolean;
    enemyAgentConfidence: 'CONFIRMED' | 'SUSPECTED' | 'NONE';
    garrisonStrength: number;
    isUnderSiege: boolean;
    isFamineRisk: boolean;
    economicDamage: { burned: boolean; severity: 'NONE' | 'MINOR' | 'MAJOR' };
    needsGovernor: boolean;
    needsProtector: boolean;
    needsStabilizer: boolean;
}

/**
 * Threat assessment for a location.
 */
export interface ThreatAnalysis {
    locationId: string;
    neutralInsurrectionRisk: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
    enemyInsurrectionRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
    enemyArmyThreat: 'IMMINENT' | 'APPROACHING' | 'DISTANT' | 'NONE';
    detectedEnemyAgents: string[]; // Leader IDs if known
}

/**
 * Opportunity for clandestine operations.
 */
export interface ClandestineOpportunity {
    locationId: string;
    locationName: string;
    estimatedInsurgents: number;
    stabilityShockPotential: number;
    goldRequired: number;
    currentRisk: number;
    score: number; // Higher = better target
    blockedByLegendary: boolean;
    blockedByMakeExamples: boolean;
}

/**
 * Complete situation analysis for AI decision-making.
 */
export interface LeaderSituation {
    leader: Character;
    currentLocation: Location | null;
    faction: FactionId;

    // Current state
    currentRole: AILeaderRole;
    isUndercover: boolean;
    isMoving: boolean;
    budget: number;

    // Owned territory status
    ownedTerritories: TerritoryStatus[];
    threats: ThreatAnalysis[];

    // Opportunities
    clandestineTargets: ClandestineOpportunity[];

    // Constraints
    canBeReassigned: boolean;
    turnsInCurrentRole: number;
}

// ============================================================================
// DECISIONS
// ============================================================================

/**
 * Governor decision output.
 */
export interface GovernorDecision {
    leaderId: string;
    targetLocationId: string;
    policiesToActivate: GovernorPolicy[];
    policiesToDeactivate: GovernorPolicy[];
    reasoning: string[];
    estimatedStabilityGain: number;
}

/**
 * Clandestine agent decision output.
 */
export interface ClandestineDecision {
    leaderId: string;
    targetLocationId: string;
    actionsToStart: ClandestineActionId[];
    actionsToStop: ClandestineActionId[];
    goldToAllocate?: number;
    shouldExfiltrate: boolean;
    shouldGoDark: boolean;
    reasoning: string[];
}

/**
 * Commander decision output.
 */
export interface CommanderDecision {
    leaderId: string;
    targetArmyId: string | null;
    shouldDetach: boolean;
    reasoning: string[];
}

/**
 * Role assignment decision.
 */
export interface RoleAssignment {
    leaderId: string;
    assignedRole: AILeaderRole;
    targetLocationId?: string;
    targetArmyId?: string;
    priority: number; // 0-100, higher = more urgent
    reasoning: string;
    assignedBudget?: number;
    missionType?: 'MAJOR' | 'MINOR';
    targetActionId?: ClandestineActionId;
    shouldDetachFromArmy?: boolean; // If true, leader should be detached from current army before assignment
}

// ============================================================================
// STRATEGY
// ============================================================================

/**
 * Faction strategy configuration.
 */
export interface FactionStrategy {
    factionId: FactionId;

    // =========================================================================
    // DETECTION-LEVEL BASED RISK TOLERANCE (New System - 2026-01)
    // =========================================================================

    /** Maximum capture risk percentage (as decimal). 0.15 for Conspirators/Nobles, 0.20 for Republicans */
    maxCaptureRisk: number;

    /** Maximum points allowed above detection threshold (without PARANOID governor) */
    maxDetectionOverThreshold: number;

    /** Maximum points allowed above detection threshold (with PARANOID governor present) */
    maxDetectionWithParanoid: number;

    // =========================================================================
    // LEGACY RISK TOLERANCE (Deprecated - kept for backward compatibility)
    // =========================================================================

    /** @deprecated Use maxCaptureRisk instead. Old percentage-based risk threshold. */
    maxClandestineRisk: number;

    // Priorities (0-100)
    stabilityPriority: number;
    economyPriority: number;
    expansionPriority: number;
    clandestinePriority: number;

    // Governor preferences
    preferMakeExamples: boolean;
    preferAppeasement: boolean;

    // Special behaviors
    avoidVIPsInClandestine: boolean;
    preferStealthOverAggression: boolean;
}

// ============================================================================
// PROCESSING
// ============================================================================

/**
 * Result of AI leader processing for a faction.
 */
export interface AILeaderProcessingResult {
    updatedCharacters: Character[];
    updatedLocations: Location[];
    decisions: {
        roleAssignments: RoleAssignment[];
        governorDecisions: GovernorDecision[];
        clandestineDecisions: ClandestineDecision[];
        commanderDecisions: CommanderDecision[];
    };
    logs: AIDecisionLog[];
}

/**
 * Log entry for AI decision tracing.
 */
export interface AIDecisionLog {
    turn: number;
    faction: FactionId;
    leaderId: string;
    leaderName: string;
    action: string;
    reasoning: string;
    outcome?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Grand Insurrection preparation time in turns.
 */
export const GRAND_INSURRECTION_PREP_TURNS = 4;

/**
 * Budget limits for clandestine operations.
 */
export const CLANDESTINE_BUDGET = {
    MIN: 100,
    MAX: 700,
    DEFAULT: 400,
    SCORCHED_EARTH_MIN: 200
};

/**
 * Stability thresholds for AI decisions.
 */
export const STABILITY_THRESHOLDS = {
    CRITICAL: 30,
    LOW: 50,
    STABLE: 70,
    SAFE: 85
};
