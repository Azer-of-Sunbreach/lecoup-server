/**
 * Clandestine Role - AI decision logic for undercover agents
 * 
 * Handles action selection for clandestine agents based on:
 * - Current risk level and faction thresholds
 * - GRAND_INSURRECTION opportunities
 * - Budget constraints
 * - Leader traits (SCORCHED_EARTH, FAINT_HEARTED, FIREBRAND)
 * 
 * @module shared/services/ai/leaders/roles
 */

import { Character, Location, FactionId, Army, CharacterStatus } from '../../../../types';
import {
    ClandestineActionId,
    ActiveClandestineAction,
    CLANDESTINE_ACTIONS,
    CLANDESTINE_ACTION_COSTS,
    CLANDESTINE_ACTION_RISKS
} from '../../../../types/clandestineTypes';
import {
    ClandestineDecision,
    FactionStrategy,
    ClandestineOpportunity,
    CLANDESTINE_BUDGET,
    GRAND_INSURRECTION_PREP_TURNS
} from '../types';
import { calculateDetectionThreshold, calculateCaptureRisk } from '../../../domain/clandestine/detectionLevelService';
import {
    assessRisk,
    shouldExfiltrateLeader,
    selectActionsWithinRiskBudget,
    formatRiskSummary,
    RiskContext,
    RiskAssessment
} from '../utils/AIRiskDecisionService';

// ============================================================================
// TYPES
// ============================================================================

interface ClandestineContext {
    leader: Character;
    location: Location;
    faction: FactionId;
    strategy: FactionStrategy;
    budget: number;
    /** @deprecated Use riskAssessment instead */
    currentRisk: number;
    activeActions: ActiveClandestineAction[];
    turn: number;
    governor?: Character;
    garrison: number;
    isPreparingInsurrection: boolean;
    /** New detection-level based risk assessment */
    riskAssessment: RiskAssessment;
}

interface ActionScore {
    actionId: ClandestineActionId;
    score: number;
    reasoning: string;
    costPerTurn: number;
    oneTimeCost: number;
    addedRisk: number;
    blockedReason?: string;
}

// ============================================================================
// MAIN DECISION FUNCTION
// ============================================================================

/**
 * Generate clandestine decisions for an undercover agent.
 */
