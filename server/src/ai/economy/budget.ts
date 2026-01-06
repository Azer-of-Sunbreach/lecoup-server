// Budget Module - Budget allocation and optimization

import { GameState, FactionId, Army } from '../../../../shared/types';
import { AIBudget } from '../types';

/**
 * Apply Republican early game override (Turn 1-4).
 * Shifts budget heavily toward recruitment.
 */
export function applyRepublicanEarlyGameOverride(
    faction: FactionId,
    turn: number,
    budget: AIBudget
): void {
    if (faction === FactionId.REPUBLICANS && turn <= 4) {
        const totalAvail = budget.available + budget.reserved;
        budget.allocations.recruitment = Math.floor(totalAvail * 0.8);
        budget.allocations.diplomacy = Math.floor(totalAvail * 0.2);
        budget.allocations.fortification = 0;
        budget.reserved = 0;
    }
}

/**
 * Apply weak army override - prioritize recruitment when forces are low.
 */
export function applyWeakArmyOverride(
    faction: FactionId,
    armies: Army[],
    budget: AIBudget
): void {
    const myTotalStrength = armies
        .filter(a => a.faction === faction)
        .reduce((s, a) => s + a.strength, 0);

    if (myTotalStrength < 3000) {
        const extra = Math.floor(budget.reserved * 0.8);
        budget.reserved -= extra;
        budget.allocations.recruitment += extra;
    }
}

/**
 * Apply balanced recruitment override - ensures recruitment doesn't consume insurrection budget.
 * Balances between recruitment needs and pending insurrection missions.
 */
export function applyBalancedRecruitmentOverride(
    faction: FactionId,
    state: GameState,
    budget: AIBudget,
    armies: Army[]
): void {
    // 1. Calculate insurrection budget needs (PLANNING missions × 250 average cost)
    const pendingInsurrections = state.aiState?.[faction]?.missions
        ?.filter(m => m.type === 'INSURRECTION' && m.status === 'PLANNING').length || 0;
    const insurrectionReserve = pendingInsurrections * 250;

    // 2. Calculate surplus available after insurrection reserve
    const minReserve = Math.max(100, insurrectionReserve);
    const surplus = budget.total - minReserve;

    // 3. If we're weaker than enemies AND have surplus, recruit aggressively
    const myStrength = armies
        .filter(a => a.faction === faction)
        .reduce((s, a) => s + a.strength, 0);
    const enemyStrength = armies
        .filter(a => a.faction !== faction && a.faction !== FactionId.NEUTRAL)
        .reduce((s, a) => s + a.strength, 0);

    if (myStrength < enemyStrength && surplus > 200) {
        // Convert 70% of surplus to recruitment
        const extraRecruitment = Math.floor(surplus * 0.7);
        budget.allocations.recruitment += extraRecruitment;
        // Reduce reserve but keep minimum for insurrections
        budget.reserved = Math.max(minReserve, budget.reserved - Math.floor(surplus * 0.5));
        console.log(`[AI BUDGET ${faction}] Aggressive Recruitment: +${extraRecruitment} (Surplus: ${surplus}, InsurrRes: ${insurrectionReserve})`);
    }

    // 4. If very wealthy (gold > 600) but low recruitment allocation, boost it
    if (budget.total > 600 && budget.allocations.recruitment < budget.total * 0.5) {
        const boost = Math.floor((budget.total - budget.allocations.recruitment) * 0.3);
        budget.allocations.recruitment += boost;
        budget.reserved = Math.max(minReserve, budget.reserved - boost);
        console.log(`[AI BUDGET ${faction}] Wealth Boost: +${boost} to recruitment`);
    }
}

/**
 * Allocate siege budget for active campaigns.
 * Takes from diplomacy and reserve to fund siege operations.
 * Note: All factions except NEUTRAL can siege (Nobles CAN siege, they just can't negotiate with neutrals).
 */
export function allocateSiegeBudget(
    faction: FactionId,
    state: GameState,
    budget: AIBudget
): void {
    // Only Neutral doesn't siege
    if (faction === FactionId.NEUTRAL) return;

    const missions = state.aiState?.[faction]?.missions || [];

    // Calculate total siege cost needed
    let totalSiegeCost = 0;
    const SIEGE_COSTS: Record<number, number> = { 1: 15, 2: 30, 3: 50, 4: 100 };

    for (const m of missions) {
        if (m.type !== 'CAMPAIGN' || (m.status !== 'ACTIVE' && m.status !== 'PLANNING')) continue;
        const target = state.locations.find(l => l.id === m.targetId);
        if (target && target.fortificationLevel > 0 && target.faction !== faction) {
            totalSiegeCost += SIEGE_COSTS[target.fortificationLevel] || 50;
        }
    }

    if (totalSiegeCost > 0) {
        const currentSiege = budget.allocations.siege || 0;
        const deficit = totalSiegeCost - currentSiege;

        if (deficit > 0) {
            let taken = 0;

            // Try taking from Diplomacy first (not recruitment)
            if (budget.allocations.diplomacy > 100) {
                const toTake = Math.min(deficit, budget.allocations.diplomacy - 100);
                if (toTake > 0) {
                    budget.allocations.diplomacy -= toTake;
                    taken += toTake;
                }
            }

            // Try taking from Reserve
            if (taken < deficit && budget.reserved > 50) {
                const toTake = Math.min(deficit - taken, budget.reserved - 50);
                if (toTake > 0) {
                    budget.reserved -= toTake;
                    taken += toTake;
                }
            }

            budget.allocations.siege = currentSiege + taken;
            if (taken > 0) {
                console.log(`[AI BUDGET ${faction}] Siege allocation: ${taken} (Total sieges needed: ${totalSiegeCost})`);
            }
        }
    }
}

/**
 * Calculate current gold available for spending.
 * Excludes siege money to protect it.
 */
export function calculateAvailableGold(budget: AIBudget): number {
    return budget.allocations.recruitment + budget.allocations.fortification;
}

