/**
 * Leader Recruitment Evaluator
 * 
 * Evaluates recruitable leaders to determine their value for AI recruitment decisions.
 * Uses IPG-compatible metrics to compare leaders on a unified gold-equivalent scale.
 * 
 * Evaluation considers:
 * - stabilityPerTurn: Converted to gold value via tax revenue potential
 * - clandestineOps/statesmanship: Uses existing IPG calculations
 * - Abilities: Fixed bonuses based on strategic value
 * 
 * @module shared/services/ai/leaders/evaluation
 */

import { Character, Location, FactionId, CharacterStatus } from '../../../../types';
import { LeaderStatLevel } from '../../../../types/leaderTypes';
import {
    calculateGrandIPG,
    calculateNeutralIPG,
    calculateMinorIPG,
    calculateGovernorIPG
} from '../utils/IPGCalculator';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Assumed remaining game duration for value calculations */
export const ASSUMED_REMAINING_TURNS = 30;

/** Stability threshold below which a territory needs stabilization */
const STABILITY_NEEDS_ATTENTION = 81;

/** Stability cost of increasing personal taxes by one tier */
const TAX_INCREASE_STABILITY_COST = 30;

/** Minimum territories to consider PARANOID valuable */
const PARANOID_MIN_TERRITORIES = 4;

/** Ability value bonuses (in gold-equivalent per recruitment) */
export const ABILITY_VALUES: Record<string, number | ((territories: number) => number)> = {
    CONSCRIPTION: 15,      // Saves ~25g/turn but not used every turn
    SMUGGLER: 0,           // No AI mechanic, very specific use case
    ELITE_NETWORKS: 15,    // Free minor missions, valuable for clandestine
    MANAGER: 10,           // +20g/turn when in city, but not always in city
    DAREDEVIL: 10,         // Survival chance on capture, uncertain long-term value
    PARANOID: (territories: number) => territories >= PARANOID_MIN_TERRITORIES ? 20 : 0,
    FIREBRAND: 0,          // Already included in IPG calculations
    GHOST: 0               // Low strategic value for AI
};

// ============================================================================
// TYPES
// ============================================================================

export interface LeaderEvaluationContext {
    /** All locations in the game */
    locations: Location[];
    /** Locations controlled by the evaluating faction */
    controlledLocations: Location[];
    /** Current faction revenues (gold per turn) */
    factionRevenues: number;
    /** Number of living leaders for the faction */
    livingLeadersCount: number;
    /** All characters (for reference) */
    characters: Character[];
    /** The faction doing the evaluation */
    faction: FactionId;
}

export interface LeaderEvaluationResult {
    leaderId: string;
    leaderName: string;
    /** Total calculated value in gold-equivalent */
    totalValue: number;
    /** Breakdown of value components */
    breakdown: {
        stabilityValue: number;
        clandestineValue: number;
        governorValue: number;
        abilityBonuses: number;
    };
    /** Reasoning for the evaluation */
    reasoning: string[];
}

// ============================================================================
// MAIN EVALUATION FUNCTION
// ============================================================================

/**
 * Evaluate a recruitable leader for CONSPIRATORS faction.
 * Returns a gold-equivalent value that can be compared across leaders.
 */