export function makeClandestineDecisions(
    leader: Character,
    location: Location,
    faction: FactionId,
    strategy: FactionStrategy,
    budget: number,
    turn: number,
    armies: Army[],
    characters: Character[],
    opportunity?: ClandestineOpportunity
): ClandestineDecision {
    // Calculate current state
    const activeActions = leader.activeClandestineActions || [];
    const garrison = armies
        .filter(a => a.locationId === location.id && a.faction === location.faction)
        .reduce((sum, a) => sum + a.strength, 0);

    const governor = characters.find(c =>
        c.locationId === location.id &&
        c.faction === location.faction &&
        c.status === CharacterStatus.GOVERNING
    );

    const isPreparingInsurrection = activeActions.some(
        a => a.actionId === ClandestineActionId.PREPARE_GRAND_INSURRECTION
    );

    // Build risk context for new detection-level based assessment
    const riskContext: RiskContext = {
        leader,
        location,
        governor,
        strategy,
        isPreparingGrandInsurrection: isPreparingInsurrection
    };

    // Perform risk assessment using new detection-level model
    const riskAssessment = assessRisk(riskContext);

    // Calculate legacy risk for backward compatibility (deprecated, will be removed)
    const currentRisk = calculateCaptureRisk(leader, location, governor) / 100;

    const context: ClandestineContext = {
        leader,
        location,
        faction,
        strategy,
        budget,
        currentRisk,
        activeActions,
        turn,
        governor,
        garrison,
        isPreparingInsurrection,
        riskAssessment
    };

    const reasoning: string[] = [];
    const actionsToStart: ClandestineActionId[] = [];
    const actionsToStop: ClandestineActionId[] = [];
    let goldToAllocate: number | undefined;

    // Log current risk state
    reasoning.push(`Risk: ${formatRiskSummary(riskAssessment)}`);

    // 1. Check if should exfiltrate (using new detection-level model)
    // Calculate if any action is possible within constraints
    const mandatoryActions = getMandatoryActions(leader, location.type);
    const blockedActions = getBlockedActions(leader);
    const actionScores = scoreAllActions(context, opportunity, mandatoryActions, blockedActions);
    const possibleActions = actionScores.filter(s => s.score > 0 && !blockedActions.includes(s.actionId));
    const canPerformAnyAction = possibleActions.length > 0 && budget > 0;

    const exfiltrationDecision = shouldExfiltrateLeader(riskContext, budget, canPerformAnyAction);

    if (exfiltrationDecision.shouldExfiltrate) {
        return {
            leaderId: leader.id,
            targetLocationId: location.id,
            actionsToStart: [],
            actionsToStop: activeActions.map(a => a.actionId as ClandestineActionId),
            shouldExfiltrate: true,
            shouldGoDark: false,
            reasoning: [
                `EXFILTRATE: ${exfiltrationDecision.reason || 'Risk too high'}`,
                `${formatRiskSummary(riskAssessment)}`
            ]
        };
    }

    // 2. Select optimal actions within risk constraints (no more binary GO_DARK)
    // The new model progressively reduces actions rather than stopping all at once
    const selectedActions = selectOptimalActionsWithDetection(
        context,
        actionScores,
        mandatoryActions,
        riskAssessment
    );

    // 3. Determine changes
    const currentActionIds = new Set(activeActions.map(a => a.actionId));

    for (const actionId of selectedActions) {
        if (!currentActionIds.has(actionId)) {
            actionsToStart.push(actionId);
            const scoreInfo = actionScores.find(s => s.actionId === actionId);
            reasoning.push(`Start ${actionId}: ${scoreInfo?.reasoning || 'Optimal choice'}`);

            // Handle gold allocation for GRAND_INSURRECTION
            if (actionId === ClandestineActionId.PREPARE_GRAND_INSURRECTION) {
                goldToAllocate = Math.min(budget, CLANDESTINE_BUDGET.MAX);
            }
        }
    }

    // 4. Stop actions that are no longer selected
    // During GI prep, only stop actions that would exceed threshold
    for (const action of activeActions) {
        const actionId = action.actionId as ClandestineActionId;
        if (selectedActions.includes(actionId)) continue;
        if (actionId === ClandestineActionId.PREPARE_GRAND_INSURRECTION) continue; // Never stop GI

        // If this action is no longer in selected, it was dropped due to risk/budget
        actionsToStop.push(actionId);
        reasoning.push(`Stop ${actionId}: exceeds risk/budget constraints`);
    }

    // Determine if we're in a reduced activity state (for UI purposes)
    const isReducingActivity = actionsToStop.length > 0 && !exfiltrationDecision.shouldExfiltrate;

    return {
        leaderId: leader.id,
        targetLocationId: location.id,
        actionsToStart,
        actionsToStop,
        goldToAllocate,
        shouldExfiltrate: false,
        shouldGoDark: isReducingActivity,
        reasoning
    };
}

// ============================================================================
// TRAIT HANDLING
// ============================================================================

/**
 * Get actions that are mandatory due to leader traits.
 */
function getMandatoryActions(
    leader: Character,
    locationType: 'CITY' | 'RURAL'
): ClandestineActionId[] {
    const mandatory: ClandestineActionId[] = [];

    // SCORCHED_EARTH forces destructive actions
    if (leader.stats?.traits?.includes('SCORCHED_EARTH')) {
        if (locationType === 'CITY') {
            mandatory.push(ClandestineActionId.START_URBAN_FIRE);
        } else {
            mandatory.push(ClandestineActionId.BURN_CROP_FIELDS);
        }
        mandatory.push(ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS);
    }

    return mandatory;
}

/**
 * Get actions that are blocked by leader traits.
 */
function getBlockedActions(leader: Character): ClandestineActionId[] {
    const blocked: ClandestineActionId[] = [];

    // FAINT_HEARTED blocks violent actions
    if (leader.stats?.traits?.includes('FAINT_HEARTED')) {
        blocked.push(ClandestineActionId.ASSASSINATE_LEADER);
        blocked.push(ClandestineActionId.BURN_CROP_FIELDS);
        blocked.push(ClandestineActionId.START_URBAN_FIRE);
    }

    return blocked;
}

