/**
 * AI Leader Management - Types and Interfaces
 * 
 * Core types for the new AI leader management system.
 * Handles role assignment, risk evaluation, and faction-specific strategies.
 * 
 * @see AI_LEADER_REFACTORING_SPECS.md for full specifications
 */

import { FactionId, Character, Location, Army, LogEntry } from '../../../types';
import { GovernorPolicy } from '../../../types/governorTypes';
import { ClandestineActionId, ActiveClandestineAction } from '../../../types/clandestineTypes';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Possible roles an AI leader can fulfill.
 * Determines which decision logic is applied.
 */
export enum AILeaderRole {
    /** Managing a territory as governor */
    GOVERNOR = 'GOVERNOR',
    /** Operating in enemy territory as clandestine agent */
    CLANDESTINE = 'CLANDESTINE',
    /** Leading armies in combat */
    COMMANDER = 'COMMANDER',
    /** Generating gold in controlled cities */
    MANAGER = 'MANAGER',
    /** Providing stability in controlled territories */
    STABILIZER = 'STABILIZER',
    /** Blocking enemy insurrections (requires LEGENDARY ability) */
    PROTECTOR = 'PROTECTOR',
    /** No current assignment - available for new role */
    IDLE = 'IDLE'
}

/**
 * Risk evaluation outcomes determining agent behavior.
 */
export enum RiskDecision {
    /** Risk acceptable - continue normal operations */
    CONTINUE = 'CONTINUE',
    /** Risk elevated - cut non-essential actions, maintain position */
    GO_DARK = 'GO_DARK',
    /** Risk high but insurrection planned - commit to insurrection anyway */
    FORCE_INSURRECTION = 'FORCE_INSURRECTION',
    /** Risk critical - leave the region */
    EXFILTRATE = 'EXFILTRATE'
}

// ============================================================================
// INTERFACES - Risk & Strategy
// ============================================================================

/**
 * Risk thresholds for a faction.
 * Determines when agents should reduce activity or exfiltrate.
 */
export interface RiskThresholds {
    /** Risk level triggering GO_DARK (cut auxiliary actions) */
    goDark: number;
    /** Risk level triggering forced exfiltration */
    exfiltrate: number;
    /** Risk range where GRAND_INSURRECTION can still be forced if planned */
    forceInsurrection: { min: number; max: number };
}

/**
 * Faction-specific AI strategy configuration.
 * Defines priorities, thresholds, and special rules per faction.
 */
export interface FactionStrategy {
    factionId: FactionId;

    /** Risk tolerance thresholds */
    riskThresholds: RiskThresholds;

    /** Governor policies in priority order */
    governorPriorityPolicies: GovernorPolicy[];

    /** Clandestine actions in priority order */
    clandestinePriorityActions: ClandestineActionId[];

    /** Leader IDs that should be protected (avoid high-risk assignments) */
    vipLeaders: string[];

    /** Whether MAKE_EXAMPLES should toggle based on stability */
    makeExamplesToggle?: {
        enableBelow: number;  // Enable if stability < this
        disableAbove: number; // Disable if stability > this
    };

    /** Avoid certain governor policies (unless specific conditions) */
    avoidPolicies?: GovernorPolicy[];
}

// ============================================================================
// INTERFACES - Situation Analysis
// ============================================================================

/**
 * Threat information detected by the AI.
 */
export interface ThreatInfo {
    type: 'ENEMY_AGENT' | 'GRAND_INSURRECTION' | 'ARMY_APPROACHING' | 'LOW_STABILITY';
    locationId: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    detectedTurn: number;
    sourceLogId?: string; // Reference to the log that revealed this threat
}

/**
 * Opportunity for a leader role assignment.
 */
export interface RoleOpportunity {
    role: AILeaderRole;
    targetLocationId: string;
    score: number; // Higher = better opportunity
    turnsToReach: number;
    budgetRequired?: number;
    reasoning: string;
}

/**
 * Complete situation analysis for a leader.
 * Produced by situationAnalyzer.ts
 */
export interface LeaderSituation {
    leader: Character;
    currentLocation: Location;

