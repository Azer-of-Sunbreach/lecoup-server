"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateMaxAllowedDetection = calculateMaxAllowedDetection;
exports.assessRisk = assessRisk;
exports.getActionRiskInfo = getActionRiskInfo;
exports.calculateTotalPerTurnDetection = calculateTotalPerTurnDetection;
exports.projectDetectionAfterTurn = projectDetectionAfterTurn;
exports.selectActionsWithinRiskBudget = selectActionsWithinRiskBudget;
exports.shouldExfiltrateLeader = shouldExfiltrateLeader;
exports.formatRiskSummary = formatRiskSummary;
const clandestineTypes_1 = require("../../../../types/clandestineTypes");
const detectionLevelService_1 = require("../../../domain/clandestine/detectionLevelService");
// ============================================================================
// CORE RISK CALCULATION
// ============================================================================
/**
 * Calculate the maximum detection level allowed for this leader/location/strategy.
 *
 * Formula:
 * - Without PARANOID: threshold + maxDetectionOverThreshold
 * - With PARANOID: threshold + maxDetectionWithParanoid
 * - During GRAND_INSURRECTION prep: threshold only (no tolerance)
 */
function calculateMaxAllowedDetection(leader, location, governor, strategy, isPreparingGrandInsurrection) {
    const threshold = (0, detectionLevelService_1.calculateDetectionThreshold)(leader, location);
    // During GRAND_INSURRECTION prep, cannot exceed threshold (to avoid being trapped)
    if (isPreparingGrandInsurrection) {
        return threshold;
    }
    // Check for PARANOID governor
    const hasParanoid = governor?.stats?.ability?.includes('PARANOID') ?? false;
    const allowedOver = hasParanoid
        ? strategy.maxDetectionWithParanoid
        : strategy.maxDetectionOverThreshold;
    return threshold + allowedOver;
}
/**
 * Perform a complete risk assessment for a clandestine agent.
 */
function assessRisk(context) {
    const { leader, location, governor, strategy, isPreparingGrandInsurrection } = context;
    const currentDetectionLevel = leader.detectionLevel ?? 0;
    const effectiveThreshold = (0, detectionLevelService_1.calculateDetectionThreshold)(leader, location);
    const maxAllowedDetection = calculateMaxAllowedDetection(leader, location, governor, strategy, isPreparingGrandInsurrection);
    const currentCaptureRisk = (0, detectionLevelService_1.calculateCaptureRisk)(leader, location, governor);
    const hasParanoidGovernor = governor?.stats?.ability?.includes('PARANOID') ?? false;
    const isHuntNetworksActive = location.governorPolicies?.HUNT_NETWORKS === true;
    // Determine if should exfiltrate
    let shouldExfiltrate = false;
    let exfiltrationReason;
    // Never exfiltrate during GRAND_INSURRECTION prep
    if (!isPreparingGrandInsurrection) {
        // Check capture risk against maximum allowed
        const maxRiskPercent = strategy.maxCaptureRisk * 100;
        if (currentCaptureRisk > maxRiskPercent) {
            shouldExfiltrate = true;
            exfiltrationReason = 'ai.clandestine.exfiltrateRisk';
        }
        else if (currentDetectionLevel > maxAllowedDetection) {
            // This shouldn't happen if we're managing actions correctly,
            // but serves as a safety check
            shouldExfiltrate = true;
            exfiltrationReason = 'ai.clandestine.exfiltrateDetection';
        }
    }
    return {
        currentDetectionLevel,
        effectiveThreshold,
        maxAllowedDetection,
        currentCaptureRisk,
        hasParanoidGovernor,
        isHuntNetworksActive,
        shouldExfiltrate,
        exfiltrationReason
    };
}
// ============================================================================
// ACTION SELECTION
// ============================================================================
/**
 * Calculate risk info for a single action.
 */
function getActionRiskInfo(actionId, context, assessment) {
    const actionDef = clandestineTypes_1.CLANDESTINE_ACTIONS[actionId];
    const detectionIncrease = actionDef?.detectionIncrease ?? 0;
    const detectionType = actionDef?.detectionType ?? 'per_turn';
    const costPerTurn = actionDef?.costPerTurn ?? 0;
    // Project detection after this action
    const projectedDetection = assessment.currentDetectionLevel + detectionIncrease;
    // Project capture risk after this action
    const riskFromDetection = Math.max(0, projectedDetection - assessment.effectiveThreshold);
    const paranoidBonus = assessment.hasParanoidGovernor ? 15 : 0;
    const projectedCaptureRisk = riskFromDetection + paranoidBonus;
    // Check if this would exceed limits
    const wouldExceedLimit = projectedDetection > assessment.maxAllowedDetection ||
        projectedCaptureRisk > (context.strategy.maxCaptureRisk * 100);
    return {
        actionId,
        detectionIncrease,
        detectionType,
        costPerTurn,
        wouldExceedLimit,
        projectedDetection,
        projectedCaptureRisk
    };
}
/**
 * Calculate total detection increase from a set of per-turn actions.
 */