// ============================================================================
// ACTION SCORING
// ============================================================================

/**
 * Score all available clandestine actions.
 */
function scoreAllActions(
    context: ClandestineContext,
    opportunity: ClandestineOpportunity | undefined,
    mandatoryActions: ClandestineActionId[],
    blockedActions: ClandestineActionId[]
): ActionScore[] {
    const scores: ActionScore[] = [];
    const { leader, location, budget, strategy, isPreparingInsurrection } = context;

    const clandestineOps = leader.stats?.clandestineOps || 3;
    const hasFirebrand = leader.stats?.ability?.includes('FIREBRAND') || false;

    // =========================================================================
    // PREPARE_GRAND_INSURRECTION - Highest priority action
    // =========================================================================
    {
        let score = 0;
        let reasoning = '';
        const cost = 100; // Minimum

        if (blockedActions.includes(ClandestineActionId.PREPARE_GRAND_INSURRECTION)) {
            score = -1000;
            reasoning = 'Blocked by trait';
        } else if (isPreparingInsurrection) {
            score = -100; // Already preparing
            reasoning = 'Already in preparation';
        } else if (opportunity && !opportunity.blockedByLegendary) {
            // High score if good opportunity exists
            score = opportunity.score;
            reasoning = `Good target: ${opportunity.estimatedInsurgents} insurgents expected`;

            // FIREBRAND bonus (+33% insurgents)
            if (hasFirebrand) {
                score += 30;
                reasoning += ' (FIREBRAND +33%)';
            }

            // Population bonus
            if (location.population > 100000) {
                score += 20;
            }

            // CRITICAL: Risk assessment - will we likely die?
            // If garrison > expected insurgents, this is suicide!
            if (context.garrison > opportunity.estimatedInsurgents * 0.8) {
                score -= 50;
                reasoning += ' BUT garrison too strong - high death risk';
            }

            // Check budget
            if (budget < cost) {
                score = -100;
                reasoning = 'Insufficient budget';
            }
        } else if (opportunity?.blockedByLegendary) {
            score = -100;
            reasoning = 'Blocked by LEGENDARY leader';
        } else {
            // NO opportunity score - don't rush into GRAND_INSURRECTION
            // Prefer destabilization actions first (INCITE_NEUTRAL, UNDERMINE, etc.)
            score = 20; // Low priority - destabilize first
            reasoning = 'No favorable condition - destabilize first';
        }

        scores.push({
            actionId: ClandestineActionId.PREPARE_GRAND_INSURRECTION,
            score,
            reasoning,
            costPerTurn: 0,
            oneTimeCost: cost,
            addedRisk: CLANDESTINE_ACTION_RISKS[ClandestineActionId.PREPARE_GRAND_INSURRECTION] * 0.1
        });
    }

    // =========================================================================
    // UNDERMINE_AUTHORITIES - Foundation action
    // =========================================================================
    {
        let score = 0;
        let reasoning = '';
        const cost = CLANDESTINE_ACTION_COSTS[ClandestineActionId.UNDERMINE_AUTHORITIES] || 20;

        if (blockedActions.includes(ClandestineActionId.UNDERMINE_AUTHORITIES)) {
            score = -1000;
            reasoning = 'Blocked by trait';
        } else {
            // Higher priority if stability is high (need to destabilize)
            score = 50 + (location.stability / 2); // Higher stability = more valuable
            reasoning = 'Destabilize territory';

            // Good synergy before GRAND_INSURRECTION
            if (!isPreparingInsurrection && opportunity) {
                score += 20;
                reasoning += ' (prep for insurrection)';
            }

            // Budget check
            if (budget < cost) {
                score = -100;
                reasoning = 'Insufficient budget';
            }
        }

        scores.push({
            actionId: ClandestineActionId.UNDERMINE_AUTHORITIES,
            score,
            reasoning,
            costPerTurn: cost,
            oneTimeCost: 0,
            addedRisk: CLANDESTINE_ACTION_RISKS[ClandestineActionId.UNDERMINE_AUTHORITIES] * 0.1
        });
    }

    // =========================================================================
    // DISTRIBUTE_PAMPHLETS - Propaganda
    // =========================================================================
    {
        let score = 0;
        let reasoning = '';
        const cost = CLANDESTINE_ACTION_COSTS[ClandestineActionId.DISTRIBUTE_PAMPHLETS] || 10;

        if (blockedActions.includes(ClandestineActionId.DISTRIBUTE_PAMPHLETS)) {
            score = -1000;
            reasoning = 'Blocked by trait';
        } else {
            // Lower resentment against us = more valuable
            const ourResentment = (location.resentment as Record<string, number>)?.[context.faction] || 50;
            score = 40 + (ourResentment / 2); // Higher resentment = more need
            reasoning = 'Reduce resentment against our faction';

            if (budget < cost) {
                score = -100;
                reasoning = 'Insufficient budget';
            }
        }

        scores.push({
            actionId: ClandestineActionId.DISTRIBUTE_PAMPHLETS,
            score,
            reasoning,
            costPerTurn: cost,
            oneTimeCost: 0,
            addedRisk: CLANDESTINE_ACTION_RISKS[ClandestineActionId.DISTRIBUTE_PAMPHLETS] * 0.1
        });
    }

    // =========================================================================
    // SPREAD_PROPAGANDA - Increase enemy resentment
    // =========================================================================
    {
        let score = 0;
        let reasoning = '';
        const cost = CLANDESTINE_ACTION_COSTS[ClandestineActionId.SPREAD_PROPAGANDA] || 10;

        if (blockedActions.includes(ClandestineActionId.SPREAD_PROPAGANDA)) {
            score = -1000;
            reasoning = 'Blocked by trait';
        } else if (clandestineOps < 2) {
            score = -100;
            reasoning = 'Requires clandestineOps level 2';
        } else {
            // Lower resentment against enemy = more valuable
            const enemyResentment = (location.resentment as Record<string, number>)?.[location.faction] || 50;
            score = 30 + ((100 - enemyResentment) / 3);
            reasoning = 'Increase resentment against occupiers';

            if (budget < cost) {
                score = -100;
                reasoning = 'Insufficient budget';
            }
        }

        scores.push({
            actionId: ClandestineActionId.SPREAD_PROPAGANDA,
            score,
            reasoning,
            costPerTurn: cost,
            oneTimeCost: 0,
            addedRisk: CLANDESTINE_ACTION_RISKS[ClandestineActionId.SPREAD_PROPAGANDA] * 0.1
        });
    }

    // =========================================================================
    // INCITE_NEUTRAL_INSURRECTIONS - Minor insurrections
    // =========================================================================
    {
        let score = 0;
        let reasoning = '';
        const cost = CLANDESTINE_ACTION_COSTS[ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS] || 50;

        if (blockedActions.includes(ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS)) {
            score = -1000;
            reasoning = 'Blocked by trait';
        } else if (clandestineOps < 3) {
            score = -100;
            reasoning = 'Requires clandestineOps level 3';
        } else if (mandatoryActions.includes(ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS)) {
            score = 100; // Forced by SCORCHED_EARTH
            reasoning = 'Forced by SCORCHED_EARTH trait';
        } else {
            // INCITE_NEUTRAL_INSURRECTIONS is VERY effective in cities
            // Formula: generates insurgents based on population and stability
            // In cities, this is often BETTER than GRAND_INSURRECTION!
            if (location.type === 'CITY') {
                score = 90; // Very high priority in cities
                reasoning = 'INCITE_NEUTRAL is highly effective in cities';
            } else if (location.stability < 50) {
                score = 70;
                reasoning = 'Territory unstable - insurrection likely to succeed';
            } else {
                score = 40;
                reasoning = 'Cause chaos to weaken enemy';
            }

            // Bonus if garrison is weak (insurrection will succeed)
            if (context.garrison < 500) {
                score += 20;
                reasoning += ' (weak garrison)';
            }

            // Only need one turn of cost reserve (50g minimum)
            if (budget < cost) {
                score = -100;
                reasoning = 'Insufficient budget';
            }
        }

        scores.push({
            actionId: ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS,
            score,
            reasoning,
            costPerTurn: cost,
            oneTimeCost: 0,
            addedRisk: CLANDESTINE_ACTION_RISKS[ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS] * 0.1
        });
    }

    // =========================================================================
    // ATTACK_TAX_CONVOYS - Self-financing
    // =========================================================================
    {
        let score = 0;
        let reasoning = '';

        if (blockedActions.includes(ClandestineActionId.ATTACK_TAX_CONVOYS)) {
            score = -1000;
            reasoning = 'Blocked by trait';
        } else if (clandestineOps < 2) {
            score = -100;
            reasoning = 'Requires clandestineOps level 2';
        } else {
            // Good if low on budget (self-financing)
            if (budget < 200) {
                score = 70;
                reasoning = 'Self-financing when low on budget';
            } else {
                score = 40;
                reasoning = 'Economic disruption';
            }
        }

        scores.push({
            actionId: ClandestineActionId.ATTACK_TAX_CONVOYS,
            score,
            reasoning,
            costPerTurn: 0,
            oneTimeCost: 0,
            addedRisk: CLANDESTINE_ACTION_RISKS[ClandestineActionId.ATTACK_TAX_CONVOYS] * 0.1
        });
    }

    // =========================================================================
    // STEAL_FROM_GRANARIES - Sabotage food supply
    // =========================================================================
    {
        let score = 0;
        let reasoning = '';

        if (blockedActions.includes(ClandestineActionId.STEAL_FROM_GRANARIES)) {
            score = -1000;
            reasoning = 'Blocked by trait';
        } else if (clandestineOps < 2) {
            score = -100;
            reasoning = 'Requires clandestineOps level 2';
        } else {
            score = 35;
            reasoning = 'Disrupt food supply';
        }

        scores.push({
            actionId: ClandestineActionId.STEAL_FROM_GRANARIES,
            score,
            reasoning,
            costPerTurn: 0,
            oneTimeCost: 0,
            addedRisk: CLANDESTINE_ACTION_RISKS[ClandestineActionId.STEAL_FROM_GRANARIES] * 0.1
        });
    }

    // =========================================================================
    // BURN_CROP_FIELDS / START_URBAN_FIRE - Destructive actions
    // =========================================================================
    const burnAction = location.type === 'CITY'
        ? ClandestineActionId.START_URBAN_FIRE
        : ClandestineActionId.BURN_CROP_FIELDS;

    {
        let score = 0;
        let reasoning = '';
        const cost = CLANDESTINE_ACTION_COSTS[burnAction] || 25;

        if (blockedActions.includes(burnAction)) {
            score = -1000;
            reasoning = 'Blocked by FAINT_HEARTED trait';
        } else if (clandestineOps < 3) {
            score = -100;
            reasoning = 'Requires clandestineOps level 3';
        } else if (mandatoryActions.includes(burnAction)) {
            score = 100; // Forced by SCORCHED_EARTH
            reasoning = 'Forced by SCORCHED_EARTH trait';
        } else {
            score = 25;
            reasoning = 'Economic destruction';

            if (budget < cost) {
                score = -100;
                reasoning = 'Insufficient budget for one-time cost';
            }
        }

        scores.push({
            actionId: burnAction,
            score,
            reasoning,
            costPerTurn: 0,
            oneTimeCost: cost,
            addedRisk: CLANDESTINE_ACTION_RISKS[burnAction] * 0.1
        });
    }

    return scores.sort((a, b) => b.score - a.score);
}