export function evaluateRecruitableLeader(
    leader: Character,
    context: LeaderEvaluationContext
): LeaderEvaluationResult {
    const reasoning: string[] = [];
    let stabilityValue = 0;
    let clandestineValue = 0;
    let governorValue = 0;
    let abilityBonuses = 0;

    const stats = leader.stats;
    if (!stats) {
        return {
            leaderId: leader.id,
            leaderName: leader.name,
            totalValue: 0,
            breakdown: { stabilityValue, clandestineValue, governorValue, abilityBonuses },
            reasoning: ['Leader has no stats defined']
        };
    }

    // =========================================================================
    // 1. STABILITY VALUE CALCULATION
    // =========================================================================
    stabilityValue = calculateStabilityValue(leader, context, reasoning);

    // =========================================================================
    // 2. CLANDESTINE/STATESMANSHIP VALUE (Best IPG Role)
    // =========================================================================
    const roleResult = calculateBestRoleValue(leader, context, reasoning);
    clandestineValue = roleResult.clandestineValue;
    governorValue = roleResult.governorValue;

    // =========================================================================
    // 3. ABILITY BONUSES
    // =========================================================================
    abilityBonuses = calculateAbilityBonuses(leader, context, reasoning);

    // =========================================================================
    // TOTAL
    // =========================================================================
    const totalValue = stabilityValue + clandestineValue + governorValue + abilityBonuses;

    reasoning.push(`TOTAL: ${totalValue.toFixed(1)} (Stab=${stabilityValue.toFixed(1)}, Clan=${clandestineValue.toFixed(1)}, Gov=${governorValue.toFixed(1)}, Abilities=${abilityBonuses})`);

    return {
        leaderId: leader.id,
        leaderName: leader.name,
        totalValue,
        breakdown: { stabilityValue, clandestineValue, governorValue, abilityBonuses },
        reasoning
    };
}

// ============================================================================
// STABILITY VALUE CALCULATION
// ============================================================================

/**
 * Calculate the gold-equivalent value of a leader's stabilityPerTurn stat.
 * 
 * Formula: (SecondCityPop / 2000) × (ASSUMED_REMAINING_TURNS - turnsToGainStability) / ASSUMED_REMAINING_TURNS
 * 
 * Fallbacks:
 * - Returns 0 if faction controls 0 or 1 city
 * - Returns 0 if leader has stabilityPerTurn <= 0
 */
function calculateStabilityValue(
    leader: Character,
    context: LeaderEvaluationContext,
    reasoning: string[]
): number {
    const stabilityPerTurn = leader.stats?.stabilityPerTurn || 0;

    // Fallback: No value if stability bonus is 0 or negative
    if (stabilityPerTurn <= 0) {
        reasoning.push(`Stability: 0 (stabilityPerTurn=${stabilityPerTurn} <= 0)`);
        return 0;
    }

    // Get cities controlled by faction, sorted by population descending
    const controlledCities = context.controlledLocations
        .filter(l => l.type === 'CITY')
        .sort((a, b) => (b.population || 0) - (a.population || 0));

    // Fallback: Need at least 2 cities for this calculation
    if (controlledCities.length < 2) {
        reasoning.push(`Stability: 0 (faction controls < 2 cities)`);
        return 0;
    }

    // Check if any territory needs stabilization
    const territoriesNeedingStability = context.controlledLocations.filter(
        l => l.stability < STABILITY_NEEDS_ATTENTION
    );

    // If no territories need stability AND we have enough leaders, skip
    const leadersNeeded = Math.ceil(context.controlledLocations.length / 2);
    if (territoriesNeedingStability.length === 0 && context.livingLeadersCount >= leadersNeeded) {
        reasoning.push(`Stability: 0 (no territories < ${STABILITY_NEEDS_ATTENTION}% stability, enough leaders)`);
        return 0;
    }

    // Use second most populous city for calculation
    const secondCity = controlledCities[1];
    const secondCityPop = secondCity.population || 0;

    // Tax gain per turn from increasing personal taxes (pop / 2000)
    const taxGainPerTurn = secondCityPop / 2000;

    // Turns needed to gain 30% stability (to offset tax increase cost)
    const turnsToGainStability = TAX_INCREASE_STABILITY_COST / stabilityPerTurn;

    // Effective turns of benefit
    const effectiveTurns = ASSUMED_REMAINING_TURNS - turnsToGainStability;

    if (effectiveTurns <= 0) {
        reasoning.push(`Stability: 0 (would take ${turnsToGainStability.toFixed(1)} turns to offset tax increase, > ${ASSUMED_REMAINING_TURNS} remaining)`);
        return 0;
    }

    // Value = average gold per turn over game duration
    const value = (taxGainPerTurn * effectiveTurns) / ASSUMED_REMAINING_TURNS;

    reasoning.push(`Stability: ${value.toFixed(1)} (${secondCity.name} pop=${secondCityPop}, +${stabilityPerTurn}%/turn, ${effectiveTurns.toFixed(0)} effective turns)`);

    return value;
}