function calculateTotalPerTurnDetection(actions) {
    let total = 0;
    for (const action of actions) {
        const actionDef = clandestineTypes_1.CLANDESTINE_ACTIONS[action.actionId];
        if (actionDef && actionDef.detectionType === 'per_turn') {
            total += actionDef.detectionIncrease;
        }
    }
    return total;
}
/**
 * Project the detection level after next turn with proposed actions.
 *
 * @param leader Current leader state
 * @param proposedActions Actions to be active next turn
 * @returns Projected detection level
 */
function projectDetectionAfterTurn(leader, proposedActions) {
    const currentLevel = leader.detectionLevel ?? 0;
    const perTurnIncrease = calculateTotalPerTurnDetection(proposedActions);
    return currentLevel + perTurnIncrease;
}
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
function selectActionsWithinRiskBudget(candidateActions, context, assessment, mandatoryActions = [], budget) {
    const selected = [];
    const reasoning = [];
    let accumulatedDetection = assessment.currentDetectionLevel;
    let remainingBudget = budget;
    // First, handle mandatory actions
    for (const actionId of mandatoryActions) {
        const actionDef = clandestineTypes_1.CLANDESTINE_ACTIONS[actionId];
        if (!actionDef)
            continue;
        const cost = actionDef.costPerTurn;
        if (cost > remainingBudget) {
            reasoning.push(`Cannot afford mandatory ${actionId} (need ${cost}, have ${remainingBudget})`);
            continue;
        }
        selected.push(actionId);
        accumulatedDetection += actionDef.detectionIncrease;
        remainingBudget -= cost;
        reasoning.push(`Added mandatory ${actionId} (trait requirement)`);
    }
    // Then add optional actions in priority order
    for (const actionId of candidateActions) {
        if (selected.includes(actionId))
            continue;
        const actionDef = clandestineTypes_1.CLANDESTINE_ACTIONS[actionId];
        if (!actionDef)
            continue;
        const cost = actionDef.costPerTurn + (actionDef.isOneTime ? (actionDef.costPerTurn || 0) : 0);
        // Budget check
        if (cost > remainingBudget) {
            reasoning.push(`Skip ${actionId}: insufficient budget (need ${cost}, have ${remainingBudget})`);
            continue;
        }
        // Risk check
        const projectedDetection = accumulatedDetection + actionDef.detectionIncrease;
        if (projectedDetection > assessment.maxAllowedDetection) {
            reasoning.push(`Skip ${actionId}: would exceed detection limit (${projectedDetection} > ${assessment.maxAllowedDetection})`);
            continue;
        }
        // Capture risk check
        const riskFromDetection = Math.max(0, projectedDetection - assessment.effectiveThreshold);
        const paranoidBonus = assessment.hasParanoidGovernor ? 15 : 0;
        const projectedRisk = riskFromDetection + paranoidBonus;
        const maxRisk = context.strategy.maxCaptureRisk * 100;
        if (projectedRisk > maxRisk) {
            reasoning.push(`Skip ${actionId}: would exceed risk limit (${projectedRisk}% > ${maxRisk}%)`);
            continue;
        }
        // Action is acceptable
        selected.push(actionId);
        accumulatedDetection = projectedDetection;
        remainingBudget -= cost;
        reasoning.push(`Added ${actionId} (detection: ${projectedDetection}, risk: ${projectedRisk}%)`);
        // Limit to 4 actions max
        if (selected.length >= 4)
            break;
    }
    return { selected, reasoning };
}
// ============================================================================
// EXFILTRATION DECISION
// ============================================================================
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
function shouldExfiltrateLeader(context, budget, canPerformAnyAction) {
    const { leader, location, governor, strategy, isPreparingGrandInsurrection } = context;
    // NEVER exfiltrate during GRAND_INSURRECTION preparation
    if (isPreparingGrandInsurrection) {
        return { shouldExfiltrate: false };
    }
    // Check budget
    if (budget <= 0) {
        return { shouldExfiltrate: true, reason: 'ai.clandestine.exfiltrateBudget' };
    }
    // Check capture risk
    const captureRisk = (0, detectionLevelService_1.calculateCaptureRisk)(leader, location, governor);
    const maxRiskPercent = strategy.maxCaptureRisk * 100;
    if (captureRisk > maxRiskPercent) {
        return { shouldExfiltrate: true, reason: 'ai.clandestine.exfiltrateRisk' };
    }
    // Check if any action is possible
    if (!canPerformAnyAction) {
        return { shouldExfiltrate: true, reason: 'ai.clandestine.exfiltrateNoActions' };
    }
    return { shouldExfiltrate: false };
}
// ============================================================================
// LOGGING HELPERS
// ============================================================================
/**
 * Generate a human-readable risk summary for logging.
 */
function formatRiskSummary(assessment) {
    const parts = [
        `Detection: ${assessment.currentDetectionLevel}/${assessment.effectiveThreshold}`,
        `Max allowed: ${assessment.maxAllowedDetection}`,
        `Risk: ${assessment.currentCaptureRisk}%`
    ];
    if (assessment.hasParanoidGovernor) {
        parts.push('PARANOID');
    }
    if (assessment.isHuntNetworksActive) {
        parts.push('HUNT_NETWORKS');
    }
    return parts.join(', ');
}
