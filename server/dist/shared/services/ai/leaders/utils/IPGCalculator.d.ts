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
/** IPG floor - below this, clandestine missions are not worth it */
export declare const IPG_FLOOR = 10;
/**
 * Get effective IPG floor based on faction wealth.
 * If faction has >1000g, floor is reduced to 5 (need to spend excess gold).
 * Otherwise floor is 10 (equivalent to recruiting: 50g = 500 soldiers).
 */
export declare function getEffectiveIPGFloor(factionGold: number): number;
/**
 * Get detection threshold based on leader discretion level.
 * Inept(1)=30, Unreliable(2)=40, Capable(3)=50, Effective(4)=60, Exceptional(5)=70
 */
export declare function getDetectionThreshold(discretion: number): number;
/**
 * Calculate minimum mission budget for INCITE_NEUTRAL based on discretion.
 * Inept=200g, all others=300g minimum.
 */
export declare function calculateNeutralMissionBudget(discretion: number): number;
/**
 * Calculate insurgents from Grand Insurrection.
 *
 * Formula: ((Gold/25) × (Pop/100000)) × (100 - EffectiveStab) × ResentmentFactor + 100
 * EffectiveStab = Max(0, Stability - (Ops × 4))
 */
export declare function calculateGrandInsurgents(location: Location, ops: number, gold: number, actorFaction: FactionId): number;
/**
 * Calculate IPG for Grand Insurrection.
 */
export declare function calculateGrandIPG(location: Location, ops: number, gold: number, actorFaction: FactionId): number;
/**
 * Calculate insurgents per turn from Incite Neutral Insurrections.
 *
 * Formula: (Pop × Ops × (Resentment+1)) / (Divisor × (1 + Stab/100))
 * Divisor: 10000 for city, 100000 for rural
 */
export declare function calculateNeutralInsurgentsPerTurn(location: Location, ops: number, actorFaction: FactionId): number;
/**
 * Calculate IPG for Incite Neutral Insurrections.
 * Uses discretion-based turn calculation:
 * Turns of generation = (threshold - 10) / 10
 * Cost = (turns + 1) × 50g, rounded up to nearest 100g
 */
export declare function calculateNeutralIPG(location: Location, ops: number, actorFaction: FactionId, discretion?: number): number;
/**
 * Calculate IPG for Minor Mission (Undermine).
 *
 * Calculates delta insurgents from stability reduction for both Grand and Neutral,
 * takes the maximum, and divides by mission cost.
 *
 * Stability damage = activeTurns × Ops × 2
 * activeTurns = (threshold/10) + tolerance
 * tolerance: +1 for Nobles/Conspirators, +2 for Republicans
 */
export declare function calculateMinorIPG(location: Location, ops: number, actorFaction: FactionId, discretion?: number, // Default: Capable
faction?: FactionId): {
    ipg: number;
    details: string;
};
/**
 * Calculate IPG for Governor assignment.
 *
 * Measures insurgents PREVENTED by stability gain.
 * Formula: InsurgentsPrevented / GovernanceCost
 */
export declare function calculateGovernorIPG(leader: Character, location: Location, actorFaction: FactionId, turns?: number): {
    ipg: number;
    details: string;
};
/**
 * Calculate "IPG" for Commander assignment.
 *
 * This is a relative value comparison since commanders don't spend gold.
 * Value = (ArmyStrength × CommandBonus × CampaignMult) / 10
 *
 * Returns a comparable value to other IPG metrics.
 */
export declare function calculateCommanderValue(leader: Character, army: Army, isCampaignActive: boolean): {
    value: number;
    details: string;
};
/**
 * Get faction-specific IPG multiplier.
 * Republicans: 1.0 (aggressive)
 * Nobles: 0.9 (slightly conservative)
 * Conspirators: 0.8 (methodical)
 */
export declare function getFactionIPGMultiplier(faction: FactionId): number;
/**
 * Apply distance penalty to IPG.
 * Reduces value by 10% per turn of travel (max 90% reduction).
 * Ensures distant missions are only chosen if significantly better.
 */
export declare function applyDistancePenalty(ipg: number, turns: number): number;
