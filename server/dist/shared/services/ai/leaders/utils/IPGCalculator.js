"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPG_FLOOR = void 0;
exports.getEffectiveIPGFloor = getEffectiveIPGFloor;
exports.getDetectionThreshold = getDetectionThreshold;
exports.calculateNeutralMissionBudget = calculateNeutralMissionBudget;
exports.calculateManagerOpportunityCost = calculateManagerOpportunityCost;
exports.calculateGrandInsurgents = calculateGrandInsurgents;
exports.calculateGrandIPG = calculateGrandIPG;
exports.calculateNeutralInsurgentsPerTurn = calculateNeutralInsurgentsPerTurn;
exports.calculateNeutralIPG = calculateNeutralIPG;
exports.calculateMinorIPG = calculateMinorIPG;
exports.calculateGovernorIPG = calculateGovernorIPG;
exports.calculateCommanderValue = calculateCommanderValue;
exports.getResentmentAgainst = getResentmentAgainst;
exports.getFactionIPGMultiplier = getFactionIPGMultiplier;
exports.applyDistancePenalty = applyDistancePenalty;
const types_1 = require("../../../../types");
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
exports.IPG_FLOOR = 10;
/** Reduced IPG floor when faction is gold-rich */
const IPG_FLOOR_REDUCED = 5;
/** Gold threshold above which IPG floor is reduced */
const GOLD_RICH_THRESHOLD = 1000;
/**
 * MANAGER ability: generates 20 gold/turn in a city.
 * 20 gold = 200 soldiers equivalent (10 soldiers per gold).
 * Used to calculate opportunity cost for clandestine missions.
 */
const MANAGER_GOLD_PER_TURN = 20;
const MANAGER_SOLDIERS_PER_TURN = 200;
/**
 * Get effective IPG floor based on faction wealth.
 * If faction has >1000g, floor is reduced to 5 (need to spend excess gold).
 * Otherwise floor is 10 (equivalent to recruiting: 50g = 500 soldiers).
 */
function getEffectiveIPGFloor(factionGold) {
    return factionGold > GOLD_RICH_THRESHOLD ? IPG_FLOOR_REDUCED : exports.IPG_FLOOR;
}
/**
 * Get detection threshold based on leader discretion level.
 * Inept(1)=30, Unreliable(2)=40, Capable(3)=50, Effective(4)=60, Exceptional(5)=70
 */
function getDetectionThreshold(discretion) {
    const clampedDiscretion = Math.max(1, Math.min(5, discretion));
    return 20 + (clampedDiscretion * 10);
}
/**
 * Calculate minimum mission budget for INCITE_NEUTRAL based on discretion.
 * Inept=200g, all others=300g minimum.
 */
function calculateNeutralMissionBudget(discretion) {
    const threshold = getDetectionThreshold(discretion);
    const generationTurns = (threshold - 10) / 10;
    const rawCost = (generationTurns + 1) * 50; // +1 for prep turn
    return Math.max(200, Math.ceil(rawCost / 100) * 100);
}
/** Bonus multiplier when target stability <= 60 */
const LOW_STABILITY_BONUS = 1.2;
// ============================================================================
// MANAGER OPPORTUNITY COST
// ============================================================================
/**
 * Calculate opportunity cost for a MANAGER leader going on a clandestine mission.
 *
 * A MANAGER generates 20 gold/turn when in a friendly city, equivalent to 200 soldiers.
 * When the leader leaves for a clandestine mission, this production is lost.
 *
 * @param missionDurationTurns - Duration of the clandestine mission (prep + active)
 * @param travelTurns - Turns needed to reach the target location
 * @returns Opportunity cost in soldier equivalents
 */
function calculateManagerOpportunityCost(missionDurationTurns, travelTurns) {
    const totalTurns = missionDurationTurns + travelTurns;
    return totalTurns * MANAGER_SOLDIERS_PER_TURN;
}
// ============================================================================
// GRAND INSURRECTION FORMULA
// ============================================================================
/**
 * Calculate insurgents from Grand Insurrection.
 *
 * Formula: ((Gold/25) × (Pop/100000)) × (100 - EffectiveStab) × ResentmentFactor + 100
 * EffectiveStab = Max(0, Stability - (Ops × 4))
 */
