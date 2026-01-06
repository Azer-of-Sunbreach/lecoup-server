/**
 * IPG Calculator - Centralized IPG (Insurgents Per Gold) Calculations
 * 
 * Provides standardized formulas for comparing different leader assignments:
 * - Governor: Insurgents prevented per gold spent on governance
 * - Clandestine Major: Insurgents generated per gold (Grand/Neutral)
 * - Clandestine Minor: Delta insurgents from stability reduction per gold
 * - Commander: Combat value per opportunity cost
 * 
 * @module shared/services/ai/leaders/utils
 */

import { Character, Location, FactionId, Army } from '../../../../types';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Cost of governance per turn (stabilize policy) */
const GOVERNANCE_COST_PER_TURN = 10;

/** Default turns for governance IPG calculation */
const DEFAULT_GOVERNANCE_TURNS = 5;

/** Minor mission budget assumption (100g total, 50g effective) */
const MINOR_MISSION_BUDGET = 100;

/** Minor mission active turns (after 2 turns travel) */
const MINOR_MISSION_ACTIVE_TURNS = 5;

/** IPG floor - below this, clandestine missions are not worth it */
export const IPG_FLOOR = 10;

/** Reduced IPG floor when faction is gold-rich */
const IPG_FLOOR_REDUCED = 5;

/** Gold threshold above which IPG floor is reduced */
const GOLD_RICH_THRESHOLD = 1000;

/**
 * Get effective IPG floor based on faction wealth.
 * If faction has >1000g, floor is reduced to 5 (need to spend excess gold).
 * Otherwise floor is 10 (equivalent to recruiting: 50g = 500 soldiers).
 */
export function getEffectiveIPGFloor(factionGold: number): number {
    return factionGold > GOLD_RICH_THRESHOLD ? IPG_FLOOR_REDUCED : IPG_FLOOR;
}

/** Bonus multiplier when target stability <= 60 */
const LOW_STABILITY_BONUS = 1.2;

// ============================================================================
// GRAND INSURRECTION FORMULA
// ============================================================================

/**
 * Calculate insurgents from Grand Insurrection.
 * 
 * Formula: ((Gold/25) × (Pop/100000)) × (100 - EffectiveStab) × ResentmentFactor + 100
 * EffectiveStab = Max(0, Stability - (Ops × 4))
 */
export function calculateGrandInsurgents(
    location: Location,
    ops: number,
    gold: number,
    actorFaction: FactionId
): number {
    const stabilityShock = ops * 4;
    const effectiveStability = Math.max(0, location.stability - stabilityShock);
    const stabilityFactor = 100 - effectiveStability;

    // Resentment factors
    const ownerResentment = getResentmentAgainst(location, location.faction);
    const actorResentment = getResentmentAgainst(location, actorFaction);
    const resentmentFactor = 1 + (ownerResentment / 100) - (actorResentment / 100);

    const insurgents = ((gold / 25) * (location.population / 100000)) * stabilityFactor * resentmentFactor + 100;
    return Math.floor(insurgents);
}

/**
 * Calculate IPG for Grand Insurrection.
 */
export function calculateGrandIPG(
    location: Location,
    ops: number,
    gold: number,
    actorFaction: FactionId
): number {
    if (gold <= 0) return 0;
    const insurgents = calculateGrandInsurgents(location, ops, gold, actorFaction);
    return insurgents / gold;
}

// ============================================================================
// NEUTRAL INSURRECTION FORMULA
// ============================================================================

/**
 * Calculate insurgents per turn from Incite Neutral Insurrections.
 * 
 * Formula: (Pop × Ops × (Resentment+1)) / (Divisor × (1 + Stab/100))
 * Divisor: 10000 for city, 100000 for rural
 */
export function calculateNeutralInsurgentsPerTurn(
    location: Location,
    ops: number,
    actorFaction: FactionId
): number {
    const resentment = getResentmentAgainst(location, location.faction);
    const isCity = location.type === 'CITY';
    const divisor = isCity ? 10000 : 100000;
    const stabilityFactor = 1 + (location.stability / 100);

    const numerator = location.population * ops * (resentment + 1);
    const insurgents = numerator / (divisor * stabilityFactor);
    return Math.min(1500, Math.ceil(insurgents));
}

/**
 * Calculate IPG for Incite Neutral Insurrections.
 * Assumes 4 turns total (1 setup + 3 productive), 50g/turn = 200g total.
 */
export function calculateNeutralIPG(
    location: Location,
    ops: number,
    actorFaction: FactionId
): number {
    const perTurn = calculateNeutralInsurgentsPerTurn(location, ops, actorFaction);
    const totalInsurgents = perTurn * 3; // 3 productive turns
    const totalCost = 200; // 50g × 4 turns
    return totalCost > 0 ? totalInsurgents / totalCost : 0;
}

// ============================================================================
// MINOR MISSION (UNDERMINE) IPG
// ============================================================================

/**
 * Calculate IPG for Minor Mission (Undermine).
 * 
 * Calculates delta insurgents from stability reduction for both Grand and Neutral,
 * takes the maximum, and divides by mission cost.
 * 
 * Stability damage = 5 turns × Ops × 2
 * Mission cost = 100g
 */