// ============================================================================
// CLANDESTINE/GOVERNOR VALUE CALCULATION
// ============================================================================

interface RoleValueResult {
    clandestineValue: number;
    governorValue: number;
}

/**
 * Calculate the best role value for a leader using IPG calculations.
 * Considers: Minor missions, INCITE_NEUTRAL, GRAND_INSURRECTION, GOVERNOR.
 * 
 * Constraints:
 * - Governor only calculated if territories have stability < 81%
 * - Major missions (INCITE_NEUTRAL, GRAND_INSURRECTION) only if revenues >= 150
 */
function calculateBestRoleValue(
    leader: Character,
    context: LeaderEvaluationContext,
    reasoning: string[]
): RoleValueResult {
    const clandestineOps = getStatLevel(leader.stats?.clandestineOps);
    const statesmanship = getStatLevel(leader.stats?.statesmanship);
    const discretion = getStatLevel(leader.stats?.discretion);

    let bestClandestineIPG = 0;
    let bestClandestineDetails = '';
    let bestGovernorIPG = 0;
    let bestGovernorDetails = '';

    // Get enemy locations for clandestine calculations
    const enemyLocations = context.locations.filter(
        l => l.faction !== context.faction && l.faction !== FactionId.NEUTRAL
    );

    // Get territories needing stabilization
    const territoriesNeedingStability = context.controlledLocations.filter(
        l => l.stability < STABILITY_NEEDS_ATTENTION
    );

    // =========================================================================
    // CLANDESTINE CALCULATIONS
    // =========================================================================

    if (clandestineOps > 0 && enemyLocations.length > 0) {
        // Use a representative enemy location (most populous city)
        const targetLocation = enemyLocations
            .filter(l => l.type === 'CITY')
            .sort((a, b) => (b.population || 0) - (a.population || 0))[0]
            || enemyLocations[0];

        // Minor mission IPG
        const minorResult = calculateMinorIPG(
            targetLocation,
            clandestineOps,
            context.faction,
            discretion,
            context.faction
        );
        if (minorResult.ipg > bestClandestineIPG) {
            bestClandestineIPG = minorResult.ipg;
            bestClandestineDetails = `Minor @ ${targetLocation.name}`;
        }

        // Major missions only if revenues >= 150
        if (context.factionRevenues >= 150) {
            // INCITE_NEUTRAL IPG
            const neutralIPG = calculateNeutralIPG(targetLocation, clandestineOps, context.faction, discretion);
            if (neutralIPG > bestClandestineIPG) {
                bestClandestineIPG = neutralIPG;
                bestClandestineDetails = `Neutral @ ${targetLocation.name}`;
            }

            // GRAND_INSURRECTION IPG (using standard 400g budget)
            const grandIPG = calculateGrandIPG(targetLocation, clandestineOps, 400, context.faction);
            if (grandIPG > bestClandestineIPG) {
                bestClandestineIPG = grandIPG;
                bestClandestineDetails = `Grand @ ${targetLocation.name}`;
            }
        }
    }

    // =========================================================================
    // GOVERNOR CALCULATIONS (only if territories need stabilization)
    // =========================================================================

    if (territoriesNeedingStability.length > 0 && statesmanship > 0) {
        // Use the most unstable territory for calculation
        const targetTerritory = territoriesNeedingStability
            .sort((a, b) => a.stability - b.stability)[0];

        const govResult = calculateGovernorIPG(leader, targetTerritory, context.faction);
        if (govResult.ipg > bestGovernorIPG) {
            bestGovernorIPG = govResult.ipg;
            bestGovernorDetails = `Gov @ ${targetTerritory.name}`;
        }
    }

    // =========================================================================
    // DETERMINE BEST VALUE
    // =========================================================================

    // Use the better of clandestine or governor IPG as the role value
    const clandestineValue = bestClandestineIPG;
    const governorValue = bestGovernorIPG;

    if (clandestineValue > 0) {
        reasoning.push(`Clandestine: IPG=${clandestineValue.toFixed(2)} (${bestClandestineDetails})`);
    } else {
        reasoning.push(`Clandestine: 0 (no valid targets or ops=0)`);
    }

    if (governorValue > 0) {
        reasoning.push(`Governor: IPG=${governorValue.toFixed(2)} (${bestGovernorDetails})`);
    } else if (territoriesNeedingStability.length === 0) {
        reasoning.push(`Governor: 0 (no territories need stabilization)`);
    } else {
        reasoning.push(`Governor: 0 (statesmanship too low)`);
    }

    return { clandestineValue, governorValue };
}

