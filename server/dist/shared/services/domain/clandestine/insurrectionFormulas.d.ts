/**
 * Insurrection Formulas Module
 *
 * Centralized formulas for estimating insurgent counts.
 * Used by:
 * - AI defense systems (insurrectionDefense.ts)
 * - Clandestine action processors
 * - UI displays
 *
 * @module insurrectionFormulas
 * @see shared/services/domain/clandestine/clandestineProcessor.ts - Uses these formulas
 * @see shared/services/domain/clandestine/inciteNeutralInsurrections.ts - Uses these formulas
 * @see Application/services/ai/strategy/insurrectionDefense.ts - Uses these formulas for AI estimation
 */
import { Location, FactionId } from '../../../types';
/**
 * Default assumptions for AI when estimating enemy insurrection strength.
 * Conservative values that provide safety margin against average threats
 * while allowing stronger attacks to overwhelm.
 */
export declare const AI_ESTIMATION_DEFAULTS: {
    /** Assumed gold invested by enemy (max is 500) */
    readonly GOLD_INVESTED: 400;
    /** Assumed clandestine ops level (1-5 scale, 4 = Effective) */
    readonly CLANDESTINE_OPS: 4;
    /** Assumed resentment against controller */
    readonly RESENTMENT_VS_CONTROLLER: 50;
    /** Assumed resentment against instigator */
    readonly RESENTMENT_VS_INSTIGATOR: 30;
    /** Garrison multiplier for safety margin */
    readonly GARRISON_MARGIN: 1.5;
};
/**
 * Calculate probability of spontaneous neutral insurrection.
 * Only occurs when stability < 50%.
 *
 * @param stability - Current stability (0-100)
 * @returns Probability (0-1) or 0 if stability >= 50
 */
export declare function getSpontaneousInsurrectionProbability(stability: number): number;
/**
 * Estimate insurgent count for spontaneous neutral insurrection.
 * Formula: (50 - Stability) × (Population / divisor)
 * - City: divisor = 1000
 * - Rural: divisor = 10000
 *
 * NO CAP for spontaneous insurrections.
 *
 * @param stability - Current stability (0-100)
 * @param population - Location population
 * @param isCity - True for cities, false for rural
 * @returns Estimated insurgent count (0 if stability >= 50)
 */
export declare function estimateSpontaneousInsurgents(stability: number, population: number, isCity: boolean): number;
/**
 * Estimate insurgent count for INCITE_NEUTRAL_INSURRECTIONS.
 *
 * Formula: (Pop × ClandOps × (Resentment+1)) / Divisor / (1 + Stability/100)
 * - City: Divisor = 10000
 * - Rural: Divisor = 100000
 *
 * CAPPED at 1500.
 *
 * @param population - Location population
 * @param clandestineOps - Leader's clandestine ops level (1-5)
 * @param resentmentVsController - Resentment toward controlling faction (0-100)
 * @param stability - Current stability (0-100)
 * @param isCity - True for cities, false for rural
 * @returns Estimated insurgent count (capped at 1500)
 */
export declare function estimateNeutralInsurgents(population: number, clandestineOps: number, resentmentVsController: number, stability: number, isCity: boolean): number;
/**
 * AI-friendly version using default assumptions.
 * @see estimateNeutralInsurgents for full formula
 */
export declare function estimateNeutralInsurgentsForAI(location: Location): number;
/**
 * Calculate projected stability after stability shock.
 * Grand insurrection applies a shock of (clandestineOps × 4) before generating insurgents.
 *
 * @param currentStability - Current stability (0-100)
 * @param clandestineOps - Leader's clandestine ops level (1-5)
 * @returns Projected stability after shock (minimum 0)
 */
export declare function calculateProjectedStability(currentStability: number, clandestineOps: number): number;
/**
 * Estimate insurgent count for GRAND_INSURRECTION.
 *
 * Process:
 * 1. Apply stability shock: projectedStability = stability - (clandOps × 4)
 * 2. Calculate insurgents: (Gold/25 × Pop/100000) × (100 - projectedStability) × resentmentFactor + 100
 *    where resentmentFactor = 1 + (resentmentVsController/100) - (resentmentVsInstigator/100)
 *
 * NO CAP for grand insurrections.
 *
 * @param goldInvested - Gold invested (100-500)
 * @param population - Location population
 * @param stability - Current stability BEFORE shock (0-100)
 * @param clandestineOps - Leader's clandestine ops level (1-5)
 * @param resentmentVsController - Resentment toward controlling faction (0-100)
 * @param resentmentVsInstigator - Resentment toward instigating faction (0-100)
 * @param hasFirebrand - True if leader has FIREBRAND ability (+33%)
 * @returns Estimated insurgent count
 */
export declare function estimateGrandInsurgents(goldInvested: number, population: number, stability: number, clandestineOps: number, resentmentVsController: number, resentmentVsInstigator: number, hasFirebrand?: boolean): number;
/**
 * AI-friendly version using default assumptions.
 * Uses conservative estimates: gold=400, clandOps=4
 *
 * @see estimateGrandInsurgents for full formula
 */
export declare function estimateGrandInsurgentsForAI(location: Location, instigatorFaction: FactionId): number;
/**
 * Calculate required garrison to defend against estimated insurgents.
 * Applies safety margin.
 *
 * @param estimatedInsurgents - Estimated insurgent count
 * @param marginMultiplier - Safety margin (default 1.5)
 * @returns Required garrison strength
 */
export declare function calculateRequiredGarrison(estimatedInsurgents: number, marginMultiplier?: number): number;
/**
 * Calculate garrison deficit at a location.
 *
 * @param currentGarrison - Current garrison strength
 * @param requiredGarrison - Required garrison strength
 * @returns Deficit (positive = need more troops, 0 = sufficient)
 */
export declare function calculateGarrisonDeficit(currentGarrison: number, requiredGarrison: number): number;
