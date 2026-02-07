/**
 * Clandestine Agent Processor
 * 
 * Handles AI decision-making for UNDERCOVER agents.
 * Migrated from Application to shared for multiplayer consistency.
 * 
 * @module shared/services/ai/leaders/core
 */

import { Character, Location, Army, FactionId, CharacterStatus, Road } from '../../../../types';
import { GovernorPolicy } from '../../../../types/governorTypes';
import { ClandestineActionId, ActiveClandestineAction, CLANDESTINE_ACTIONS } from '../../../../types/clandestineTypes';
import { calculateDetectionThreshold, calculateCaptureRisk } from '../../../domain/clandestine/detectionLevelService';
import { getStrategyForFaction } from '../strategies/factionStrategy';
import { assessRisk } from '../utils/AIRiskDecisionService';
import { calculateLeaderTravelTime } from '../../../domain/leaders/leaderPathfinding';
import {
    calculateGrandIPG,
    calculateNeutralIPG,
    calculateMinorIPG,
    applyDistancePenalty
} from '../utils/IPGCalculator';

// ============================================================================
// TYPES
// ============================================================================

interface ActionScore {
    actionId: ClandestineActionId;
    insurgentsPerGold: number;
    totalInsurgents: number;
    costPerTurn: number;
    oneTimeCost: number;
    reasoning: string;
}

