/**
 * Clandestine AI - Decision logic for clandestine agent leaders
 * 
 * Determines which clandestine actions to perform based on:
 * - Current risk level and faction thresholds (GO_DARK / EXFILTRATE)
 * - GRAND_INSURRECTION opportunities and preparation
 * - Leader traits (SCORCHED_EARTH forces actions, FAINT_HEARTED blocks some)
 * - Budget availability
 * 
 * @see AI_LEADER_REFACTORING_SPECS.md Section 8, 11
 */

import { Character, GameState, FactionId, Location, LocationType, CharacterStatus } from '../../../../types';
import { ClandestineActionId, ActiveClandestineAction, CLANDESTINE_ACTIONS, CLANDESTINE_ACTION_COSTS } from '../../../../types/clandestineTypes';
import { GovernorPolicy } from '../../../../types/governorTypes';
import { CharacterTrait, LeaderStatLevel } from '../../../../types/leaderTypes';
import { calculateDetectionRisk } from '../../../domain/clandestine/detectionRisk';
import {
    ClandestineDecision,
    LeaderSituation,
    FactionStrategy,
    RiskDecision,
    CLANDESTINE_BUDGET_LIMITS,
    GRAND_INSURRECTION_PREP_TURNS
} from '../types';
import {
    calculateGrandInsurrectionROI,
    calculateNeutralInsurrectionROI,
    getSortedSupportActions,
    MIN_WORTHWHILE_IPG
} from '../evaluation/roiCalculator';

// ============================================================================
// MAIN DECISION FUNCTION
// ============================================================================

