/**
 * Clandestine Agent Processor
 * 
 * Handles AI decision-making for UNDERCOVER agents.
 * Migrated from Application to shared for multiplayer consistency.
 * 
 * @module shared/services/ai/leaders/core
 */

import { Character, Location, Army, FactionId, CharacterStatus } from '../../../../types';
import { GovernorPolicy } from '../../../../types/governorTypes';
import { ClandestineActionId, ActiveClandestineAction } from '../../../../types/clandestineTypes';
import { calculateDetectionRisk } from '../../../domain/clandestine/detectionRisk';

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
 * @param allCharacters All characters (for PARANOID/LEGENDARY detection)
 * @returns Updated character and logs
 */
export function processClandestineAgent(
    leader: Character,
    locations: Location[],
    armies: Army[],
    turn: number,
    actorFaction: FactionId,
    logs: string[],
    allCharacters: Character[] = []
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

    let budget = (leader as any).clandestineBudget ?? (leader as any).budget ?? 0;
    const currentActions: ActiveClandestineAction[] = (leader as any).activeClandestineActions || [];
    const clandestineOps = leader.stats?.clandestineOps || 3;

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
    // FACTION RISK THRESHOLDS
    // =========================================================================
    let riskThreshold = 0.15;
    if (actorFaction === FactionId.CONSPIRATORS) riskThreshold = 0.10;
    if (actorFaction === FactionId.REPUBLICANS) riskThreshold = 0.20;

    // PARANOID governor adds 15% base risk - need 16% threshold to do anything
    // Raise threshold for Nobles/Conspirators so they can still act
    if (hasParanoidGovernor && (actorFaction === FactionId.NOBLES || actorFaction === FactionId.CONSPIRATORS)) {
        riskThreshold = 0.16;
        logs.push(`${leader.name}: PARANOID governor detected - raising risk threshold to 16%`);
    }

    const isPreparingGI = currentActions.some(a =>
        a.actionId === ClandestineActionId.PREPARE_GRAND_INSURRECTION
    );

    // If preparing GRAND_INSURRECTION, continue without changes (LEGENDARY doesn't stop ongoing prep)
    if (isPreparingGI) {
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
        if (testGold >= 200) {
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
        costPerTurn: 20,
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
    const bestInsurgentAction = actionScores.find(a =>
        a.insurgentsPerGold > 0 &&
        !currentActions.some(ca => ca.actionId === a.actionId)
    );

    if (bestInsurgentAction) {
        const totalCost = bestInsurgentAction.oneTimeCost + bestInsurgentAction.costPerTurn;

        if (remainingBudget >= totalCost) {
            newActions.push({
                actionId: bestInsurgentAction.actionId,
                turnStarted: bestInsurgentAction.actionId === ClandestineActionId.PREPARE_GRAND_INSURRECTION
                    ? undefined  // Let processor initialize and create prep log
                    : turn,
                oneTimeGoldAmount: bestInsurgentAction.actionId === ClandestineActionId.PREPARE_GRAND_INSURRECTION
                    ? bestInsurgentAction.oneTimeCost
                    : undefined
            });

            if (bestInsurgentAction.actionId === ClandestineActionId.PREPARE_GRAND_INSURRECTION) {
                remainingBudget -= bestInsurgentAction.oneTimeCost;
            }

            logs.push(`${leader.name}: Started ${bestInsurgentAction.actionId} (${bestInsurgentAction.reasoning})`);
        }
    }

    // Add support actions
    const isMinorMission = budget <= 100;
    const hasIncite = newActions.some(a => a.actionId === ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS);

    // For minor missions with INCITE, skip support actions
    if (!(isMinorMission && hasIncite)) {
        const hasUndermine = newActions.some(a => a.actionId === ClandestineActionId.UNDERMINE_AUTHORITIES);
        if (!hasUndermine && remainingBudget >= 20) {
            newActions.push({
                actionId: ClandestineActionId.UNDERMINE_AUTHORITIES,
                turnStarted: turn
            });
            logs.push(`${leader.name}: Started UNDERMINE_AUTHORITIES`);
        }

        const hasPamphlets = newActions.some(a => a.actionId === ClandestineActionId.DISTRIBUTE_PAMPHLETS);
        if (!hasPamphlets && remainingBudget >= 10) {
            newActions.push({
                actionId: ClandestineActionId.DISTRIBUTE_PAMPHLETS,
                turnStarted: turn
            });
            logs.push(`${leader.name}: Started DISTRIBUTE_PAMPHLETS`);
        }
    } else {
        logs.push(`${leader.name}: Minor mission - focusing on INCITE only`);
    }

    // =========================================================================
    // GO_DARK LOGIC: Priority-based action removal if risk exceeds threshold
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

    // Calculate risk with proposed actions
    let proposedRisk = calculateDetectionRisk(
        location,
        newActions as any,  // Cast to match expected type
        leader,
        armies,
        undefined,
        location.governorPolicies?.[GovernorPolicy.HUNT_NETWORKS] === true
    );

    // If risk exceeds threshold, remove lowest priority actions until safe
    if (proposedRisk > riskThreshold) {
        let safeActions = [...newActions];

        for (const actionId of ACTION_PRIORITY) {
            // NEVER remove GRAND_INSURRECTION
            if (actionId === ClandestineActionId.PREPARE_GRAND_INSURRECTION) break;

            // Check if we have this action
            const hasAction = safeActions.some(a => a.actionId === actionId);
            if (!hasAction) continue;

            // Recalculate risk without this action
            const testActions = safeActions.filter(a => a.actionId !== actionId);
            const newRisk = calculateDetectionRisk(
                location, testActions as any, leader, armies, undefined,
                location.governorPolicies?.[GovernorPolicy.HUNT_NETWORKS] === true
            );

            // Remove the action
            safeActions = testActions;
            logs.push(`${leader.name}: GO_DARK - Stopped ${actionId} to reduce risk (${(proposedRisk * 100).toFixed(0)}% -> ${(newRisk * 100).toFixed(0)}%)`);
            proposedRisk = newRisk;

            // Stop if we're now under the threshold
            if (proposedRisk <= riskThreshold) break;
        }

        newActions = safeActions;
    }

    const updatedCharacter: Character = {
        ...leader,
        activeClandestineActions: newActions,
        clandestineBudget: remainingBudget
    } as Character;

    return { character: updatedCharacter, logs };
}