export function calculateMinorIPG(
    location: Location,
    ops: number,
    actorFaction: FactionId
): { ipg: number; details: string } {
    const stabilityDamage = MINOR_MISSION_ACTIVE_TURNS * ops * 2;
    const reducedStability = Math.max(0, location.stability - stabilityDamage);

    // Create modified location for comparison
    const reducedLocation: Location = {
        ...location,
        stability: reducedStability
    };

    // Use STANDARD_OPS (4) for the hypothetical Grand Insurrection calculation
    // This measures the VALUE of the stability reduction, not the Minor leader's ops
    const STANDARD_OPS = 4;

    // Delta for Grand Insurrection (with standard ops)
    const grandAtCurrent = calculateGrandInsurgents(location, STANDARD_OPS, 400, actorFaction);
    const grandAtReduced = calculateGrandInsurgents(reducedLocation, STANDARD_OPS, 400, actorFaction);
    const deltaGrand = grandAtReduced - grandAtCurrent;

    // Delta for Neutral Insurrections (3 productive turns, with standard ops)
    const neutralAtCurrent = calculateNeutralInsurgentsPerTurn(location, STANDARD_OPS, actorFaction) * 3;
    const neutralAtReduced = calculateNeutralInsurgentsPerTurn(reducedLocation, STANDARD_OPS, actorFaction) * 3;
    const deltaNeutral = neutralAtReduced - neutralAtCurrent;

    // Use the better of the two
    const deltaInsurgents = Math.max(deltaGrand, deltaNeutral);
    const deltaType = deltaGrand >= deltaNeutral ? 'Grand' : 'Neutral';

    let ipg = deltaInsurgents / MINOR_MISSION_BUDGET;

    // Bonus if stability <= 60 (easy to push under 50 threshold)
    if (location.stability <= 60) {
        ipg *= LOW_STABILITY_BONUS;
    }

    return {
        ipg,
        details: `Stab ${location.stability}->${reducedStability}, Δ${deltaType}=${deltaInsurgents.toFixed(0)}`
    };
}

// ============================================================================
// GOVERNOR IPG (REVERSE ITG)
// ============================================================================

/**
 * Calculate IPG for Governor assignment.
 * 
 * Measures insurgents PREVENTED by stability gain.
 * Formula: InsurgentsPrevented / GovernanceCost
 */
export function calculateGovernorIPG(
    leader: Character,
    location: Location,
    actorFaction: FactionId,
    turns: number = DEFAULT_GOVERNANCE_TURNS
): { ipg: number; details: string } {
    const statesmanship = leader.stats?.statesmanship || 3;
    const stabilityPerTurn = leader.stats?.stabilityPerTurn || 0;
    const stabilityGain = (statesmanship + stabilityPerTurn) * turns;
    const improvedStability = Math.min(100, location.stability + stabilityGain);

    // Create improved location for comparison
    const improvedLocation: Location = {
        ...location,
        stability: improvedStability
    };

    // Calculate insurgents prevented using Grand formula (enemy with ops=4, gold=400)
    const currentInsurgents = calculateGrandInsurgents(location, 4, 400, FactionId.NEUTRAL);
    const improvedInsurgents = calculateGrandInsurgents(improvedLocation, 4, 400, FactionId.NEUTRAL);
    const grandPrevented = currentInsurgents - improvedInsurgents;

    // Calculate insurgents prevented using Neutral formula
    const currentNeutral = calculateNeutralInsurgentsPerTurn(location, 4, FactionId.NEUTRAL) * 3;
    const improvedNeutral = calculateNeutralInsurgentsPerTurn(improvedLocation, 4, FactionId.NEUTRAL) * 3;
    const neutralPrevented = currentNeutral - improvedNeutral;

    // Use the better scenario
    const prevented = Math.max(grandPrevented, neutralPrevented);
    const preventType = grandPrevented >= neutralPrevented ? 'Grand' : 'Neutral';

    // Calculate cost (10g/turn for governance)
    const cost = GOVERNANCE_COST_PER_TURN * turns;
    const ipg = cost > 0 ? prevented / cost : 0;

    return {
        ipg,
        details: `Stab+${stabilityGain} prevents ${prevented.toFixed(0)} (${preventType}) @ ${cost}g`
    };
}

// ============================================================================
// COMMANDER IPG
// ============================================================================

/**
 * Calculate "IPG" for Commander assignment.
 * 
 * This is a relative value comparison since commanders don't spend gold.
 * Value = (ArmyStrength × CommandBonus × CampaignMult) / 10
 * 
 * Returns a comparable value to other IPG metrics.
 */
export function calculateCommanderValue(
    leader: Character,
    army: Army,
    isCampaignActive: boolean
): { value: number; details: string } {
    const commandBonus = (leader.stats?.commandBonus || 0) / 100; // 15% -> 0.15
    const campaignMult = isCampaignActive ? 1.5 : 0.1;
    const value = (army.strength * commandBonus * campaignMult) / 10;

    return {
        value,
        details: `Army ${army.strength} × ${(commandBonus * 100).toFixed(0)}% × ${campaignMult} = ${value.toFixed(1)}`
    };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get resentment level against a faction at a location.
 */
function getResentmentAgainst(location: Location, faction: FactionId): number {
    if (!location.resentment || faction === FactionId.NEUTRAL) return 0;
    const resentmentMap = location.resentment as Record<string, number>;
    return resentmentMap[faction] ?? 0;
}

/**
 * Get faction-specific IPG multiplier.
 * Republicans: 1.0 (aggressive)
 * Nobles: 0.9 (slightly conservative)
 * Conspirators: 0.8 (methodical)
 */
export function getFactionIPGMultiplier(faction: FactionId): number {
    switch (faction) {
        case FactionId.REPUBLICANS: return 1.0;
        case FactionId.NOBLES: return 0.9;
        case FactionId.CONSPIRATORS: return 0.8;
        default: return 1.0;
    }
}
