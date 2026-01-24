/**
 * AI Risk Decision Service
 *
 * Encapsulates all AI risk decision logic based on the detection level/threshold model.
 * Used by ClandestineRole.ts and ClandestineAgentProcessor.ts for consistent decision-making.
 *
 * Key Concepts:
 * - Detection Level: Current accumulated detection points on leader
 * - Detection Threshold: Maximum safe detection (20 + 10 × discretion), halved by HUNT_NETWORKS
 * - Capture Risk: (detection - threshold) + PARANOID bonus when over threshold
 * - Allowed Over Threshold: Faction-specific tolerance above threshold
 *
 * @module shared/services/ai/leaders/utils
 */
import { Character, Location } from '../../../../types';
import { ClandestineActionId, ActiveClandestineAction } from '../../../../types/clandestineTypes';
import { FactionStrategy } from '../types';
export interface RiskContext {
    leader: Character;
    location: Location;
    governor: Character | undefined;
    strategy: FactionStrategy;
    isPreparingGrandInsurrection: boolean;
}
export interface RiskAssessment {
    currentDetectionLevel: number;
    effectiveThreshold: number;
    maxAllowedDetection: number;
    currentCaptureRisk: number;
    hasParanoidGovernor: boolean;
    isHuntNetworksActive: boolean;
    shouldExfiltrate: boolean;
    exfiltrationReason?: string;
}
export interface ActionRiskInfo {
    actionId: ClandestineActionId;
    detectionIncrease: number;
    detectionType: 'per_turn' | 'one_time';
    costPerTurn: number;
    wouldExceedLimit: boolean;
    projectedDetection: number;
    projectedCaptureRisk: number;
}
/**
 * Calculate the maximum detection level allowed for this leader/location/strategy.
 *
 * Formula:
 * - Without PARANOID: threshold + maxDetectionOverThreshold
 * - With PARANOID: threshold + maxDetectionWithParanoid
 * - During GRAND_INSURRECTION prep: threshold only (no tolerance)
 */
export declare function calculateMaxAllowedDetection(leader: Character, location: Location, governor: Character | undefined, strategy: FactionStrategy, isPreparingGrandInsurrection: boolean): number;
/**
 * Perform a complete risk assessment for a clandestine agent.
 */
export declare function assessRisk(context: RiskContext): RiskAssessment;
/**
 * Calculate risk info for a single action.
 */
export declare function getActionRiskInfo(actionId: ClandestineActionId, context: RiskContext, assessment: RiskAssessment): ActionRiskInfo;
/**
 * Calculate total detection increase from a set of per-turn actions.
 */
export declare function calculateTotalPerTurnDetection(actions: ActiveClandestineAction[]): number;
/**
 * Project the detection level after next turn with proposed actions.
 *
 * @param leader Current leader state
 * @param proposedActions Actions to be active next turn
 * @returns Projected detection level
 */
export declare function projectDetectionAfterTurn(leader: Character, proposedActions: ActiveClandestineAction[]): number;
/**
 * Select actions that fit within the risk budget.
 *
 * Strategy:
 * 1. Start with mandatory actions (if any)
 * 2. Add actions in priority order until budget or risk limit reached
 * 3. If an action would exceed limit, skip it and try next
 *
 * @param candidateActions Actions to consider (sorted by priority, highest first)
 * @param context Risk context
 * @param assessment Current risk assessment
 * @param mandatoryActions Actions that must be included (from traits)
 * @returns Selected actions that fit within constraints
 */
export declare function selectActionsWithinRiskBudget(candidateActions: ClandestineActionId[], context: RiskContext, assessment: RiskAssessment, mandatoryActions: ClandestineActionId[], budget: number): {
    selected: ClandestineActionId[];
    reasoning: string[];
};
/**
 * Determine if a leader should be exfiltrated.
 *
 * Conditions for exfiltration:
 * 1. Capture risk exceeds faction tolerance (and NOT preparing GI)
 * 2. Budget is 0 (and NOT preparing GI)
 * 3. Cannot perform any action without exceeding limits (and NOT preparing GI)
 *
 * @returns Object with decision and reason
 */
export declare function shouldExfiltrateLeader(context: RiskContext, budget: number, canPerformAnyAction: boolean): {
    shouldExfiltrate: boolean;
    reason?: string;
};
/**
 * Generate a human-readable risk summary for logging.
 */
export declare function formatRiskSummary(assessment: RiskAssessment): string;
