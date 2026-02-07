/**
 * Leader Nobles Recruitment Evaluator
 * 
 * Evaluates recruitable leaders for NOBLES faction AI recruitment decisions.
 * Uses gold-equivalent metrics to compare leaders against the fief cost (30g/turn).
 * 
 * Evaluation components:
 * - stabilityPerTurn: Tax revenue potential from second most populous city
 * - clandestineOps/statesmanship: IPG calculations for missions/governor roles
 * - Abilities: Fixed bonuses based on strategic value
 * - Special effects: Leader-specific bonuses (ystrir gold, esmarch soldiers, etc.)
 * 
 * @module shared/services/ai/leaders/evaluation
 */

import { Character, Location, FactionId, CharacterStatus, Army } from '../../../../types';
import { LeaderStatLevel, LeaderAbilityNew } from '../../../../types/leaderTypes';
import {
    calculateGrandIPG,
    calculateNeutralIPG,
    calculateMinorIPG,
    calculateGovernorIPG,
    calculateGrandInsurgents
} from '../utils/IPGCalculator';
import {
    GEORGES_CADAL_TERRITORIES,
    DUKE_HORNVALE_TERRITORIES,
    GEORGES_CADAL_BUDGET,
    DUKE_HORNVALE_BUDGET,
    BARON_YSTRIR_GOLD,
    DUKE_ESMARCH_SOLDIERS,
    DUKE_GREAT_PLAINS_BUDGET
} from '../../../domain/leaders/noblesRecruitment';

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

/** Minimum fief cost per turn (threshold for recruitment) */
export const FIEF_COST_PER_TURN = 30;

/** Minimum revenues to consider major clandestine missions */
const MIN_REVENUES_FOR_MAJOR_MISSIONS = 150;

/** Ability value bonuses (in gold-equivalent per turn over 30 turns) */
export const NOBLES_ABILITY_VALUES: Partial<Record<LeaderAbilityNew, number | ((territories: number) => number)>> = {
    CONSCRIPTION: 15,      // Saves ~35g/turn but cost stab and not used every turn
    SMUGGLER: 0,           // No AI mechanic, very specific use case
    ELITE_NETWORKS: 15,    // Free minor missions, valuable for clandestine
    MANAGER: 10,           // +20g/turn when in city, but not always in city
    DAREDEVIL: 10,         // Survival chance on capture, uncertain long-term value
    PARANOID: (territories: number) => territories >= PARANOID_MIN_TERRITORIES ? 20 : 0,
    FIREBRAND: 0,          // Already included in IPG calculations
    GHOST: 0,             // Low strategic value for AI
    AGITATIONAL_NETWORKS: 10 // Bonus gold for clandestine missions
};

// ============================================================================
// TYPES
// ============================================================================

export interface NoblesLeaderEvaluationContext {
    /** All locations in the game */
    locations: Location[];
    /** Locations controlled by NOBLES */
    controlledLocations: Location[];
    /** Current faction gold revenues (per turn) */
    factionRevenues: number;
    /** Current food surplus from city/rural pairs */
    foodSurplus: number;
    /** Number of living leaders for NOBLES */
    livingLeadersCount: number;
    /** All characters */
    characters: Character[];
    /** All armies */
    armies: Army[];
}

export interface NoblesLeaderEvaluationResult {
    leaderId: string;
    leaderName: string;
    /** Total calculated value in gold-equivalent per turn */
    totalValue: number;
    /** Breakdown of value components */
    breakdown: {
        stabilityValue: number;
        clandestineValue: number;
        governorValue: number;
        abilityBonuses: number;
        specialEffectValue: number;
    };
    /** Reasoning for the evaluation */
    reasoning: string[];
}

// ============================================================================
// SPECIAL LEADER IDS
// ============================================================================

/** Leaders with priority evaluation (even when territories <= leaders or low revenues) */
export const PRIORITY_LEADERS = [
    'baron_ystrir',
    'duke_esmarch',
    'duke_great_plains',
    'georges_cadal',
    'duke_hornvale'
];

