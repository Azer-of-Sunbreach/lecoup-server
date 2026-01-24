"use strict";
/**
 * Faction Strategy Interface and Implementations
 *
 * Defines strategy configuration for each faction, including:
 * - Risk tolerance thresholds
 * - Priority settings
 * - Governor preferences
 * - Special behaviors
 *
 * @module shared/services/ai/leaders/strategies
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStrategyForFaction = getStrategyForFaction;
exports.shouldGoDark = shouldGoDark;
exports.shouldExfiltrate = shouldExfiltrate;
exports.canUseVIPForClandestine = canUseVIPForClandestine;
const types_1 = require("../../../../types");
// ============================================================================
// STRATEGY CONFIGURATIONS
// ============================================================================
/**
 * Conspirator Strategy
 *
 * Most cautious faction with lowest risk tolerance.
 * Prefers stealth, appeasement, and stability.
 * Avoids MAKE_EXAMPLES (generates resentment).
 */
const CONSPIRATOR_STRATEGY = {
    factionId: types_1.FactionId.CONSPIRATORS,
    // Detection-level based risk tolerance (New System - 2026-01)
    maxCaptureRisk: 0.15, // 15% max capture risk
    maxDetectionOverThreshold: 15, // Can exceed threshold by 15 points (without PARANOID)
    maxDetectionWithParanoid: 0, // Cannot exceed threshold with PARANOID governor
    // Legacy (deprecated) - kept for backward compatibility
    maxClandestineRisk: 0.10,
    // Priorities
    stabilityPriority: 90, // Very high - avoid insurrections
    economyPriority: 70, // High - fund operations
    expansionPriority: 50, // Moderate
    clandestinePriority: 80, // High - GRAND_INSURRECTION focus
    // Governor preferences
    preferMakeExamples: false, // Avoid generating resentment
    preferAppeasement: true, // Reduce resentment actively
    // Special behaviors
    avoidVIPsInClandestine: true, // Protect VIPs
    preferStealthOverAggression: true // Stealth first
};
/**
 * Noble Strategy
 *
 * Moderate risk tolerance, aggressive governance.
 * Toggle MAKE_EXAMPLES based on stability threshold.
 * Strong military + economic focus.
 */
const NOBLE_STRATEGY = {
    factionId: types_1.FactionId.NOBLES,
    // Detection-level based risk tolerance (New System - 2026-01)
    maxCaptureRisk: 0.15, // 15% max capture risk
    maxDetectionOverThreshold: 15, // Can exceed threshold by 15 points (without PARANOID)
    maxDetectionWithParanoid: 0, // Cannot exceed threshold with PARANOID governor
    // Legacy (deprecated) - kept for backward compatibility
    maxClandestineRisk: 0.15,
    // Priorities
    stabilityPriority: 80, // High
    economyPriority: 85, // Very high - military funding
    expansionPriority: 75, // High - aggressive expansion
    clandestinePriority: 60, // Moderate - more military focus
    // Governor preferences
    preferMakeExamples: true, // Toggle based on stability
    preferAppeasement: false, // Prefer force over appeasement
    // Special behaviors
    avoidVIPsInClandestine: true, // Protect VIPs
    preferStealthOverAggression: false // Force acceptable
};
/**
 * Republican Strategy
 *
 * Highest risk tolerance, balanced approach.
 * Many leaders, few territories - flexibility needed.
 * GRAND_INSURRECTION is primary win condition.
 */
const REPUBLICAN_STRATEGY = {
    factionId: types_1.FactionId.REPUBLICANS,
    // Detection-level based risk tolerance (New System - 2026-01)
    maxCaptureRisk: 0.20, // 20% max capture risk
    maxDetectionOverThreshold: 20, // Can exceed threshold by 20 points (without PARANOID)
    maxDetectionWithParanoid: 5, // Can exceed threshold by 5 points (with PARANOID)
    // Legacy (deprecated) - kept for backward compatibility
    maxClandestineRisk: 0.20,
    // Priorities
    stabilityPriority: 75, // High but not paramount
    economyPriority: 65, // Moderate
    expansionPriority: 85, // Very high - need territory
    clandestinePriority: 90, // Highest - this is their strength
    // Governor preferences
    preferMakeExamples: false, // Avoid if possible
    preferAppeasement: true, // People's faction
    // Special behaviors
    avoidVIPsInClandestine: false, // Sir Azer can go exceptional
    preferStealthOverAggression: true // Stealth operations
};
// ============================================================================
// FACTORY FUNCTION
// ============================================================================
/**
 * Get the strategy configuration for a faction.
 */
function getStrategyForFaction(faction) {
    switch (faction) {
        case types_1.FactionId.CONSPIRATORS:
            return CONSPIRATOR_STRATEGY;
        case types_1.FactionId.NOBLES:
            return NOBLE_STRATEGY;
        case types_1.FactionId.REPUBLICANS:
            return REPUBLICAN_STRATEGY;
        default:
            // Default to Conspirator (most cautious)
            return CONSPIRATOR_STRATEGY;
    }
}
/**
 * Check if an agent should GO_DARK (reduce activity) at current risk.
 */
function shouldGoDark(currentRisk, strategy, isPreparingGrandInsurrection) {
    // During GRAND_INSURRECTION prep, accept higher risk
    const threshold = isPreparingGrandInsurrection
        ? strategy.maxClandestineRisk * 1.5 // 50% higher threshold
        : strategy.maxClandestineRisk;
    return currentRisk > threshold;
}
/**
 * Check if an agent should EXFILTRATE (abandon mission) at current risk.
 */
function shouldExfiltrate(currentRisk, strategy, budget, isPreparingGrandInsurrection) {
    // Never exfiltrate during active GRAND_INSURRECTION prep
    if (isPreparingGrandInsurrection) {
        return false;
    }
    // Exfiltrate threshold is 2x the GO_DARK threshold
    const exfiltrationThreshold = strategy.maxClandestineRisk * 2;
    // Also exfiltrate if broke
    if (budget <= 0) {
        return true;
    }
    return currentRisk > exfiltrationThreshold;
}
/**
 * Check if a VIP leader can be used for clandestine operations.
 * Only in exceptional circumstances.
 */
function canUseVIPForClandestine(strategy, opportunityScore, otherAgentsAvailable) {
    // If strategy forbids VIPs in clandestine, check exceptions
    if (strategy.avoidVIPsInClandestine) {
        // Exception 1: No other agents available
        if (otherAgentsAvailable === 0) {
            return true;
        }
        // Exception 2: Extremely high value opportunity (score > 150)
        if (opportunityScore > 150) {
            return true;
        }
        return false;
    }
    return true;
}
