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
export { processLeaderAI } from './core/LeaderAIProcessor';
export { LeaderStateManager } from './core/LeaderStateManager';
export { AILogger } from './core/AILogger';
export * from './types';
export { makeGovernorDecisions, analyzeTerritoryForGovernor } from './roles/GovernorRole';
export { makeClandestineDecisions, evaluateClandestineOpportunity } from './roles/ClandestineRole';
export { getStrategyForFaction, shouldGoDark, shouldExfiltrate } from './strategies/factionStrategy';
export { getLeaderProfiles, getLeaderProfile, isLeaderVIP, getRolePriority } from './utils/LeaderProfiles';
export * from './utils/IPGCalculator';
export * from './utils/AIRiskDecisionService';
export { generateUnifiedAssignments } from './core/UnifiedAssignmentService';
export type { PotentialAssignment, AssignmentContext } from './core/UnifiedAssignmentService';
export { processClandestineAgent } from './core/ClandestineAgentProcessor';
export type { ClandestineResult } from './core/ClandestineAgentProcessor';