export function makeClandestineDecisions(
    leader: Character,
    situation: LeaderSituation,
    strategy: FactionStrategy,
    state: GameState
): ClandestineDecision {
    const reasoning: string[] = [];
    const actionsToStart: ClandestineActionId[] = [];
    const actionsToStop: ClandestineActionId[] = [];

    const activeActionIds = new Set(situation.activeActions.map(a => a.actionId));
    const budget = situation.budgetRemaining;

    const riskDecision = evaluateRiskDecision(
        situation.currentRisk,
        strategy.riskThresholds,
        situation.isPreparingGrandInsurrection
    );

    if (riskDecision === RiskDecision.EXFILTRATE) {
        const isGrandInsurrectionActive = activeActionIds.has(ClandestineActionId.PREPARE_GRAND_INSURRECTION);

        if (isGrandInsurrectionActive) {
            reasoning.push(`Risk critical but GRAND_INSURRECTION active - HOLDING POSITION`);
            // Do NOT stop Grand Insurrection. Do NOT exfiltrate.
            // Stop other actions to reduce heat? Yes.
            for (const actionId of activeActionIds) {
                if (actionId !== ClandestineActionId.PREPARE_GRAND_INSURRECTION) {
                    actionsToStop.push(actionId as ClandestineActionId);
                }
            }
            // Return CONTINUE effectively for position, but stop others
            return {
                leaderId: leader.id,
                locationId: situation.currentLocation.id,
                riskDecision: RiskDecision.CONTINUE, // Override Exfiltrate
                actionsToStart: [],
                actionsToStop,
                reasoning
            };
        }

        reasoning.push(`Risk ${(situation.currentRisk * 100).toFixed(1)}% > 33% threshold - EXFILTRATING`);
        for (const actionId of activeActionIds) {
            // Should be none left if we checked GI above, but safe practice
            actionsToStop.push(actionId as ClandestineActionId);
        }
        const exfiltrationTarget = findExfiltrationTarget(state, leader, strategy);
        return {
            leaderId: leader.id,
            locationId: situation.currentLocation.id,
            riskDecision,
            actionsToStart: [],
            actionsToStop,
            exfiltrationTargetId: exfiltrationTarget,
            reasoning
        };
    }

    // === HIGH THREAT REACTION LOGIC ===
    // "GO_DARK" - Reduce profile to acceptable levels
    // User Constraint: NEVER stop GRAND_INSURRECTION (unstoppable).
    // Logic: Calculate actual risk of combinations using the formula.
    //        Keep as many actions as possible while staying under the threshold.

    if (riskDecision === RiskDecision.GO_DARK) {
        const threshold = strategy.riskThresholds.goDark;
        reasoning.push(`Risk ${(situation.currentRisk * 100).toFixed(1)}% > ${(threshold * 100).toFixed(1)}% - GO_DARK: Calculating optimal profile`);

        // 1. Identify Immutable Actions (Grand Insurrection)
        const activeActions = situation.activeActions;
        const protectedActions = activeActions.filter(a => a.actionId === ClandestineActionId.PREPARE_GRAND_INSURRECTION);
        const removableActions = activeActions.filter(a => a.actionId !== ClandestineActionId.PREPARE_GRAND_INSURRECTION);

        // 2. Prepare context for risk calculation (Governor, etc.)
        const location = situation.currentLocation;
        // Find governor: Someone with status GOVERNING (corrected from GOVERNOR) at this location
        // Note: CharacterStatus.GOVERNING is the correct enum value from logic analysis (was GOVERNOR in mind, but checking types.ts/CharacterStatus)
        // Checking types.ts: GOVERNING is the correct value.
        const governor = state.characters.find(c => c.status === CharacterStatus.GOVERNING && c.locationId === location.id);

        // Check Counter-Espionage Policy on the location
        const isCounterEspionage = !!location.governorPolicies?.[GovernorPolicy.COUNTER_ESPIONAGE];

        // 3. Simulation Loop
        // Sort removable actions by theoretical risk impact (High to Low)
        const sortedRemovable = removableActions.sort((a, b) => {
            const riskA = CLANDESTINE_ACTIONS[a.actionId]?.detectionRisk || 'LOW';
            const riskB = CLANDESTINE_ACTIONS[b.actionId]?.detectionRisk || 'LOW';
            const riskWeights: Record<string, number> = { 'EXTREME': 4, 'HIGH': 3, 'MODERATE': 2, 'LOW': 1, 'NONE': 0 };
            return riskWeights[riskB] - riskWeights[riskA];
        });

        // Loop: Try removing actions until risk is safe
        // Construct the initial set of actions we WANT to keep (Protected + All Removable)
        let actionsToKeep = [...protectedActions, ...sortedRemovable];

        // Initial simulation
        let currentSimulatedRisk = calculateDetectionRisk(
            location,
            actionsToKeep,
            leader,
            state.armies,
            governor,
            isCounterEspionage
        );

        const toStop: ClandestineActionId[] = [];

        // While risk is too high AND we have removable actions left to cut
        // (We stop if we only have protected actions left)
        while (currentSimulatedRisk > threshold && actionsToKeep.length > protectedActions.length) {
            // Identify the candidate to remove.
            // actionsToKeep looks like: [Protected... , HighRisk... , LowRisk...]
            // The logic above sorted 'sortedRemovable' High->Low.
            // So the FIRST elements after protectedActions are the riskiest.
            // We remove the one at index `protectedActions.length`.

            const candidateToRemove = actionsToKeep[protectedActions.length]; // The first removable (highest risk)

            // Remove from keep list
            actionsToKeep.splice(protectedActions.length, 1);

            // Add to stop list
            toStop.push(candidateToRemove.actionId);

            reasoning.push(`Simulation: Dropping ${candidateToRemove.actionId}...`);

            // Recalculate
            currentSimulatedRisk = calculateDetectionRisk(
                location,
                actionsToKeep,
                leader,
                state.armies,
                governor,
                isCounterEspionage
            );

            reasoning.push(`...New Risk ${(currentSimulatedRisk * 100).toFixed(1)}%`);
        }

        if (currentSimulatedRisk > threshold) {
            reasoning.push(`Warning: Risk ${(currentSimulatedRisk * 100).toFixed(1)}% still > Threshold with minimal actions.`);
            // Nothing more we can do (except Exfiltrate, but that's a different decision branch).
            // We hold the line.
        }

        // Apply results
        actionsToStop.push(...toStop);

        return {
            leaderId: leader.id,
            locationId: situation.currentLocation.id,
            riskDecision,
            actionsToStart, // Empty
            actionsToStop,
            reasoning
        };
    }

    if (riskDecision === RiskDecision.FORCE_INSURRECTION) {
        reasoning.push(`Risk ${(situation.currentRisk * 100).toFixed(1)}% but GRAND_INSURRECTION planned - FORCING`);
        return {
            leaderId: leader.id,
            locationId: situation.currentLocation.id,
            riskDecision,
            actionsToStart: [],
            actionsToStop: [],
            reasoning
        };
    }

    if (leader.stats?.traits?.includes(CharacterTrait.SCORCHED_EARTH)) {
        const scorchedActions = getScorchedEarthActions(situation.currentLocation.type);
        for (const actionId of scorchedActions) {
            if (!activeActionIds.has(actionId) && canAffordAction(actionId, budget)) {
                actionsToStart.push(actionId);
                reasoning.push(`SCORCHED_EARTH forces ${actionId}`);
            }
        }
    }

    const blockedActions = leader.stats?.traits?.includes(CharacterTrait.FAINT_HEARTED)
        ? [ClandestineActionId.ASSASSINATE_LEADER, ClandestineActionId.START_URBAN_FIRE, ClandestineActionId.BURN_CROP_FIELDS]
        : [];

    // === ROI-BASED DECISION MAKING ===
    const location = situation.currentLocation;
    let remainingBudget = budget - estimateRecurringCosts(Array.from(activeActionIds) as ClandestineActionId[]);

    if (!situation.isPreparingGrandInsurrection && remainingBudget >= 100) {
        // Calculate ROI for both major actions
        const grandROI = calculateGrandInsurrectionROI(location, leader, remainingBudget);
        const neutralROI = calculateNeutralInsurrectionROI(location, leader, 3); // Assume 3 turns

        const grandIPG = grandROI.insurgentsPerGold;
        const neutralIPG = neutralROI.insurgentsPerGold;

        reasoning.push(`ROI: Grand=${grandIPG.toFixed(1)} IPG, Neutral=${neutralIPG.toFixed(1)} IPG`);

        // Determine best insurgent action
        // Corrected Logic: Trust the raw ROI. 
        // Neutral Insurrections have a natural advantage in Cities due to divisor (10k vs 100k).
        // No artificial bias needed.

        const shouldNeutral = neutralIPG > grandIPG && neutralIPG >= MIN_WORTHWHILE_IPG;
        const shouldGrand = !shouldNeutral && grandIPG >= MIN_WORTHWHILE_IPG;

        if (shouldNeutral && !blockedActions.includes(ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS)) {
            const leaderOps = leader.stats?.clandestineOps || 1;
            if (leaderOps >= CLANDESTINE_ACTIONS[ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS].requiredOpsLevel) {
                actionsToStart.push(ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS);
                reasoning.push(`Starting INCITE_NEUTRAL (Natural ROI advantage, IPG: ${neutralIPG.toFixed(1)})`);
            }
        } else if (shouldGrand && !blockedActions.includes(ClandestineActionId.PREPARE_GRAND_INSURRECTION)) {
            // Coin flip for budget allocation (300-500g range)
            let investAmount = Math.floor(remainingBudget / 100) * 100;
            if (investAmount >= 300 && investAmount <= 500) {
                // If we also want support actions, keep 100g back
                investAmount -= 100;
                reasoning.push(`Budget split: ${investAmount}g for Grand, 100g for support`);
            }
            // Ensure min 100
            investAmount = Math.max(100, investAmount);

            actionsToStart.push(ClandestineActionId.PREPARE_GRAND_INSURRECTION);
            reasoning.push(`Starting GRAND_INSURRECTION (IPG: ${grandIPG.toFixed(1)}, invest: ${investAmount}g)`);

            return {
                leaderId: leader.id,
                locationId: location.id,
                riskDecision: RiskDecision.CONTINUE,
                actionsToStart,
                actionsToStop,
                goldToInvest: investAmount,
                reasoning
            };
        }
    }

    // === SUPPORT ACTIONS based on priority ===
    const supportPriorities = getSortedSupportActions(location, leader);
    const maxActions = 3;

    for (const { actionId: supportActionId, priority, reason } of supportPriorities) {
        if (activeActionIds.size + actionsToStart.length >= maxActions) break;
        if (activeActionIds.has(supportActionId)) continue;
        if (blockedActions.includes(supportActionId as ClandestineActionId)) continue;
        if (!canAffordAction(supportActionId as ClandestineActionId, remainingBudget)) continue;

        const action = CLANDESTINE_ACTIONS[supportActionId as ClandestineActionId];
        const leaderOps = leader.stats?.clandestineOps || 1;
        if (leaderOps < action.requiredOpsLevel) continue;

        // Don't start Support Actions if we are doing Neutral Insurrection? 
        // No, Neutral Insurrection allows support (it's not exclusive like Start GI might be).

        // Lowered threshold from 30 to 15 to ensure actions are taken
        if (priority >= 15) {
            actionsToStart.push(supportActionId as ClandestineActionId);
            reasoning.push(`Adding ${supportActionId} (priority: ${priority}, ${reason})`);
            remainingBudget -= CLANDESTINE_ACTION_COSTS[supportActionId] || 10;
        }
    }

    return {
        leaderId: leader.id,
        locationId: location.id,
        riskDecision: RiskDecision.CONTINUE,
        actionsToStart,
        actionsToStop,
        reasoning
    };
}

