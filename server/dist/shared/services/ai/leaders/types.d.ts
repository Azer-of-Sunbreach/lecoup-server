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
export declare enum AILeaderRole {
    GOVERNOR = "GOVERNOR",
    CLANDESTINE = "CLANDESTINE",
    COMMANDER = "COMMANDER",
    PROTECTOR = "PROTECTOR",
    STABILIZER = "STABILIZER",
    IDLE = "IDLE"
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
    exceptionalRole?: AILeaderRole;
}
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
    economicDamage: {
        burned: boolean;
        severity: 'NONE' | 'MINOR' | 'MAJOR';
    };
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
    detectedEnemyAgents: string[];
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
    score: number;
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
    currentRole: AILeaderRole;
    isUndercover: boolean;
    isMoving: boolean;
    budget: number;
    ownedTerritories: TerritoryStatus[];
    threats: ThreatAnalysis[];
    clandestineTargets: ClandestineOpportunity[];
    canBeReassigned: boolean;
    turnsInCurrentRole: number;
}
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
    priority: number;
    reasoning: string;
    assignedBudget?: number;
    missionType?: 'MAJOR' | 'MINOR';
    targetActionId?: ClandestineActionId;
}
/**
 * Faction strategy configuration.
 */
export interface FactionStrategy {
    factionId: FactionId;
    /** Maximum capture risk percentage (as decimal). 0.15 for Conspirators/Nobles, 0.20 for Republicans */
    maxCaptureRisk: number;
    /** Maximum points allowed above detection threshold (without PARANOID governor) */
    maxDetectionOverThreshold: number;
    /** Maximum points allowed above detection threshold (with PARANOID governor present) */
    maxDetectionWithParanoid: number;
    /** @deprecated Use maxCaptureRisk instead. Old percentage-based risk threshold. */
    maxClandestineRisk: number;
    stabilityPriority: number;
    economyPriority: number;
    expansionPriority: number;
    clandestinePriority: number;
    preferMakeExamples: boolean;
    preferAppeasement: boolean;
    avoidVIPsInClandestine: boolean;
    preferStealthOverAggression: boolean;
}
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
/**
 * Grand Insurrection preparation time in turns.
 */
export declare const GRAND_INSURRECTION_PREP_TURNS = 4;
/**
 * Budget limits for clandestine operations.
 */
export declare const CLANDESTINE_BUDGET: {
    MIN: number;
    MAX: number;
    DEFAULT: number;
    SCORCHED_EARTH_MIN: number;
};
/**
 * Stability thresholds for AI decisions.
 */
export declare const STABILITY_THRESHOLDS: {
    CRITICAL: number;
    LOW: number;
    STABLE: number;
    SAFE: number;
};
