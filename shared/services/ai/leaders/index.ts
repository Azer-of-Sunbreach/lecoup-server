/**
 * AI Leader System - Module Entry Point
 * 
 * Clean Hexagonal Architecture implementation for AI leader management.
 * Handles role assignment and decision-making for:
 * - Governors (territory policies)
 * - Clandestine Agents (undercover operations)
 * - Commanders (army leadership)
 * - Protectors (LEGENDARY insurrection blockers)
 * - Stabilizers (passive stability bonus)
 * 
 * @module shared/services/ai/leaders
 */

// Core exports
export { processLeaderAI } from './core/LeaderAIProcessor';
export { LeaderStateManager } from './core/LeaderStateManager';
export { AILogger } from './core/AILogger';

// Type exports
export * from './types';

// Role exports
export { makeGovernorDecisions, analyzeTerritoryForGovernor } from './roles/GovernorRole';
export { makeClandestineDecisions, evaluateClandestineOpportunity } from './roles/ClandestineRole';

// Strategy exports
export { getStrategyForFaction, shouldGoDark, shouldExfiltrate } from './strategies/factionStrategy';

// Utility exports
export { getLeaderProfiles, getLeaderProfile, isLeaderVIP, getRolePriority } from './utils/LeaderProfiles';
export * from './utils/IPGCalculator';
export * from './utils/AIRiskDecisionService';

// Unified Assignment System
export { generateUnifiedAssignments } from './core/UnifiedAssignmentService';
export type { PotentialAssignment, AssignmentContext } from './core/UnifiedAssignmentService';

// Clandestine Agent Processing (for UNDERCOVER agents)
export { processClandestineAgent } from './core/ClandestineAgentProcessor';
export type { ClandestineResult } from './core/ClandestineAgentProcessor';
// ClandestineActionId and ActiveClandestineAction are exported from shared/types/clandestineTypes.ts