// ============================================================================
// RISK EVALUATION
// ============================================================================

export function evaluateRiskDecision(
    currentRisk: number,
    thresholds: { goDark: number; exfiltrate: number; forceInsurrection: { min: number; max: number } },
    hasInsurrectionPlanned: boolean
): RiskDecision {
    if (currentRisk > thresholds.exfiltrate) {
        return RiskDecision.EXFILTRATE;
    }
    if (hasInsurrectionPlanned) {
        if (currentRisk >= thresholds.forceInsurrection.min &&
            currentRisk <= thresholds.forceInsurrection.max) {
            return RiskDecision.FORCE_INSURRECTION;
        }
    }
    if (currentRisk > thresholds.goDark) {
        if (hasInsurrectionPlanned && currentRisk > thresholds.forceInsurrection.max) {
            return RiskDecision.EXFILTRATE;
        }
        return RiskDecision.GO_DARK;
    }
    return RiskDecision.CONTINUE;
}

// ============================================================================
// GRAND INSURRECTION EVALUATION
// ============================================================================

function evaluateGrandInsurrection(
    situation: LeaderSituation,
    strategy: FactionStrategy,
    state: GameState,
    budget: number
): { start: boolean; score: number; goldToInvest: number } {
    const location = situation.currentLocation;
    if (hasLegendaryBlocker(state, location.id)) {
        return { start: false, score: 0, goldToInvest: 0 };
    }
    const minBudget = calculateMinInsurrectionBudget(location);
    if (budget < minBudget) {
        return { start: false, score: 0, goldToInvest: 0 };
    }

    const leader = situation.leader;
    const clandestineOps = leader.stats?.clandestineOps || LeaderStatLevel.CAPABLE;
    const stabilityShock = clandestineOps * 4;
    const effectiveStability = Math.max(0, location.stability - stabilityShock);
    const goldToInvest = Math.min(budget, 400);
    const estimatedInsurgents = calculateEstimatedInsurgents(
        goldToInvest,
        location.population,
        effectiveStability,
        leader.stats?.ability?.includes('FIREBRAND') || false
    );

    let score = estimatedInsurgents / 50;
    score += location.population / 20000;
    score += (100 - location.stability) * 0.5; // Increased from 0.3
    if (location.type === LocationType.CITY) {
        score += 20;
    }
    // Bonus for high-population rural areas (strategic targets)
    if (location.population >= 80000) {
        score += 10;
    }

    // Lowered thresholds: 30 for normal leaders, 50 for VIP
    const threshold = strategy.vipLeaders.includes(leader.id) ? 50 : 30;
    return {
        start: score >= threshold,
        score,
        goldToInvest
    };
}