// ============================================================================
// ABILITY BONUSES
// ============================================================================

/**
 * Calculate ability bonuses for a leader.
 */
function calculateAbilityBonuses(
    leader: Character,
    context: LeaderEvaluationContext,
    reasoning: string[]
): number {
    const abilities = leader.stats?.ability || [];
    const grantedAbilities = leader.grantedAbilities || [];
    const disabledAbilities = leader.disabledAbilities || [];

    // Combine and filter abilities
    const activeAbilities = [...abilities, ...grantedAbilities]
        .filter(a => a && a !== 'NONE' && !disabledAbilities.includes(a));

    let totalBonus = 0;
    const bonusDetails: string[] = [];

    for (const ability of activeAbilities) {
        const valueOrFn = ABILITY_VALUES[ability];
        if (valueOrFn === undefined) continue;

        let value: number;
        if (typeof valueOrFn === 'function') {
            value = valueOrFn(context.controlledLocations.length);
        } else {
            value = valueOrFn;
        }

        if (value > 0) {
            totalBonus += value;
            bonusDetails.push(`${ability}=+${value}`);
        }
    }

    if (bonusDetails.length > 0) {
        reasoning.push(`Abilities: +${totalBonus} (${bonusDetails.join(', ')})`);
    } else {
        reasoning.push(`Abilities: 0 (no valuable abilities)`);
    }

    return totalBonus;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert LeaderStatLevel enum to numeric value (1-5).
 */
function getStatLevel(stat: LeaderStatLevel | number | undefined): number {
    if (stat === undefined) return 0;
    if (typeof stat === 'number') return stat;

    switch (stat) {
        case LeaderStatLevel.INEPT: return 1;
        case LeaderStatLevel.UNRELIABLE: return 2;
        case LeaderStatLevel.CAPABLE: return 3;
        case LeaderStatLevel.EFFECTIVE: return 4;
        case LeaderStatLevel.EXCEPTIONAL: return 5;
        default: return 0;
    }
}

// ============================================================================
// BATCH EVALUATION
// ============================================================================

/**
 * Evaluate all recruitable leaders and return sorted by value (descending).
 */
export function evaluateAllRecruitableLeaders(
    recruitableLeaders: Character[],
    context: LeaderEvaluationContext
): LeaderEvaluationResult[] {
    const results = recruitableLeaders.map(leader => 
        evaluateRecruitableLeader(leader, context)
    );

    // Sort by total value descending
    return results.sort((a, b) => b.totalValue - a.totalValue);
}

/**
 * Get the best recruitable leader for a faction.
 * Returns null if no leaders are available.
 */
export function getBestRecruitableLeader(
    recruitableLeaders: Character[],
    context: LeaderEvaluationContext
): LeaderEvaluationResult | null {
    const evaluated = evaluateAllRecruitableLeaders(recruitableLeaders, context);
    return evaluated.length > 0 ? evaluated[0] : null;
}