function calculateGrandInsurgents(location, ops, gold, actorFaction) {
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
function calculateGrandIPG(location, ops, gold, actorFaction) {
    if (gold <= 0)
        return 0;
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
function calculateNeutralInsurgentsPerTurn(location, ops, actorFaction) {
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
 * Uses discretion-based turn calculation:
 * Turns of generation = (threshold - 10) / 10
 * Cost = (turns + 1) × 50g, rounded up to nearest 100g
 */
function calculateNeutralIPG(location, ops, actorFaction, discretion = 3 // Default: Capable
) {
    const perTurn = calculateNeutralInsurgentsPerTurn(location, ops, actorFaction);
    const threshold = getDetectionThreshold(discretion);
    const generationTurns = (threshold - 10) / 10; // Inept=2, Capable=4
    const totalInsurgents = perTurn * generationTurns;
    const rawCost = (generationTurns + 1) * 50; // +1 for prep turn
    const totalCost = Math.ceil(rawCost / 100) * 100; // Round to nearest 100
    return totalCost > 0 ? totalInsurgents / totalCost : 0;
}
/**
 * Calculate IPG for Minor Mission (Undermine).
 *
 * Calculates delta insurgents from stability reduction for both Grand and Neutral,
 * takes the maximum, and divides by mission cost.
 *
 * Stability damage = activeTurns × Ops × 2
 * activeTurns = (threshold/10) + tolerance
 * tolerance: +1 for Nobles/Conspirators, +2 for Republicans
 *
 * MANAGER leaders: If the leader has the MANAGER ability and is currently in a
 * friendly city, the IPG is reduced by the opportunity cost of lost gold production.
 */
function calculateMinorIPG(location, ops, actorFaction, discretion = 3, // Default: Capable
faction = types_1.FactionId.NOBLES, // For tolerance calculation
managerOptions) {
    const threshold = getDetectionThreshold(discretion);
    const tolerance = (faction === types_1.FactionId.REPUBLICANS) ? 2 : 1;
    const activeTurns = (threshold / 10) + tolerance;
    const stabilityDamage = activeTurns * ops * 2;
    const reducedStability = Math.max(0, location.stability - stabilityDamage);
    // Create modified location for comparison
    const reducedLocation = {
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
    // Delta for Neutral Insurrections (standard ops, use same discretion for comparison)
    const neutralTurns = (threshold - 10) / 10;
    const neutralAtCurrent = calculateNeutralInsurgentsPerTurn(location, STANDARD_OPS, actorFaction) * neutralTurns;
    const neutralAtReduced = calculateNeutralInsurgentsPerTurn(reducedLocation, STANDARD_OPS, actorFaction) * neutralTurns;
    const deltaNeutral = neutralAtReduced - neutralAtCurrent;
    // Use the better of the two
    let deltaInsurgents = Math.max(deltaGrand, deltaNeutral);
    const deltaType = deltaGrand >= deltaNeutral ? 'Grand' : 'Neutral';
    // MANAGER opportunity cost: subtract lost production if leader is in friendly city
    let managerOpportunityCost = 0;
    let managerDetails = '';
    if (managerOptions?.hasManagerAbility && managerOptions?.isInFriendlyLocation) {
        managerOpportunityCost = calculateManagerOpportunityCost(activeTurns, managerOptions.travelTurns);
        deltaInsurgents = Math.max(0, deltaInsurgents - managerOpportunityCost);
        managerDetails = ` -MGR:${managerOpportunityCost}`;
    }
    let ipg = deltaInsurgents / MINOR_MISSION_BUDGET;
    // Bonus if stability <= 60 (easy to push under 50 threshold)
    if (location.stability <= 60) {
        ipg *= LOW_STABILITY_BONUS;
    }
    // Normalize IPG by duration (divide by activeTurns)
    // "The duration of these missions is a cost in itself."
    if (activeTurns > 0) {
        ipg = ipg / activeTurns;
    }
    return {
        ipg,
        details: `${activeTurns}t: Stab ${location.stability}->${reducedStability}, Δ${deltaType}=${deltaGrand >= deltaNeutral ? deltaGrand.toFixed(0) : deltaNeutral.toFixed(0)}${managerDetails}`,
        managerOpportunityCost: managerOpportunityCost > 0 ? managerOpportunityCost : undefined
    };
}
// ============================================================================
// GOVERNOR IPG (REVERSE IPG)
// ============================================================================
/**
 * Calculate IPG for Governor assignment.
 *
 * Measures insurgents PREVENTED by stability gain.
 * Formula: InsurgentsPrevented / GovernanceCost
 */
function calculateGovernorIPG(leader, location, actorFaction, turns = DEFAULT_GOVERNANCE_TURNS) {
    // MAN_OF_ACTION: Cannot fully govern, return 0 IPG for recruitment evaluation
    const hasManOfAction = leader.stats?.traits?.includes('MAN_OF_ACTION') ?? false;
    if (hasManOfAction) {
        return { ipg: 0, details: 'MAN_OF_ACTION: Cannot fully govern' };
    }
    const statesmanship = leader.stats?.statesmanship || 3;
    const stabilityPerTurn = leader.stats?.stabilityPerTurn || 0;
    const stabilityGain = (statesmanship + stabilityPerTurn) * turns;
    const improvedStability = Math.min(100, location.stability + stabilityGain);
    // Create improved location for comparison
    const improvedLocation = {
        ...location,
        stability: improvedStability
    };
    // Calculate insurgents prevented using Grand formula (enemy with ops=4, gold=400)
    const currentInsurgents = calculateGrandInsurgents(location, 4, 400, types_1.FactionId.NEUTRAL);
    const improvedInsurgents = calculateGrandInsurgents(improvedLocation, 4, 400, types_1.FactionId.NEUTRAL);
    const grandPrevented = currentInsurgents - improvedInsurgents;
    // Calculate insurgents prevented using Neutral formula
    const currentNeutral = calculateNeutralInsurgentsPerTurn(location, 4, types_1.FactionId.NEUTRAL) * 3;
    const improvedNeutral = calculateNeutralInsurgentsPerTurn(improvedLocation, 4, types_1.FactionId.NEUTRAL) * 3;
    const neutralPrevented = currentNeutral - improvedNeutral;
    // Use the better scenario
    const prevented = Math.max(grandPrevented, neutralPrevented);
    const preventType = grandPrevented >= neutralPrevented ? 'Grand' : 'Neutral';
    // Calculate cost (10g/turn for governance)
    const cost = GOVERNANCE_COST_PER_TURN * turns;
    const ipg = cost > 0 ? prevented / cost : 0;
    return {
        ipg: Math.max(0, ipg),
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
function calculateCommanderValue(leader, army, isCampaignActive) {
    const commandBonus = (leader.stats?.commandBonus || 0) / 100; // 15% -> 0.15
    const campaignMult = isCampaignActive ? 1 : 0.1;
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
function getResentmentAgainst(location, faction) {
    if (!location.resentment || faction === types_1.FactionId.NEUTRAL)
        return 0;
    const resentmentMap = location.resentment;
    return resentmentMap[faction] ?? 0;
}
/**
 * Get faction-specific IPG multiplier.
 
 * Republicans: 1.0 (aggressive)
 * Nobles: 0.9 (slightly conservative)
 * Conspirators: 0.8 (methodical)
 */
function getFactionIPGMultiplier(faction) {
    switch (faction) {
        case types_1.FactionId.REPUBLICANS: return 1.0;
        case types_1.FactionId.NOBLES: return 0.9;
        case types_1.FactionId.CONSPIRATORS: return 0.8;
        default: return 1.0;
    }
}
/**
 * Apply distance penalty to IPG.
 * Reduces value by 10% per turn of travel (max 90% reduction).
 * Ensures distant missions are only chosen if significantly better.
 */
function applyDistancePenalty(ipg, turns) {
    const penalty = Math.min(0.9, turns * 0.1);
    return ipg * (1 - penalty);
}