// ============================================================================
// MAIN EVALUATION FUNCTION
// ============================================================================

/**
 * Evaluate a recruitable leader for NOBLES faction.
 * Returns a gold-equivalent value per turn that can be compared to fief cost (30g/turn).
 */
export function evaluateNoblesRecruitableLeader(
    leader: Character,
    context: NoblesLeaderEvaluationContext
): NoblesLeaderEvaluationResult {
    const reasoning: string[] = [];
    let stabilityValue = 0;
    let clandestineValue = 0;
    let governorValue = 0;
    let abilityBonuses = 0;
    let specialEffectValue = 0;

    const stats = leader.stats;
    if (!stats) {
        return {
            leaderId: leader.id,
            leaderName: leader.name,
            totalValue: 0,
            breakdown: { stabilityValue, clandestineValue, governorValue, abilityBonuses, specialEffectValue },
            reasoning: ['Leader has no stats defined']
        };
    }

    // =========================================================================
    // 1. STABILITY VALUE CALCULATION
    // =========================================================================
    stabilityValue = calculateNoblesStabilityValue(leader, context, reasoning);

    // =========================================================================
    // 2. CLANDESTINE/STATESMANSHIP VALUE (Best IPG Role)
    // =========================================================================
    const roleResult = calculateNoblesRoleValue(leader, context, reasoning);
    clandestineValue = roleResult.clandestineValue;
    governorValue = roleResult.governorValue;

    // =========================================================================
    // 3. ABILITY BONUSES
    // =========================================================================
    abilityBonuses = calculateNoblesAbilityBonuses(leader, context, reasoning);

    // =========================================================================
    // 4. SPECIAL EFFECT VALUE (leader-specific)
    // =========================================================================
    specialEffectValue = calculateSpecialEffectValue(leader, context, reasoning);

    // =========================================================================
    // TOTAL
    // =========================================================================
    const totalValue = stabilityValue + clandestineValue + governorValue + abilityBonuses + specialEffectValue;

    reasoning.push(`TOTAL: ${totalValue.toFixed(1)}g/turn (Stab=${stabilityValue.toFixed(1)}, Clan=${clandestineValue.toFixed(1)}, Gov=${governorValue.toFixed(1)}, Abilities=${abilityBonuses}, Special=${specialEffectValue.toFixed(1)})`);

    return {
        leaderId: leader.id,
        leaderName: leader.name,
        totalValue,
        breakdown: { stabilityValue, clandestineValue, governorValue, abilityBonuses, specialEffectValue },
        reasoning
    };
}

// ============================================================================
// STABILITY VALUE CALCULATION
// ============================================================================

/**
 * Calculate the gold-equivalent value of a leader's stabilityPerTurn stat for NOBLES.
 * 
 * Formula: (SecondCityPop / 2000) × (ASSUMED_REMAINING_TURNS - turnsToGainStability) / ASSUMED_REMAINING_TURNS
 * 
 * Fallbacks:
 * - Returns 0 if faction controls 0 or 1 city
 * - Returns 0 if leader has stabilityPerTurn <= 0
 * - Returns 0 if no territories need stability AND enough leaders
 */