    // Territory context
    isInEnemyTerritory: boolean;
    isInFriendlyTerritory: boolean;
    isInNeutralTerritory: boolean;
    isUndercover: boolean;

    // Clandestine status
    currentRisk: number; // 0.0 to 1.0
    budgetRemaining: number;
    activeActions: ActiveClandestineAction[];
    isPreparingGrandInsurrection: boolean;
    grandInsurrectionTurnsRemaining?: number;

    // Threats and opportunities
    nearbyThreats: ThreatInfo[];
    roleOpportunities: RoleOpportunity[];

    // Current role (if any)
    currentRole?: AILeaderRole;
    currentTargetLocationId?: string;
}

/**
 * GRAND_INSURRECTION target evaluation.
 */
export interface InsurrectionTarget {
    locationId: string;
    location: Location;
    estimatedInsurgents: number;
    stabilityShockPotential: number;
    goldRequired: number;
    currentRisk: number;
    score: number;
    blockedByLegendary: boolean;
    blockedByMakeExamples: boolean;
}

// ============================================================================
// INTERFACES - Leader Scoring
// ============================================================================

/**
 * Score breakdown for a leader's suitability to a role.
 */
export interface LeaderScoreBreakdown {
    baseScore: number;
    statModifiers: {
        statesmanship?: number;
        discretion?: number;
        clandestineOps?: number;
        commandBonus?: number;
        [key: string]: number | undefined;
    };
    abilityModifiers: Record<string, number>;
    traitModifiers: Record<string, number>;
    situationalModifiers: Record<string, number>;
    totalScore: number;
}

/**
 * Role recommendation with justification.
 */
export interface RoleRecommendation {
    leader: Character;
    recommendedRole: AILeaderRole;
    targetLocationId?: string;
    score: number;
    breakdown: LeaderScoreBreakdown;
    alternativeRoles: Array<{
        role: AILeaderRole;
        score: number;
        targetLocationId?: string;
    }>;
}

// ============================================================================
// INTERFACES - Decision Outputs
// ============================================================================

/**
 * Governor decision output.
 */
export interface GovernorDecision {
    leaderId: string;
    locationId: string;
    policiesToActivate: GovernorPolicy[];
    policiesToDeactivate: GovernorPolicy[];
    reasoning: string[];
}

/**
 * Clandestine agent decision output.
 */
export interface ClandestineDecision {
    leaderId: string;
    locationId: string;
    riskDecision: RiskDecision;
    actionsToStart: ClandestineActionId[];
    actionsToStop: ClandestineActionId[];
    goldToInvest?: number; // For GRAND_INSURRECTION
    exfiltrationTargetId?: string; // Where to go if exfiltrating
    reasoning: string[];
}

/**
 * Commander decision output.
 */
export interface CommanderDecision {
    leaderId: string;
    armyId?: string; // Army to join
    targetLocationId?: string; // Where to move
    shouldDetach: boolean; // Detach from current army
    reasoning: string[];
}

// ============================================================================
// INTERFACES - Budget Management
// ============================================================================

/**
 * Budget allocation for a clandestine agent.
 */
export interface ClandestineBudgetAllocation {
    leaderId: string;
    totalBudget: number;
    reservedForGrandInsurrection: number;
    reservedForNeutralInsurrection: number;
    availableForRecurringActions: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default budget limits for clandestine operations.
 */
export const CLANDESTINE_BUDGET_LIMITS = {
    /** Minimum budget for SCORCHED_EARTH leaders */
    SCORCHED_EARTH_MIN: 200,
    /** Default starting budget */
    DEFAULT: 200,
    /** Margin added to base budget */
    MARGIN: 100,
    /** Maximum budget a leader can carry */
    MAX: 700,
    /** Minimum reserve for INCITE_NEUTRAL_INSURRECTIONS */
    NEUTRAL_INSURRECTION_RESERVE: 100
} as const;

/**
 * GRAND_INSURRECTION preparation turns.
 */
export const GRAND_INSURRECTION_PREP_TURNS = 4;