/**
 * Select optimal actions within budget and risk constraints.
 * @deprecated Use selectOptimalActionsWithDetection instead
 */
function selectOptimalActions(
    context: ClandestineContext,
    actionScores: ActionScore[],
    mandatoryActions: ClandestineActionId[]
): ClandestineActionId[] {
    const selected: ClandestineActionId[] = [...mandatoryActions];
    let remainingBudget = context.budget;
    let projectedRisk = context.currentRisk;

    // Already active actions that are positive should be kept
    const currentActionIds = context.activeActions.map(a => a.actionId as ClandestineActionId);
    for (const actionId of currentActionIds) {
        const scoreInfo = actionScores.find(s => s.actionId === actionId);
        if (scoreInfo && scoreInfo.score > 0 && !selected.includes(actionId)) {
            selected.push(actionId);
            remainingBudget -= scoreInfo.costPerTurn;
        }
    }

    // Add new actions by score
    for (const scoreInfo of actionScores) {
        if (scoreInfo.score <= 0) continue;
        if (selected.includes(scoreInfo.actionId)) continue;

        // Budget check
        const totalCost = scoreInfo.costPerTurn + scoreInfo.oneTimeCost;
        if (totalCost > remainingBudget) continue;

        // Risk check - don't exceed strategy threshold
        if (projectedRisk + scoreInfo.addedRisk > context.strategy.maxClandestineRisk) {
            // Allow if score is very high (opportunity too good to pass)
            if (scoreInfo.score < 80) continue;
        }

        // Limit to 3-4 actions max for manageability
        if (selected.length >= 4) break;

        selected.push(scoreInfo.actionId);
        remainingBudget -= totalCost;
        projectedRisk += scoreInfo.addedRisk;
    }

    return selected;
}