export interface ClandestineResult {
    character: Character;
    logs: string[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getResentment(location: Location, faction: FactionId): number {
    if (!location.resentment) return 50;
    const resentmentMap = location.resentment as Record<string, number>;
    return resentmentMap[faction] ?? 50;
}

// ============================================================================
// MAIN PROCESSOR
// ============================================================================

/**
 * Process an UNDERCOVER agent's clandestine operations.
 * 
 * This function determines what actions an undercover agent should take,
 * manages their budget, and handles special cases like PARANOID governors
 * and LEGENDARY enemies.
 * 
 * @param leader The undercover agent
 * @param locations All locations in the game
 * @param armies All armies in the game
 * @param turn Current turn number
 * @param actorFaction The faction the agent belongs to
 * @param logs Array to append log messages to
 * @param allCharacters List of all characters (for context)
 * @param roads List of all roads (for exfiltration pathfinding)
 * @returns Updated character and logs
 */
export function processClandestineAgent(
    leader: Character,
    locations: Location[],
    armies: Army[],
    turn: number,
    actorFaction: FactionId,
    logs: string[],
    allCharacters: Character[] = [],
    roads: Road[] = []
): ClandestineResult {
    const location = locations.find(l => l.id === leader.locationId);
    if (!location) {
        return { character: leader, logs };
    }

    // =========================================================================
    // CHECK: Territory became neutral - return to AVAILABLE status
    // =========================================================================
    if (location.faction === FactionId.NEUTRAL) {
        logs.push(`${leader.name}: Territory ${location.name} is now neutral. Returning to available status.`);
        return {
            character: {
                ...leader,
                status: CharacterStatus.AVAILABLE,
                activeClandestineActions: [],
                // Keep clandestineBudget for potential future use
            },
            logs
        };
    }

    // =========================================================================
    // CHECK: Territory became friendly - return to AVAILABLE status
    // =========================================================================
    if (location.faction === actorFaction) {
        logs.push(`${leader.name}: Territory ${location.name} is now friendly. Returning to available status.`);
        return {
            character: {
                ...leader,
                status: CharacterStatus.AVAILABLE,
                activeClandestineActions: [],
            },
            logs
        };
    }

    // =========================================================================
    // SPECIAL: Duke Great Plains first-turn relocation evaluation
    // When duke_great_plains arrives UNDERCOVER at Windward, compare IPG at
    // Windward vs Great Plains before deciding whether to relocate.
    // =========================================================================
    if (leader.id === 'duke_great_plains' &&
        location.id === 'windward' &&
        ((leader as any).activeClandestineActions || []).length === 0 &&
        !(leader as any).plannedMissionAction) {

        const greatPlains = locations.find(l => l.id === 'great_plains');

        // Only consider relocation if great_plains is enemy or neutral (not NOBLES)
        if (greatPlains && greatPlains.faction !== actorFaction && greatPlains.faction !== FactionId.NEUTRAL) {
            const ops = leader.stats?.clandestineOps || 2;
            const discretion = leader.stats?.discretion || 2;
            const dukeBudget = (leader as any).clandestineBudget ?? 400;

            // Calculate best IPG at Windward
            const windwardGrandIPG = calculateGrandIPG(location, ops, dukeBudget, actorFaction);
            const windwardNeutralIPG = calculateNeutralIPG(location, ops, actorFaction, discretion);
            const windwardMinorResult = calculateMinorIPG(location, ops, actorFaction, discretion);
            const windwardBestIPG = Math.max(windwardGrandIPG, windwardNeutralIPG, windwardMinorResult.ipg);

            // Calculate best IPG at Great Plains
            const gpGrandIPG = calculateGrandIPG(greatPlains, ops, dukeBudget, actorFaction);
            const gpNeutralIPG = calculateNeutralIPG(greatPlains, ops, actorFaction, discretion);
            const gpMinorResult = calculateMinorIPG(greatPlains, ops, actorFaction, discretion);
            const gpBestIPG = Math.max(gpGrandIPG, gpNeutralIPG, gpMinorResult.ipg);

            // Apply travel penalty (10% per turn)
            const travelTurns = calculateLeaderTravelTime(location.id, 'great_plains', locations, roads);
            const adjustedGpIPG = applyDistancePenalty(gpBestIPG, travelTurns);

            logs.push(`${leader.name}: IPG comparison - Windward: ${windwardBestIPG.toFixed(2)} vs Great Plains: ${adjustedGpIPG.toFixed(2)} (raw: ${gpBestIPG.toFixed(2)}, travel: ${travelTurns}t)`);

            if (adjustedGpIPG > windwardBestIPG) {
                // Determine best mission type for great_plains
                let plannedAction: ClandestineActionId;
                if (gpGrandIPG >= gpNeutralIPG && gpGrandIPG >= gpMinorResult.ipg && dukeBudget >= 300) {
                    plannedAction = ClandestineActionId.PREPARE_GRAND_INSURRECTION;
                } else if (gpNeutralIPG > gpMinorResult.ipg) {
                    plannedAction = ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS;
                } else {
                    plannedAction = ClandestineActionId.UNDERMINE_AUTHORITIES;
                }

                logs.push(`${leader.name}: Relocating to Great Plains for ${plannedAction} (IPG: ${adjustedGpIPG.toFixed(2)} > ${windwardBestIPG.toFixed(2)})`);

                return {
                    character: {
                        ...leader,
                        status: CharacterStatus.MOVING,
                        undercoverMission: {
                            destinationId: 'great_plains',
                            turnsRemaining: travelTurns,
                            turnStarted: turn
                        },
                        activeClandestineActions: [],
                        plannedMissionAction: plannedAction,
                        detectionLevel: 0
                    } as Character,
                    logs
                };
            } else {
                logs.push(`${leader.name}: Staying at Windward (IPG: ${windwardBestIPG.toFixed(2)} >= ${adjustedGpIPG.toFixed(2)})`);
            }
        }
    }

    let budget = (leader as any).clandestineBudget ?? (leader as any).budget ?? 0;
    const currentActions: ActiveClandestineAction[] = (leader as any).activeClandestineActions || [];
    const clandestineOps = leader.stats?.clandestineOps || 3;

    // Initialize planned mission action from current state (will be updated if plan changes/aborts)
    let newPlannedMissionAction = (leader as any).plannedMissionAction;

    const enemyResentment = getResentment(location, location.faction);
    const ourResentment = getResentment(location, actorFaction);

    let remainingBudget = budget;

    // 1. DEDUCT RECURRING COSTS FIRST
    for (const action of currentActions) {
        let cost = 0;
        if (action.actionId === ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS) cost = 50;
        if (action.actionId === ClandestineActionId.UNDERMINE_AUTHORITIES) cost = 20;
        if (action.actionId === ClandestineActionId.DISTRIBUTE_PAMPHLETS) cost = 10;
        if (action.actionId === ClandestineActionId.SPREAD_PROPAGANDA) cost = 10;

        remainingBudget -= cost;
    }

    if (remainingBudget < 0) remainingBudget = 0;

    logs.push(`${leader.name}: Analyzing opportunities at ${location.name} (Budget: ${remainingBudget})`);

    // =========================================================================
    // DETECT PARANOID GOVERNOR AND LEGENDARY ENEMY
    // =========================================================================
    const characters = allCharacters;

    // Check for PARANOID governor at this location
    const governorHere = characters.find(c =>
        c.locationId === location.id &&
        c.faction === location.faction &&
        c.status === CharacterStatus.GOVERNING &&
        c.stats?.ability?.includes('PARANOID')
    );
    const hasParanoidGovernor = !!governorHere;

    // Check for LEGENDARY enemy leader at this location
    const legendaryEnemy = characters.find(c =>
        c.locationId === location.id &&
        c.faction === location.faction &&
        c.status !== CharacterStatus.DEAD &&
        c.stats?.ability?.includes('LEGENDARY')
    );
    const hasLegendaryEnemy = !!legendaryEnemy;

    // =========================================================================
    // RISK ASSESSMENT & STRATEGY (New System - Using AIRiskDecisionService)
    // =========================================================================
    const strategy = getStrategyForFaction(actorFaction);

    const isAlreadyPreparingGI = currentActions.some(a =>
        a.actionId === ClandestineActionId.PREPARE_GRAND_INSURRECTION
    );

    const isPreparingGI = isAlreadyPreparingGI || (leader as any).plannedMissionAction === ClandestineActionId.PREPARE_GRAND_INSURRECTION;

    // Check if currently doing INCITE_NEUTRAL_INSURRECTIONS (gets +15% extra risk tolerance)
    const isDoingINCITE = currentActions.some(a =>
        a.actionId === ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS
    ) || (leader as any).plannedMissionAction === ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS;

    // Perform standardized risk assessment
    const riskAssessment = assessRisk({
        leader,
        location,
        governor: characters.find(c =>
            c.locationId === location.id &&
            c.faction === location.faction &&
            c.status === CharacterStatus.GOVERNING
        ),
        strategy,
        isPreparingGrandInsurrection: isPreparingGI
    });

    const { currentDetectionLevel, effectiveThreshold, maxAllowedDetection, currentCaptureRisk } = riskAssessment;
    const maxCaptureRiskPercent = strategy.maxCaptureRisk * 100;

    logs.push(`${leader.name}: Detection ${currentDetectionLevel}/${effectiveThreshold} (Max: ${maxAllowedDetection}), Risk: ${currentCaptureRisk.toFixed(1)}%${hasParanoidGovernor ? ' (PARANOID)' : ''}`);

    // If preparing GRAND_INSURRECTION is ALREADY ACTIVE, continue without changes (LEGENDARY doesn't stop ongoing prep)
    if (isAlreadyPreparingGI) {
        logs.push(`${leader.name}: Continuing GRAND_INSURRECTION prep at ${location.name}`);
        return { character: leader, logs };
    }

    // =========================================================================
    // LEGENDARY ENEMY HANDLING
    // =========================================================================
    // LEGENDARY leaders prevent insurrection organization
    if (hasLegendaryEnemy) {
        logs.push(`${leader.name}: LEGENDARY enemy (${legendaryEnemy?.name}) present - cannot organize insurrections`);

        // If budget is 100-200g and blocked by LEGENDARY, reassign leader to new mission
        if (remainingBudget > 100 && remainingBudget < 200) {
            logs.push(`${leader.name}: Budget ${remainingBudget}g insufficient for insurrection - returning to pool`);
            return {
                character: {
                    ...leader,
                    status: CharacterStatus.AVAILABLE,
                    activeClandestineActions: [],
                    // Keep budget for reassignment
                },
                logs
            };
        }

        // Otherwise, fall back to support actions only (no insurrections)
        // The action selection below will handle this by checking hasLegendaryEnemy
    }

    // If out of funds, stop non-essential operations
    if (remainingBudget <= 0 && currentActions.length > 0) {
        logs.push(`${leader.name}: Out of funds. Stopping operations.`);
        return {
            character: {
                ...leader,
                activeClandestineActions: [],
                clandestineBudget: 0
            } as Character,
            logs
        };
    }

    // =========================================================================
    // CALCULATE INSURGENT GENERATION FOR EACH ACTION
    // =========================================================================

    const actionScores: ActionScore[] = [];

    // --- INCITE_NEUTRAL_INSURRECTIONS ---
    // Only if not blocked by LEGENDARY
    if (clandestineOps >= 3 && !hasLegendaryEnemy) {
        const divisor = location.type === 'CITY' ? 10000 : 100000;
        const insurgentsPerTurn = Math.floor(
            (location.population * clandestineOps * (enemyResentment + 1)) /
            (divisor * (1 + location.stability / 100))
        );

        const costFirstTurn = 50 + 50;
        const costPerTurn = 50;
        const ratio1Turn = insurgentsPerTurn / costFirstTurn;
        const ratio2Turns = (insurgentsPerTurn * 2) / (costFirstTurn + costPerTurn);
        const avgRatio = (ratio1Turn + ratio2Turns) / 2;

        actionScores.push({
            actionId: ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS,
            insurgentsPerGold: avgRatio,
            totalInsurgents: insurgentsPerTurn,
            costPerTurn: costPerTurn,
            oneTimeCost: 50,
            reasoning: `${insurgentsPerTurn} insurgents/turn, ${avgRatio.toFixed(2)} per gold`
        });
    }

    // --- GRAND_INSURRECTION ---
    // Minimum 200g required for GI (User spec)
    // Only if not blocked by LEGENDARY
    if (!hasLegendaryEnemy) {
        const testGold = Math.min(budget, 400);
        // Minimum 300g required for GI to be effective and safe (aligned with Assignment logic)
        if (testGold >= 300) {
            const stabilityShock = clandestineOps * 4;
            const effectiveStability = Math.max(0, location.stability - stabilityShock);
            const resentmentFactor = 1 + (enemyResentment / 100) - (ourResentment / 100);

            const baseInsurgents = (testGold / 25) * (location.population / 100000);
            const stabilityFactor = 100 - effectiveStability;
            let totalInsurgents = Math.floor(baseInsurgents * stabilityFactor * resentmentFactor) + 100;

            if (leader.stats?.ability?.includes('FIREBRAND')) {
                totalInsurgents = Math.floor(totalInsurgents * 1.33);
            }

            const ratio = totalInsurgents / testGold;

            actionScores.push({
                actionId: ClandestineActionId.PREPARE_GRAND_INSURRECTION,
                insurgentsPerGold: ratio,
                totalInsurgents: totalInsurgents,
                costPerTurn: 0,
                oneTimeCost: testGold,
                reasoning: `${totalInsurgents} insurgents for ${testGold}g, ${ratio.toFixed(2)} per gold`
            });
        }
    }

    // --- Support actions (always available) ---
    actionScores.push({
        actionId: ClandestineActionId.UNDERMINE_AUTHORITIES,
        insurgentsPerGold: 0,
        totalInsurgents: 0,
        costPerTurn: 10,
        oneTimeCost: 0,
        reasoning: 'Destabilizes territory'
    });

    actionScores.push({
        actionId: ClandestineActionId.DISTRIBUTE_PAMPHLETS,
        insurgentsPerGold: 0,
        totalInsurgents: 0,
        costPerTurn: 10,
        oneTimeCost: 0,
        reasoning: 'Reduces resentment against us'
    });

    if (clandestineOps >= 2) {
        actionScores.push({
            actionId: ClandestineActionId.SPREAD_PROPAGANDA,
            insurgentsPerGold: 0,
            totalInsurgents: 0,
            costPerTurn: 10,
            oneTimeCost: 0,
            reasoning: 'Increases resentment against occupiers'
        });
    }

    // =========================================================================
    // SELECT BEST ACTIONS
    // =========================================================================

    actionScores.sort((a, b) => b.insurgentsPerGold - a.insurgentsPerGold);

    let newActions: ActiveClandestineAction[] = [...currentActions];

    logs.push(`${leader.name}: Evaluating actions at ${location.name}`);
    for (const score of actionScores.slice(0, 3)) {
        if (score.insurgentsPerGold > 0) {
            logs.push(`  - ${score.actionId}: ${score.reasoning}`);
        }
    }

    // Pick best insurgent-generating action
    let bestInsurgentAction = actionScores.find(a =>
        a.insurgentsPerGold > 0 &&
        !currentActions.some(ca => ca.actionId === a.actionId)
    );

    // check for PLANNED MISSION INTENT
    // If the leader came here with a specific mission (e.g., INCITE, GI), prioritize it
    const plannedActionId = (leader as any).plannedMissionAction; // Cast as any if type not updated yet

    // DEBUG LOG REMOVED
    if (plannedActionId) {
        // Check if already active
        const alreadyActive = currentActions.some(a => a.actionId === plannedActionId); // Check initial state, not newActions yet

        if (alreadyActive) {
            // Mission is already running (e.g. Turn 2 of INCITE).
            // PREVENT switching to another major action (like GI) even if we have budget.
            // Force bestInsurgentAction to null so we only consider support actions.
            bestInsurgentAction = undefined;
            logs.push(`${leader.name}: Continuing PLANNED MISSION ${plannedActionId}. Ignoring other major opportunities.`);
        } else {
            // Mission not running yet (Turn 1 or interrupted)
            // Find the score for this planned action
            const plannedScore = actionScores.find(s => s.actionId === plannedActionId);
            if (plannedScore) {
                // If the planned action is possible (conditions met, enough budget), FORCE IT
                if (remainingBudget >= (plannedScore.oneTimeCost + plannedScore.costPerTurn)) {
                    logs.push(`${leader.name}: Prioritizing PLANNED MISSION: ${plannedActionId}`);
                    bestInsurgentAction = plannedScore;
                } else {
                    logs.push(`${leader.name}: PLANNED MISSION ${plannedActionId} too expensive (${plannedScore.oneTimeCost}g > ${remainingBudget}g). Standing by.`);
                    bestInsurgentAction = undefined; // Do not fallback to unauthorized major actions
                }
            } else {
                logs.push(`${leader.name}: PLANNED MISSION ${plannedActionId} conditions not met (blocked or high risk). Standing by.`);
                bestInsurgentAction = undefined; // Do not fallback to unauthorized major actions
            }
        }
    } else {
        // NO PLAN - Auto-selection logic applies
        // SAFETY NET: If we already have a MAJOR action active (Incite or GI), do NOT start another one.
        const hasMajorActionRef = currentActions.some(a =>
            a.actionId === ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS ||
            a.actionId === ClandestineActionId.PREPARE_GRAND_INSURRECTION
        );

        // Exception: Leaders with SCORCHED_EARTH are arsonists who want to see the world burn.
        // They are allowed to stack multiple major actions (e.g. Incite + GI).
        // Note: SCORCHED_EARTH is a TRAIT, not an ABILITY.
        const isScorchedEarth = leader.stats?.traits?.includes('SCORCHED_EARTH');

        // If we have a major action, and the suggested 'best' action is ALSO major, block it UNLESS Scorched Earth.
        // This prevents Incite -> GI switching/stacking for normal agents.
        if (hasMajorActionRef && !isScorchedEarth && bestInsurgentAction &&
            (bestInsurgentAction.actionId === ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS ||
                bestInsurgentAction.actionId === ClandestineActionId.PREPARE_GRAND_INSURRECTION)) {

            logs.push(`${leader.name}: Already has major action active. Skipping new major action ${bestInsurgentAction.actionId}.`);
            bestInsurgentAction = undefined;
        }
    }

    if (bestInsurgentAction) {
        const totalCost = bestInsurgentAction.oneTimeCost + bestInsurgentAction.costPerTurn;

        if (remainingBudget >= totalCost) {
            // For GRAND_INSURRECTION: 50% chance to reserve 100g for support actions
            let giGoldAmount = bestInsurgentAction.oneTimeCost;
            if (bestInsurgentAction.actionId === ClandestineActionId.PREPARE_GRAND_INSURRECTION) {
                const reserveForSupport = Math.random() < 0.5;
                if (reserveForSupport && remainingBudget >= bestInsurgentAction.oneTimeCost + 100) {
                    // Reserve 100g for support, use rest for GI (minimum 200g for GI)
                    giGoldAmount = Math.max(200, remainingBudget - 100);
                    logs.push(`${leader.name}: Reserving 100g for support actions during GI prep`);
                } else {
                    giGoldAmount = remainingBudget; // All budget goes to GI
                }
            }

            newActions.push({
                actionId: bestInsurgentAction.actionId,
                turnStarted: bestInsurgentAction.actionId === ClandestineActionId.PREPARE_GRAND_INSURRECTION
                    ? undefined  // Let processor initialize and create prep log
                    : turn,
                oneTimeGoldAmount: bestInsurgentAction.actionId === ClandestineActionId.PREPARE_GRAND_INSURRECTION
                    ? giGoldAmount
                    : undefined
            });

            if (bestInsurgentAction.actionId === ClandestineActionId.PREPARE_GRAND_INSURRECTION) {
                remainingBudget -= giGoldAmount;
            }
            // User requested NO oneTimeCost deduction for non-GI actions (pay-as-you-go)

            logs.push(`${leader.name}: Started ${bestInsurgentAction.actionId} (${bestInsurgentAction.reasoning})`);
        } else if (isPreparingGI && bestInsurgentAction.actionId === ClandestineActionId.PREPARE_GRAND_INSURRECTION) {
            // FALLBACK for insufficient funds on PLANNED mission
            logs.push(`${leader.name}: Insufficient funds for planned GI (Has ${remainingBudget}, Needs ${totalCost}). Aborting plan.`);
            newPlannedMissionAction = undefined; // Clear the plan to unblock agent
        }
    }

    // Add support actions with priority order
    const isMinorMission = budget <= 100;
    const hasIncite = newActions.some(a => a.actionId === ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS);
    const hasGI = newActions.some(a => a.actionId === ClandestineActionId.PREPARE_GRAND_INSURRECTION);

    // For minor missions with INCITE, skip support actions
    if (isMinorMission && hasIncite) {
        logs.push(`${leader.name}: Minor mission - focusing on INCITE only`);
    } else {
        // Priority order: UNDERMINE > PAMPHLETS > PROPAGANDA
        const supportActions: { id: ClandestineActionId; cost: number; detection: number; blocked: () => boolean }[] = [
            {
                id: ClandestineActionId.UNDERMINE_AUTHORITIES,
                cost: 10,
                detection: 10,
                blocked: () => location.stability <= 0
            },
            {
                id: ClandestineActionId.DISTRIBUTE_PAMPHLETS,
                cost: 10,
                detection: 5,
                blocked: () => getResentment(location, location.faction) >= 100
            },
            {
                id: ClandestineActionId.SPREAD_PROPAGANDA,
                cost: 10,
                detection: 5,
                blocked: () => getResentment(location, actorFaction) <= 0 || clandestineOps < 2
            }
        ];

        // During GI preparation, only add actions if they keep detection at/below threshold
        let supportDetectionBudget = hasGI
            ? effectiveThreshold - currentDetectionLevel  // GI: strict threshold, no tolerance
            : maxAllowedDetection - currentDetectionLevel; // Non-GI: allow tolerance

        for (const support of supportActions) {
            const alreadyHas = newActions.some(a => a.actionId === support.id);
            if (alreadyHas) continue;
            if (support.blocked()) {
                logs.push(`${leader.name}: ${support.id} blocked (conditions not met)`);
                continue;
            }
            if (remainingBudget < support.cost) continue;
            if (support.detection > supportDetectionBudget) {
                logs.push(`${leader.name}: ${support.id} skipped (detection +${support.detection} exceeds budget ${supportDetectionBudget})`);
                continue;
            }

            newActions.push({
                actionId: support.id,
                turnStarted: turn
            });
            supportDetectionBudget -= support.detection;
            remainingBudget -= support.cost; // Deduct cost from budget
            logs.push(`${leader.name}: Started ${support.id}`);
        }
    }

    // =========================================================================
    // DETECTION-LEVEL BASED ACTION REDUCTION (replaces old GO_DARK logic)
    // =========================================================================
    const ACTION_PRIORITY: ClandestineActionId[] = [
        ClandestineActionId.DISTRIBUTE_PAMPHLETS,
        ClandestineActionId.SPREAD_PROPAGANDA,
        ClandestineActionId.UNDERMINE_AUTHORITIES,
        ClandestineActionId.ATTACK_TAX_CONVOYS,
        ClandestineActionId.STEAL_FROM_GRANARIES,
        ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS,
        ClandestineActionId.PREPARE_GRAND_INSURRECTION
    ];

    // Calculate projected detection increase from proposed actions
    let projectedDetection = currentDetectionLevel;
    for (const action of newActions) {
        const actionDef = CLANDESTINE_ACTIONS[action.actionId as ClandestineActionId];
        if (actionDef && actionDef.detectionType === 'per_turn') {
            projectedDetection += actionDef.detectionIncrease;
        }
    }

    // Calculate projected capture risk
    const projectedRiskFromDetection = Math.max(0, projectedDetection - effectiveThreshold);
    const paranoidBonus = hasParanoidGovernor ? 15 : 0;
    let projectedCaptureRisk = projectedRiskFromDetection + paranoidBonus;

    // If projected detection or risk exceeds limits, remove lowest priority actions
    // Note: If preparing GRAND_INSURRECTION, we ONLY enforce detection threshold (ignore risk % which might be high due to PARANOID flat bonus)
    // INCITE missions get +15% tolerance before load shedding kicks in
    const loadSheddingInciteBonus = isDoingINCITE ? 15 : 0;
    const loadSheddingMaxRisk = maxCaptureRiskPercent + loadSheddingInciteBonus;
    const riskCheckApplies = !isPreparingGI;
    if (projectedDetection > maxAllowedDetection || (riskCheckApplies && projectedCaptureRisk > loadSheddingMaxRisk)) {
        let safeActions = [...newActions];

        for (const actionId of ACTION_PRIORITY) {
            // NEVER remove major missions (GRAND_INSURRECTION or INCITE) - they continue until risk forces exfiltration
            if (actionId === ClandestineActionId.PREPARE_GRAND_INSURRECTION) break;
            if (actionId === ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS) continue; // Skip, don't remove

            // Check if we have this action
            const hasAction = safeActions.some(a => a.actionId === actionId);
            if (!hasAction) continue;

            // Get action definition
            const actionDef = CLANDESTINE_ACTIONS[actionId];
            if (!actionDef) continue;

            // Calculate reduction from removing this action
            const detectionReduction = actionDef.detectionType === 'per_turn' ? actionDef.detectionIncrease : 0;
            const newProjectedDetection = projectedDetection - detectionReduction;
            const newRiskFromDetection = Math.max(0, newProjectedDetection - effectiveThreshold);
            const newProjectedRisk = newRiskFromDetection + paranoidBonus;

            // Remove the action
            safeActions = safeActions.filter(a => a.actionId !== actionId);
            logs.push(`${leader.name}: Reducing activity - Stopped ${actionId} (Detection: ${projectedDetection} -> ${newProjectedDetection}, Risk: ${projectedCaptureRisk}% -> ${newProjectedRisk}%)`);
            projectedDetection = newProjectedDetection;
            projectedCaptureRisk = newProjectedRisk;

            // Stop if we're now within limits
            if (projectedDetection <= maxAllowedDetection && (!riskCheckApplies || projectedCaptureRisk <= loadSheddingMaxRisk)) break;
        }

        newActions = safeActions;
    }

    // Keep planned mission action active until explicitly cleared (e.g. by exfiltration logic elsewhere)
    // or until budget failure forces a rethink (which happens naturally if budgetCheck fails above)
    // let newPlannedMissionAction = (leader as any).plannedMissionAction; // MOVED TO TOP

    // =========================================================================
    // EXFILTRATION PROTOCOL (Physical Movement)
    // =========================================================================

    // Calculate effective max risk with INCITE bonus (+15 pts = +15% extra tolerance)
    // - Nobles/Conspirators: 15% -> 30% when doing INCITE
    // - Republicans: 20% -> 35% when doing INCITE
    const inciteRiskBonus = isDoingINCITE ? 15 : 0;
    const effectiveMaxRiskPercent = maxCaptureRiskPercent + inciteRiskBonus;

    // Manual exfiltration check (replaces shouldExfiltrateLeader for fine-grained control)
    let shouldExfiltrate = false;
    let exfiltrationReason = '';

    // NEVER exfiltrate during GRAND_INSURRECTION preparation (ACTIVE only)
    // Planned GI should allow exfiltration if blocked
    const justStartedGI = newActions.some(a => a.actionId === ClandestineActionId.PREPARE_GRAND_INSURRECTION);

    // FIX: Use isAlreadyPreparingGI (active) instead of isPreparingGI (includes planned)
    // to allow planned-but-blocked missions to trigger redeployment
    if (!isAlreadyPreparingGI && !justStartedGI) {
        // Check budget
        if (remainingBudget <= 0) {
            shouldExfiltrate = true;
            exfiltrationReason = 'No budget remaining';
        }
        // Check capture risk against effective max (includes INCITE bonus)
        else if (currentCaptureRisk > effectiveMaxRiskPercent) {
            shouldExfiltrate = true;
            exfiltrationReason = `Risk ${currentCaptureRisk.toFixed(1)}% exceeds max ${effectiveMaxRiskPercent}%`;
        }
        // Check if any action is possible - BUT only if we have no ongoing actions
        // If currentActions has items (like INCITE), keep going even if we can't add more
        else if (newActions.length === 0 && currentActions.length === 0) {
            shouldExfiltrate = true;
            exfiltrationReason = 'No actions possible (Blocked)';
        }
    }

    if (shouldExfiltrate) {
        logs.push(`${leader.name}: Exfiltration triggered (${exfiltrationReason}). Initiating redeployment.`);

        // Determine exfiltration destination
        let bestTargetId: string | undefined;
        let isNewMission = false;

        // PRIORITY 1: Redeployment (Budget >= 100)
        // User Rule:
        // - Budget 100-200: Minor Mission (Undermine) elsewhere
        // - Budget > 200: Major Mission (Incite) elsewhere
        // - Must NOT be current or linked location
        if (remainingBudget >= 100) {
            // Find NEAREST hostile target (Enemy/Neutral)
            // Range expanded from locals to Map-wide (sorted by distance, max 5 turns)

            const forbiddenIds = [location.id];
            if (location.linkedLocationId) forbiddenIds.push(location.linkedLocationId);

            // 1. Identify candidates
            const candidates = locations.filter(l =>
                !forbiddenIds.includes(l.id) &&
                l.faction !== actorFaction // Not friendly
            );

            // 2. Calculate travel times and sort
            const validTargets: { id: string; name: string; dist: number }[] = [];

            for (const candidate of candidates) {
                const dist = calculateLeaderTravelTime(
                    location.id,
                    candidate.id,
                    locations,
                    roads
                );

                // Limit to reasonable distance (e.g., 5 turns) to avoid crossing the whole world
                if (dist > 0 && dist <= 5) {
                    validTargets.push({ id: candidate.id, name: candidate.name, dist });
                }
            }

            // Sort by distance ASC
            validTargets.sort((a, b) => a.dist - b.dist);

            if (validTargets.length > 0) {
                // Pick the closest one (or random among top 3 for variety)
                const topTargets = validTargets.slice(0, 3);
                const chosen = topTargets[Math.floor(Math.random() * topTargets.length)];

                bestTargetId = chosen.id;
                isNewMission = true;

                // Assign new planned mission based on budget
                if (remainingBudget > 200) {
                    // Major Mission (> 200g)
                    newPlannedMissionAction = ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS;
                    logs.push(`${leader.name}: Redeploying to ${chosen.name} (Dist: ${chosen.dist}) for MAJOR OPS (Budget ${remainingBudget}).`);
                } else {
                    // Minor Mission (100-200g)
                    // Does not count towards global cap
                    newPlannedMissionAction = ClandestineActionId.UNDERMINE_AUTHORITIES;
                    logs.push(`${leader.name}: Redeploying to ${chosen.name} (Dist: ${chosen.dist}) for MINOR OPS (Budget ${remainingBudget}).`);
                }
            } else {
                logs.push(`${leader.name}: Cannot redeploy (No hostile targets found within 5 turns). Falling back to retreat.`);
            }
        }



        // PRIORITY 2: Retreat to Friendly Territory (Lose Gold)
        if (!bestTargetId) {
            const friendlyLocations = locations.filter(l => l.faction === actorFaction);

            if (friendlyLocations.length > 0) {
                let nearestId: string | undefined;
                let minTime = Infinity;

                for (const friendly of friendlyLocations) {
                    const time = calculateLeaderTravelTime(location.id, friendly.id, locations, roads);
                    if (time < minTime) {
                        minTime = time;
                        nearestId = friendly.id;
                    }
                }

                if (nearestId) {
                    bestTargetId = nearestId;
                    isNewMission = false;
                    logs.push(`${leader.name}: Retreating to friendly territory (${minTime} turns). Gold will be surrendered.`);
                }
            }
        }

        // EXECUTE EXFILTRATION using proper movement system (undercoverMission)
        if (bestTargetId) {
            // Use ORIGINAL budget for transfer (don't deduct costs of abandoned actions)
            const finalBudget = isNewMission ? budget : 0;
            const travelTime = calculateLeaderTravelTime(location.id, bestTargetId, locations, roads);

            // Use undercoverMission for proper movement (same as human exfiltration)
            return {
                character: {
                    ...leader,
                    status: CharacterStatus.MOVING,
                    // Use undercoverMission structure for travel (consistent with leaderPathfinding)
                    undercoverMission: {
                        destinationId: bestTargetId,
                        turnsRemaining: travelTime,
                        turnStarted: turn
                    },
                    activeClandestineActions: [],
                    plannedMissionAction: undefined,
                    clandestineBudget: finalBudget,
                    // FIX: Reset detection level on exfiltration
                    detectionLevel: 0,
                    pendingDetectionEffects: undefined
                },
                logs
            };
        } else {
            // No escape possible (trapped)
            logs.push(`${leader.name}: Exfiltration failed - no valid exit routes. Going dark.`);
            return {
                character: {
                    ...leader,
                    status: CharacterStatus.AVAILABLE,
                    activeClandestineActions: [],
                    plannedMissionAction: undefined,
                    clandestineBudget: budget // Keep original budget
                },
                logs
            };
        }
    }


    const updatedCharacter: Character = {
        ...leader,
        activeClandestineActions: newActions,
        clandestineBudget: budget, // DO NOT SAVE DEDUCTIONS - Let ClandestineProcessor handle actual costs
        plannedMissionAction: newPlannedMissionAction
    } as Character;

    return { character: updatedCharacter, logs };
}
