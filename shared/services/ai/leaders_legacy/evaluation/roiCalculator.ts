/**
 * ROI Calculator - Calculate insurgent efficiency for clandestine actions
 * 
 * Provides "insurgents per gold" (IPG) calculations for AI decision-making.
 * Compares clandestine actions against recruitment baseline (10 soldiers/gold).
 */

import { Character, Location, FactionId } from '../../../../types';
import { ClandestineActionId } from '../../../../types/clandestineTypes';

// Recruitment baseline: 1 gold = 10 soldiers
export const RECRUITMENT_IPG = 10;

// Minimum worthwhile IPG (lowered to allow more actions)
export const MIN_WORTHWHILE_IPG = 2;

export interface InsurgentROI {
    actionId: ClandestineActionId | 'RECRUITMENT';
    insurgentsGen: number;
    totalCost: number;
    turnsToOutput: number;
    insurgentsPerGold: number;
}

/**
 * Calculate Grand Insurrection ROI
 * 
 * Formula: ((Invest/25 * Pop/100000) * (100 - effectiveStab) * ResFactor) + 100
 * effectiveStab = stability - (Ops * 4)  [insurrection hit]
 * ResFactor = 1 + (ownerRes/100) - (actorRes/100)
 */
export function calculateGrandInsurrectionROI(
    location: Location,
    leader: Character,
    investment: number
): InsurgentROI {
    // Clamp investment to 100-500 by 100 increments
    const invest = Math.max(100, Math.min(500, Math.floor(investment / 100) * 100));

    const ops = leader.stats?.clandestineOps || 1;
    const stabilityHit = ops * 4;
    const effectiveStab = Math.max(0, location.stability - stabilityHit);

    const population = location.population || 0;
    const ownerRes = (location.resentment as Record<string, number>)?.[location.faction] || 0;
    const actorRes = (location.resentment as Record<string, number>)?.[leader.faction] || 0;
    const resFactor = 1 + (ownerRes / 100) - (actorRes / 100);

    // Formula: ((Invest/25 * Pop/100000) * (100 - effectiveStab) * ResFactor) + 100
    let insurgents = ((invest / 25) * (population / 100000)) * (100 - effectiveStab) * resFactor;
    insurgents = Math.floor(insurgents) + 100;

    // Firebrand bonus
    if (leader.stats?.ability?.includes('FIREBRAND')) {
        insurgents = Math.floor(insurgents * 1.33);
    }

    return {
        actionId: ClandestineActionId.PREPARE_GRAND_INSURRECTION,
        insurgentsGen: insurgents,
        totalCost: invest,
        turnsToOutput: 4, // 4 turns prep
        insurgentsPerGold: insurgents / invest
    };
}

/**
 * Calculate Incite Neutral Insurrections ROI over N turns
 * 
 * Formula: (Pop * Ops * (Res + 1)) / (Divisor * (1 + Stab/100))
 * Divisor: 10,000 (City) / 100,000 (Rural)
 * Cap: 1500/turn
 */
export function calculateNeutralInsurrectionROI(
    location: Location,
    leader: Character,
    turnsActive: number = 2
): InsurgentROI {
    const ops = leader.stats?.clandestineOps || 1;
    const population = location.population || 0;
    const ownerRes = (location.resentment as Record<string, number>)?.[location.faction] || 0;
    const stability = location.stability || 0;

    const divisor = location.type === 'CITY' ? 10000 : 100000;
    const stabFactor = 1 + (stability / 100);

    // Per-turn output (capped at 1500)
    const perTurn = Math.min(1500, Math.ceil(
        (population * ops * (ownerRes + 1)) / (divisor * stabFactor)
    ));

    // First turn is prep, so output starts turn 2
    const outputTurns = Math.max(0, turnsActive - 1);
    const totalInsurgents = perTurn * outputTurns;

    // Cost: 10g/turn (corrected from earlier)
    const totalCost = 10 * turnsActive;

    return {
        actionId: ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS,
        insurgentsGen: totalInsurgents,
        totalCost,
        turnsToOutput: 2,
        insurgentsPerGold: totalCost > 0 ? totalInsurgents / totalCost : 0
    };
}

/**
 * Support Action Priority (0-100)
 * Higher = more valuable in current situation
 */
export interface SupportActionPriority {
    actionId: ClandestineActionId;
    priority: number; // 0-100
    reason: string;
}

export function calculateSupportPriority(
    actionId: ClandestineActionId,
    location: Location,
    leader: Character
): SupportActionPriority {
    const stability = location.stability || 0;
    const ops = leader.stats?.clandestineOps || 1;

    switch (actionId) {
        case ClandestineActionId.UNDERMINE_AUTHORITIES:
            // HIGH priority if stability > 50 (want to trigger spontaneous insurrections)
            const stabDrop = ops; // -Ops stab/turn
            const turnsTo50 = stability > 50 ? Math.ceil((stability - 50) / stabDrop) : 0;
            return {
                actionId,
                priority: stability > 50 ? Math.min(90, 50 + (stability - 50)) : 20,
                reason: stability > 50
                    ? `${turnsTo50} turns to drop below 50% stability`
                    : 'Stability already below 50%'
            };

        case ClandestineActionId.DISTRIBUTE_PAMPHLETS:
            // MEDIUM - increases resentment vs owner
            return { actionId, priority: 50, reason: 'Increase resentment vs controller' };

        case ClandestineActionId.SPREAD_PROPAGANDA:
            // LOW - decreases resentment vs actor
            const actorRes = (location.resentment as Record<string, number>)?.[leader.faction] || 0;
            return {
                actionId,
                priority: actorRes > 20 ? 40 : 15,
                reason: actorRes > 20 ? 'High resentment against us' : 'Low resentment against us'
            };

        case ClandestineActionId.ATTACK_TAX_CONVOYS:
            // MEDIUM - steal gold
            return { actionId, priority: 45, reason: 'Steal gold from enemy' };

        case ClandestineActionId.STEAL_FROM_GRANARIES:
            // LOW - reduce food
            return { actionId, priority: 25, reason: 'Sabotage food supply' };

        case ClandestineActionId.BURN_CROP_FIELDS:
            // LOW - destroy capacity (rural only)
            return {
                actionId,
                priority: location.type === 'RURAL' ? 20 : 0,
                reason: 'Destroy agricultural capacity'
            };

        case ClandestineActionId.START_URBAN_FIRE:
            // LOW - destroy districts (city only)
            return {
                actionId,
                priority: location.type === 'CITY' ? 20 : 0,
                reason: 'Destroy urban districts'
            };

        default:
            return { actionId, priority: 0, reason: 'Not a support action' };
    }
}

/**
 * Get all support actions sorted by priority
 */
export function getSortedSupportActions(
    location: Location,
    leader: Character
): SupportActionPriority[] {
    const supportActions = [
        ClandestineActionId.UNDERMINE_AUTHORITIES,
        ClandestineActionId.DISTRIBUTE_PAMPHLETS,
        ClandestineActionId.SPREAD_PROPAGANDA,
        ClandestineActionId.ATTACK_TAX_CONVOYS,
        ClandestineActionId.STEAL_FROM_GRANARIES,
        ClandestineActionId.BURN_CROP_FIELDS,
        ClandestineActionId.START_URBAN_FIRE
    ];

    return supportActions
        .map(id => calculateSupportPriority(id, location, leader))
        .filter(p => p.priority > 0)
        .sort((a, b) => b.priority - a.priority);
}