/**
 * Select optimal actions within budget and DETECTION-LEVEL constraints.
 * 
 * This is the new detection-level based version that:
 * - Projects detection level increases per action
 * - Respects threshold + tolerance limits
 * - Handles GRAND_INSURRECTION prep specially (threshold only, no tolerance)
 */
function selectOptimalActionsWithDetection(
    context: ClandestineContext,
    actionScores: ActionScore[],
    mandatoryActions: ClandestineActionId[],
    riskAssessment: RiskAssessment
): ClandestineActionId[] {
    const selected: ClandestineActionId[] = [];
    let remainingBudget = context.budget;
    let projectedDetection = riskAssessment.currentDetectionLevel;

    const maxAllowed = riskAssessment.maxAllowedDetection;
    const maxCaptureRisk = context.strategy.maxCaptureRisk * 100;

    // First, add mandatory actions (from traits like SCORCHED_EARTH)
    for (const actionId of mandatoryActions) {
        const actionDef = CLANDESTINE_ACTIONS[actionId];
        if (!actionDef) continue;

        const cost = actionDef.costPerTurn;
        if (cost <= remainingBudget) {
            selected.push(actionId);
            projectedDetection += actionDef.detectionIncrease;
            remainingBudget -= cost;
        }
    }

    // Then, try to keep active actions that are still valid
    for (const action of context.activeActions) {
        const actionId = action.actionId as ClandestineActionId;
        if (selected.includes(actionId)) continue;

        // Never drop GRAND_INSURRECTION
        if (actionId === ClandestineActionId.PREPARE_GRAND_INSURRECTION) {
            selected.push(actionId);
            continue;
        }

        const scoreInfo = actionScores.find(s => s.actionId === actionId);
        if (!scoreInfo || scoreInfo.score <= 0) continue;

        const actionDef = CLANDESTINE_ACTIONS[actionId];
        if (!actionDef) continue;

        const cost = actionDef.costPerTurn;
        const detectionIncrease = actionDef.detectionType === 'per_turn' ? actionDef.detectionIncrease : 0;

        // Budget check
        if (cost > remainingBudget) continue;

        // Detection limit check
        const newDetection = projectedDetection + detectionIncrease;
        if (newDetection > maxAllowed) continue;

        // Capture risk check
        const riskFromDetection = Math.max(0, newDetection - riskAssessment.effectiveThreshold);
        const paranoidBonus = riskAssessment.hasParanoidGovernor ? 15 : 0;
        const projectedRisk = riskFromDetection + paranoidBonus;
        if (projectedRisk > maxCaptureRisk) continue;

        // Action is acceptable - keep it
        selected.push(actionId);
        projectedDetection = newDetection;
        remainingBudget -= cost;
    }

    // Finally, try to add new actions by score (if not at limit)
    for (const scoreInfo of actionScores) {
        if (selected.length >= 4) break;
        if (scoreInfo.score <= 0) continue;
        if (selected.includes(scoreInfo.actionId)) continue;

        const actionDef = CLANDESTINE_ACTIONS[scoreInfo.actionId];
        if (!actionDef) continue;

        const cost = actionDef.costPerTurn + (actionDef.isOneTime ? 0 : 0);
        const detectionIncrease = actionDef.detectionType === 'per_turn' ? actionDef.detectionIncrease : 0;

        // Budget check
        if (cost > remainingBudget) continue;

        // Detection limit check
        const newDetection = projectedDetection + detectionIncrease;
        if (newDetection > maxAllowed) continue;

        // Capture risk check
        const riskFromDetection = Math.max(0, newDetection - riskAssessment.effectiveThreshold);
        const paranoidBonus = riskAssessment.hasParanoidGovernor ? 15 : 0;
        const projectedRisk = riskFromDetection + paranoidBonus;
        if (projectedRisk > maxCaptureRisk) continue;

        // Action is acceptable - add it
        selected.push(scoreInfo.actionId);
        projectedDetection = newDetection;
        remainingBudget -= cost;
    }

    return selected;
}