function calculateEstimatedInsurgents(
    gold: number,
    population: number,
    stability: number,
    hasFirebrand: boolean
): number {
    const base = (gold / 25) * (population / 100000) * (100 - stability);
    let insurgents = base + 100;
    if (hasFirebrand) insurgents *= 1.33;
    return Math.floor(insurgents);
}

function calculateMinInsurrectionBudget(location: Location): number {
    const base = 100;
    const populationFactor = Math.min(200, location.population / 3000);
    return Math.floor(base + populationFactor);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getScorchedEarthActions(locationType: string): ClandestineActionId[] {
    if (locationType === 'CITY') {
        return [ClandestineActionId.START_URBAN_FIRE, ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS];
    }
    return [ClandestineActionId.BURN_CROP_FIELDS, ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS];
}

function canAffordAction(actionId: ClandestineActionId, budget: number): boolean {
    const cost = CLANDESTINE_ACTION_COSTS[actionId] || 0;
    if (CLANDESTINE_ACTIONS[actionId]?.isOneTime) {
        return budget >= cost;
    }
    return budget >= cost * 2;
}

function estimateRecurringCosts(activeActions: ClandestineActionId[]): number {
    return activeActions.reduce((sum, actionId) => {
        const action = CLANDESTINE_ACTIONS[actionId];
        if (!action?.isOneTime) {
            return sum + (CLANDESTINE_ACTION_COSTS[actionId] || 0);
        }
        return sum;
    }, 0);
}

function hasLegendaryBlocker(state: GameState, locationId: string): boolean {
    const location = state.locations.find(l => l.id === locationId);
    if (!location) return false;
    return state.characters.some(c =>
        c.faction === location.faction &&
        c.locationId === locationId &&
        c.stats?.ability?.includes('LEGENDARY') &&
        !c.isDead
    );
}

function findExfiltrationTarget(
    state: GameState,
    leader: Character,
    strategy: FactionStrategy
): string | undefined {
    const currentLocation = state.locations.find(l => l.id === leader.locationId);
    if (!currentLocation) return undefined;

    const connectedIds: string[] = [];
    for (const road of state.roads || []) {
        if (road.from === currentLocation.id) {
            connectedIds.push(road.to);
        } else if (road.to === currentLocation.id) {
            connectedIds.push(road.from);
        }
    }

    const connectedLocations = connectedIds
        .map(connId => state.locations.find(l => l.id === connId))
        .filter((l): l is Location => l !== undefined);

    const enemyOptions = connectedLocations
        .filter(l => l.faction !== leader.faction && l.faction !== FactionId.NEUTRAL)
        .sort((a, b) => b.stability - a.stability);

    if (enemyOptions.length > 0) return enemyOptions[0].id;
    const friendlyOptions = connectedLocations.filter(l => l.faction === leader.faction);
    if (friendlyOptions.length > 0) return friendlyOptions[0].id;
    return undefined;
}

// ============================================================================
// APPLY DECISIONS
// ============================================================================

export function applyClandestineDecision(
    state: GameState,
    decision: ClandestineDecision
): Character[] {
    return state.characters.map(c => {
        if (c.id !== decision.leaderId) return c;

        let actions = [...(c.activeClandestineActions || [])];
        let budget = c.clandestineBudget || c.budget || 0;

        for (const actionId of decision.actionsToStop) {
            actions = actions.filter(a => a.actionId !== actionId);
        }

        for (const actionId of decision.actionsToStart) {
            const action = CLANDESTINE_ACTIONS[actionId];
            const cost = action?.isOneTime
                ? (actionId === ClandestineActionId.PREPARE_GRAND_INSURRECTION
                    ? decision.goldToInvest || 200
                    : CLANDESTINE_ACTION_COSTS[actionId])
                : 0;

            if (budget >= cost) {
                budget -= cost;
                actions.push({
                    actionId,
                    turnStarted: state.turn,
                    oneTimeGoldAmount: actionId === ClandestineActionId.PREPARE_GRAND_INSURRECTION
                        ? decision.goldToInvest
                        : undefined
                });
            }
        }

        let locationId = c.locationId;
        let status = c.status;

        if (decision.riskDecision === RiskDecision.EXFILTRATE && decision.exfiltrationTargetId) {
            locationId = decision.exfiltrationTargetId;
            const targetLocation = state.locations.find(l => l.id === decision.exfiltrationTargetId);
            if (targetLocation?.faction === c.faction) {
                budget = 0;
                status = CharacterStatus.AVAILABLE;
            }
        }

        return {
            ...c,
            activeClandestineActions: actions,
            clandestineBudget: budget,
            locationId,
            status
        };
    });
}
