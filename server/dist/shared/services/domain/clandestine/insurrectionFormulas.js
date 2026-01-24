"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI_ESTIMATION_DEFAULTS = void 0;
exports.getSpontaneousInsurrectionProbability = getSpontaneousInsurrectionProbability;
exports.estimateSpontaneousInsurgents = estimateSpontaneousInsurgents;
exports.estimateNeutralInsurgents = estimateNeutralInsurgents;
exports.estimateNeutralInsurgentsForAI = estimateNeutralInsurgentsForAI;
exports.calculateProjectedStability = calculateProjectedStability;
exports.estimateGrandInsurgents = estimateGrandInsurgents;
exports.estimateGrandInsurgentsForAI = estimateGrandInsurgentsForAI;
exports.calculateRequiredGarrison = calculateRequiredGarrison;
exports.calculateGarrisonDeficit = calculateGarrisonDeficit;
// ============================================================================
// CONSTANTS - AI Estimation Hypotheses
// ============================================================================
/**
 * Default assumptions for AI when estimating enemy insurrection strength.
 * Conservative values that provide safety margin against average threats
 * while allowing stronger attacks to overwhelm.
 */
exports.AI_ESTIMATION_DEFAULTS = {
    /** Assumed gold invested by enemy (max is 500) */
    GOLD_INVESTED: 400,
    /** Assumed clandestine ops level (1-5 scale, 4 = Effective) */
    CLANDESTINE_OPS: 4,
    /** Assumed resentment against controller */
    RESENTMENT_VS_CONTROLLER: 50,
    /** Assumed resentment against instigator */
    RESENTMENT_VS_INSTIGATOR: 30,
    /** Garrison multiplier for safety margin */
    GARRISON_MARGIN: 1.5
};
// ============================================================================
// SPONTANEOUS INSURRECTION
// ============================================================================
/**
 * Calculate probability of spontaneous neutral insurrection.
 * Only occurs when stability < 50%.
 *
 * @param stability - Current stability (0-100)
 * @returns Probability (0-1) or 0 if stability >= 50
 */
function getSpontaneousInsurrectionProbability(stability) {
    if (stability >= 50)
        return 0;
    if (stability >= 40)
        return 0.25;
    if (stability >= 30)
        return 0.33;
    if (stability >= 20)
        return 0.50;
    if (stability >= 10)
        return 0.75;
    return 1.0; // 0-9%
}
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
function estimateSpontaneousInsurgents(stability, population, isCity) {
    if (stability >= 50)
        return 0;
    const stabilityFactor = 50 - stability;
    const divisor = isCity ? 1000 : 10000;
    return Math.floor(stabilityFactor * (population / divisor));
}
// ============================================================================
// INCITE NEUTRAL INSURRECTIONS (Clandestine Action)
// ============================================================================
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
function estimateNeutralInsurgents(population, clandestineOps, resentmentVsController, stability, isCity) {
    const divisor = isCity ? 10000 : 100000;
    const stabilityFactor = 1 + (stability / 100);
    const resentmentFactor = resentmentVsController + 1;
    const raw = (population * clandestineOps * resentmentFactor) / divisor / stabilityFactor;
    const result = Math.ceil(raw);
    // Cap at 1500
    return Math.min(1500, Math.max(1, result));
}
/**
 * AI-friendly version using default assumptions.
 * @see estimateNeutralInsurgents for full formula
 */
function estimateNeutralInsurgentsForAI(location) {
    const isCity = location.type === 'CITY';
    const resentment = location.resentment?.[location.faction] || 0;
    return estimateNeutralInsurgents(location.population, exports.AI_ESTIMATION_DEFAULTS.CLANDESTINE_OPS, resentment || exports.AI_ESTIMATION_DEFAULTS.RESENTMENT_VS_CONTROLLER, location.stability, isCity);
}
// ============================================================================
// GRAND INSURRECTION (Clandestine Action)
// ============================================================================
/**
 * Calculate projected stability after stability shock.
 * Grand insurrection applies a shock of (clandestineOps × 4) before generating insurgents.
 *
 * @param currentStability - Current stability (0-100)
 * @param clandestineOps - Leader's clandestine ops level (1-5)
 * @returns Projected stability after shock (minimum 0)
 */
function calculateProjectedStability(currentStability, clandestineOps) {
    const shock = clandestineOps * 4;
    return Math.max(0, currentStability - shock);
}
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
function estimateGrandInsurgents(goldInvested, population, stability, clandestineOps, resentmentVsController, resentmentVsInstigator, hasFirebrand = false) {
    // 1. Apply stability shock
    const projectedStability = calculateProjectedStability(stability, clandestineOps);
    // 2. Calculate resentment factor
    const resentmentFactor = 1 + (resentmentVsController / 100) - (resentmentVsInstigator / 100);
    // 3. Base formula
    const goldFactor = goldInvested / 25;
    const popFactor = population / 100000;
    const stabilityFactor = 100 - projectedStability;
    let insurgents = (goldFactor * popFactor * stabilityFactor * resentmentFactor) + 100;
    // 4. Firebrand bonus (+33%)
    if (hasFirebrand) {
        insurgents *= 1.33;
    }
    return Math.floor(insurgents);
}
/**
 * AI-friendly version using default assumptions.
 * Uses conservative estimates: gold=400, clandOps=4
 *
 * @see estimateGrandInsurgents for full formula
 */
function estimateGrandInsurgentsForAI(location, instigatorFaction) {
    const resentmentObj = location.resentment;
    const resentmentVsController = resentmentObj?.[location.faction] || exports.AI_ESTIMATION_DEFAULTS.RESENTMENT_VS_CONTROLLER;
    const resentmentVsInstigator = resentmentObj?.[instigatorFaction] || exports.AI_ESTIMATION_DEFAULTS.RESENTMENT_VS_INSTIGATOR;
    return estimateGrandInsurgents(exports.AI_ESTIMATION_DEFAULTS.GOLD_INVESTED, location.population, location.stability, exports.AI_ESTIMATION_DEFAULTS.CLANDESTINE_OPS, resentmentVsController, resentmentVsInstigator, false // Assume no firebrand for safety
    );
}
// ============================================================================
// AI GARRISON CALCULATION
// ============================================================================
/**
 * Calculate required garrison to defend against estimated insurgents.
 * Applies safety margin.
 *
 * @param estimatedInsurgents - Estimated insurgent count
 * @param marginMultiplier - Safety margin (default 1.5)
 * @returns Required garrison strength
 */
function calculateRequiredGarrison(estimatedInsurgents, marginMultiplier = exports.AI_ESTIMATION_DEFAULTS.GARRISON_MARGIN) {
    return Math.ceil(estimatedInsurgents * marginMultiplier);
}
/**
 * Calculate garrison deficit at a location.
 *
 * @param currentGarrison - Current garrison strength
 * @param requiredGarrison - Required garrison strength
 * @returns Deficit (positive = need more troops, 0 = sufficient)
 */
function calculateGarrisonDeficit(currentGarrison, requiredGarrison) {
    return Math.max(0, requiredGarrison - currentGarrison);
}