// ============================================================================
// OPPORTUNITY EVALUATION
// ============================================================================

/**
 * Evaluate a location as a GRAND_INSURRECTION target.
 */
export function evaluateClandestineOpportunity(
    location: Location,
    leader: Character,
    armies: Army[],
    characters: Character[],
    faction: FactionId
): ClandestineOpportunity {
    // Check for LEGENDARY blocker
    const hasLegendary = characters.some(c =>
        c.locationId === location.id &&
        c.faction === location.faction &&
        c.stats?.ability?.includes('LEGENDARY')
    );

    // Check for MAKE_EXAMPLES policy
    const hasMakeExamples = location.governorPolicies?.MAKE_EXAMPLES === true;

    // Calculate stability shock potential
    const clandestineOps = leader.stats?.clandestineOps || 3;
    const stabilityShock = clandestineOps * 4;
    const effectiveStability = Math.max(0, location.stability - stabilityShock);

    // Calculate estimated insurgents
    const goldInvested = 400; // Assume standard investment
    const stabilityFactor = 100 - effectiveStability;
    const ownerResentment = (location.resentment as Record<string, number> | undefined)?.[location.faction] || 50;
    const actorResentment = (location.resentment as Record<string, number> | undefined)?.[faction] || 50;
    const resentmentFactor = 1 + (ownerResentment / 100) - (actorResentment / 100);

    let insurgents = ((goldInvested / 25) * (location.population / 100000))
        * stabilityFactor
        * resentmentFactor;

    // FIREBRAND bonus
    if (leader.stats?.ability?.includes('FIREBRAND')) {
        insurgents *= 1.33;
    }

    insurgents = Math.floor(insurgents) + 100;

    // Calculate garrison
    const garrison = armies
        .filter(a => a.locationId === location.id && a.faction === location.faction)
        .reduce((sum, a) => sum + a.strength, 0);

    // Score calculation
    let score = 0;

    // Population factor (bigger targets = better)
    score += (location.population / 10000);

    // Insurgent count advantage
    if (insurgents > garrison) {
        score += 50 + ((insurgents - garrison) / 100);
    } else {
        score -= 20; // Still might want to cause chaos
    }

    // Low stability = easier
    score += (100 - location.stability) / 2;

    // Blockers reduce score heavily
    if (hasLegendary) {
        score = -100;
    }
    if (hasMakeExamples) {
        score -= 30;
    }

    // Calculate current risk using new detection-level model
    const governor = characters.find(c =>
        c.locationId === location.id &&
        c.faction === location.faction &&
        c.status === CharacterStatus.GOVERNING
    );

    // Use new detection-level based capture risk calculation
    // Leader starts with 0 detection, so initial risk is just PARANOID bonus (if any)
    const hasParanoidGovernor = governor?.stats?.ability?.includes('PARANOID') ?? false;
    const currentRisk = hasParanoidGovernor ? 0.15 : 0; // 15% if PARANOID, 0% otherwise

    return {
        locationId: location.id,
        locationName: location.name,
        estimatedInsurgents: Math.round(insurgents),
        stabilityShockPotential: stabilityShock,
        goldRequired: goldInvested,
        currentRisk,
        score,
        blockedByLegendary: hasLegendary,
        blockedByMakeExamples: hasMakeExamples
    };
}