function calculateNoblesStabilityValue(
    leader: Character,
    context: NoblesLeaderEvaluationContext,
    reasoning: string[]
): number {
    const stabilityPerTurn = leader.stats?.stabilityPerTurn || 0;

    // Fallback: No value if stability bonus is 0 or negative
    if (stabilityPerTurn <= 0) {
        reasoning.push(`Stability: 0 (stabilityPerTurn=${stabilityPerTurn} <= 0)`);
        return 0;
    }

    // Get cities controlled by NOBLES, sorted by population descending
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
function calculateNoblesRoleValue(
    leader: Character,
    context: NoblesLeaderEvaluationContext,
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
        l => l.faction !== FactionId.NOBLES && l.faction !== FactionId.NEUTRAL
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
            FactionId.NOBLES,
            discretion,
            FactionId.NOBLES
        );
        if (minorResult.ipg > bestClandestineIPG) {
            bestClandestineIPG = minorResult.ipg;
            bestClandestineDetails = `Minor @ ${targetLocation.name}`;
        }

        // Major missions only if revenues >= 150
        if (context.factionRevenues >= MIN_REVENUES_FOR_MAJOR_MISSIONS) {
            // INCITE_NEUTRAL IPG
            const neutralIPG = calculateNeutralIPG(targetLocation, clandestineOps, FactionId.NOBLES, discretion);
            if (neutralIPG > bestClandestineIPG) {
                bestClandestineIPG = neutralIPG;
                bestClandestineDetails = `Neutral @ ${targetLocation.name}`;
            }

            // GRAND_INSURRECTION IPG (using standard 400g budget)
            const grandIPG = calculateGrandIPG(targetLocation, clandestineOps, 400, FactionId.NOBLES);
            if (grandIPG > bestClandestineIPG) {
                bestClandestineIPG = grandIPG;
                bestClandestineDetails = `Grand @ ${targetLocation.name}`;
            }
        }
    }

    // =========================================================================
    // GOVERNOR CALCULATIONS (only if territories need stabilization)
    // =========================================================================

    // Special case: duke_great_plains appears UNDERCOVER in Windward when enemy-controlled
    // He cannot act as governor in this situation
    const windward = context.locations.find(l => l.id === 'windward');
    const isDukeGreatPlainsUndercover =
        leader.id === 'duke_great_plains' &&
        windward?.faction !== FactionId.NOBLES;

    if (territoriesNeedingStability.length > 0 && statesmanship > 0 && !isDukeGreatPlainsUndercover) {
        // Use the most unstable territory for calculation
        const targetTerritory = territoriesNeedingStability
            .sort((a, b) => a.stability - b.stability)[0];

        const govResult = calculateGovernorIPG(leader, targetTerritory, FactionId.NOBLES);
        if (govResult.ipg > bestGovernorIPG) {
            bestGovernorIPG = govResult.ipg;
            bestGovernorDetails = `Gov @ ${targetTerritory.name}`;
        }
    }

    // =========================================================================
    // DETERMINE BEST VALUE
    // =========================================================================

    const clandestineValue = bestClandestineIPG;
    const governorValue = bestGovernorIPG;

    if (clandestineValue > 0) {
        reasoning.push(`Clandestine: IPG=${clandestineValue.toFixed(2)} (${bestClandestineDetails})`);
    } else {
        reasoning.push(`Clandestine: 0 (no valid targets or ops=0)`);
    }

    if (governorValue > 0) {
        reasoning.push(`Governor: IPG=${governorValue.toFixed(2)} (${bestGovernorDetails})`);
    } else if (isDukeGreatPlainsUndercover) {
        reasoning.push(`Governor: 0 (duke_great_plains UNDERCOVER in enemy Windward)`);
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
function calculateNoblesAbilityBonuses(
    leader: Character,
    context: NoblesLeaderEvaluationContext,
    reasoning: string[]
): number {
    const abilities = leader.stats?.ability || [];
    const grantedAbilities = leader.grantedAbilities || [];
    const disabledAbilities = leader.disabledAbilities || [];

    // Combine and filter abilities
    const activeAbilities = [...abilities, ...grantedAbilities]
        .filter((a): a is LeaderAbilityNew => a != null && a !== 'NONE' && !disabledAbilities.includes(a));

    let totalBonus = 0;
    const bonusDetails: string[] = [];

    for (const ability of activeAbilities) {
        const valueOrFn = NOBLES_ABILITY_VALUES[ability];
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
// SPECIAL EFFECT VALUE CALCULATION
// ============================================================================

/**
 * Calculate special effect value for specific leaders.
 * 
 * - baron_ystrir: +550 gold => 550/30 = 18.3g/turn
 * - duke_esmarch: +2000 soldiers => 200g equivalent / 30 = 6.7g/turn
 * - duke_great_plains: If NOBLES control Windward: +400g => 13.3g/turn
 *                      Otherwise: Calculate IPG for undercover mission
 * - georges_cadal: If any target territory not controlled: Calculate insurgents/30/10
 * - duke_hornvale: Same as georges_cadal but with different territories/budget
 */
function calculateSpecialEffectValue(
    leader: Character,
    context: NoblesLeaderEvaluationContext,
    reasoning: string[]
): number {
    switch (leader.id) {
        case 'baron_ystrir': {
            // 550 gold immediate => 550/30 = 18.3g/turn equivalent
            const value = BARON_YSTRIR_GOLD / ASSUMED_REMAINING_TURNS;
            reasoning.push(`Special: +${value.toFixed(1)} (${BARON_YSTRIR_GOLD}g immediate / ${ASSUMED_REMAINING_TURNS} turns)`);
            return value;
        }

        case 'duke_esmarch': {
            // 2000 soldiers = 200g equivalent (10 soldiers per gold) => 200/30 = 6.7g/turn
            const goldEquivalent = DUKE_ESMARCH_SOLDIERS / 10;
            const value = goldEquivalent / ASSUMED_REMAINING_TURNS;
            reasoning.push(`Special: +${value.toFixed(1)} (${DUKE_ESMARCH_SOLDIERS} soldiers = ${goldEquivalent}g / ${ASSUMED_REMAINING_TURNS} turns)`);
            return value;
        }

        case 'duke_great_plains': {
            const windward = context.locations.find(l => l.id === 'windward');

            if (windward?.faction === FactionId.NOBLES) {
                // Windward controlled: +400g => 13.3g/turn
                const value = DUKE_GREAT_PLAINS_BUDGET / ASSUMED_REMAINING_TURNS;
                reasoning.push(`Special: +${value.toFixed(1)} (Windward controlled: ${DUKE_GREAT_PLAINS_BUDGET}g / ${ASSUMED_REMAINING_TURNS} turns)`);
                return value;
            } else {
                // Windward enemy: Calculate IPG for GRAND_INSURRECTION or INCITE_NEUTRAL
                // Use leader's own clandestine stats (which are UNRELIABLE = 2)
                const ops = getStatLevel(leader.stats?.clandestineOps);
                const discretion = getStatLevel(leader.stats?.discretion);

                if (windward) {
                    const grandIPG = calculateGrandIPG(windward, ops, DUKE_GREAT_PLAINS_BUDGET, FactionId.NOBLES);
                    const neutralIPG = calculateNeutralIPG(windward, ops, FactionId.NOBLES, discretion);
                    const bestIPG = Math.max(grandIPG, neutralIPG);
                    reasoning.push(`Special: +${bestIPG.toFixed(1)} (Windward enemy: best IPG with ${DUKE_GREAT_PLAINS_BUDGET}g budget)`);
                    return bestIPG;
                }
                reasoning.push(`Special: 0 (Windward not found)`);
                return 0;
            }
        }

        case 'georges_cadal': {
            // Calculate potential insurgents in non-controlled territories
            const targetTerritories = GEORGES_CADAL_TERRITORIES
                .map(id => context.locations.find(l => l.id === id))
                .filter((l): l is Location => l !== undefined && l.faction !== FactionId.NOBLES);

            if (targetTerritories.length === 0) {
                reasoning.push(`Special: 0 (all Cadal territories controlled by NOBLES)`);
                return 0;
            }

            // Find best territory for GRAND_INSURRECTION
            let bestInsurgents = 0;
            let bestTerritory = '';
            const ops = getStatLevel(leader.stats?.clandestineOps);

            for (const territory of targetTerritories) {
                const insurgents = calculateGrandInsurgents(territory, ops, GEORGES_CADAL_BUDGET, FactionId.NOBLES);
                if (insurgents > bestInsurgents) {
                    bestInsurgents = insurgents;
                    bestTerritory = territory.name;
                }
            }

            // Convert to gold equivalent: insurgents / 10 (soldiers per gold) / 30 (turns)
            const goldEquivalent = bestInsurgents / 10;
            const value = goldEquivalent / ASSUMED_REMAINING_TURNS;
            reasoning.push(`Special: +${value.toFixed(1)} (${bestInsurgents} insurgents @ ${bestTerritory} = ${goldEquivalent.toFixed(0)}g / ${ASSUMED_REMAINING_TURNS} turns)`);
            return value;
        }

        case 'duke_hornvale': {
            // Similar to georges_cadal but with different territories and budget
            const targetTerritories = DUKE_HORNVALE_TERRITORIES
                .map(id => context.locations.find(l => l.id === id))
                .filter((l): l is Location => l !== undefined && l.faction !== FactionId.NOBLES);

            if (targetTerritories.length === 0) {
                reasoning.push(`Special: 0 (all Hornvale territories controlled by NOBLES)`);
                return 0;
            }

            // Find best territory for GRAND_INSURRECTION
            let bestInsurgents = 0;
            let bestTerritory = '';
            const ops = getStatLevel(leader.stats?.clandestineOps);

            for (const territory of targetTerritories) {
                const insurgents = calculateGrandInsurgents(territory, ops, DUKE_HORNVALE_BUDGET, FactionId.NOBLES);
                if (insurgents > bestInsurgents) {
                    bestInsurgents = insurgents;
                    bestTerritory = territory.name;
                }
            }

            // Convert to gold equivalent: insurgents / 10 (soldiers per gold) / 30 (turns)
            const goldEquivalent = bestInsurgents / 10;
            const value = goldEquivalent / ASSUMED_REMAINING_TURNS;
            reasoning.push(`Special: +${value.toFixed(1)} (${bestInsurgents} insurgents @ ${bestTerritory} = ${goldEquivalent.toFixed(0)}g / ${ASSUMED_REMAINING_TURNS} turns)`);
            return value;
        }

        default:
            // No special effect for other leaders
            return 0;
    }
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
export function evaluateAllNoblesRecruitableLeaders(
    recruitableLeaders: Character[],
    context: NoblesLeaderEvaluationContext
): NoblesLeaderEvaluationResult[] {
    const results = recruitableLeaders.map(leader =>
        evaluateNoblesRecruitableLeader(leader, context)
    );

    // Sort by total value descending
    return results.sort((a, b) => b.totalValue - a.totalValue);
}

/**
 * Get the best recruitable leader for NOBLES.
 * Returns null if no leaders are available.
 */
export function getBestNoblesRecruitableLeader(
    recruitableLeaders: Character[],
    context: NoblesLeaderEvaluationContext
): NoblesLeaderEvaluationResult | null {
    const evaluated = evaluateAllNoblesRecruitableLeaders(recruitableLeaders, context);
    return evaluated.length > 0 ? evaluated[0] : null;
}

/**
 * Filter leaders based on recruitment conditions.
 * 
 * - If territories <= livingLeaders OR revenues < 150 AND foodSurplus < 50:
 *   Only consider PRIORITY_LEADERS (ystrir, esmarch, etc.)
 * - Otherwise: consider all leaders
 */
export function filterNoblesRecruitableLeaders(
    recruitableLeaders: Character[],
    context: NoblesLeaderEvaluationContext
): Character[] {
    const shouldRestrictToSpecial =
        context.controlledLocations.length <= context.livingLeadersCount ||
        (context.factionRevenues < MIN_REVENUES_FOR_MAJOR_MISSIONS && context.foodSurplus < 50);

    if (shouldRestrictToSpecial) {
        return recruitableLeaders.filter(l => PRIORITY_LEADERS.includes(l.id));
    }

    return recruitableLeaders;
}
