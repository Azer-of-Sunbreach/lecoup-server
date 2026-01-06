/**
 * Faction Strategy - Strategy factory and common utilities
 * 
 * Provides faction-specific AI strategies with risk thresholds,
 * policy priorities, and leader classifications.
 * 
 * @see AI_LEADER_REFACTORING_SPECS.md Section 10
 */

import { FactionId } from '../../../../types';
import { FactionStrategy } from '../types';
import { CONSPIRATOR_STRATEGY } from './conspiratorStrategy';
import { NOBLE_STRATEGY } from './nobleStrategy';
import { REPUBLICAN_STRATEGY } from './republicanStrategy';

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Gets the AI strategy configuration for a faction.
 * 
 * @param faction The faction to get strategy for
 * @returns Faction-specific strategy configuration
 * @throws Error if faction has no strategy defined
 */
export function getStrategyForFaction(faction: FactionId): FactionStrategy {
    switch (faction) {
        case FactionId.CONSPIRATORS:
            return CONSPIRATOR_STRATEGY;
        case FactionId.NOBLES:
            return NOBLE_STRATEGY;
        case FactionId.REPUBLICANS:
            return REPUBLICAN_STRATEGY;
        default:
            throw new Error(`No AI strategy defined for faction: ${faction}`);
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Checks if a leader is designated as VIP for their faction.
 * VIP leaders should be protected from high-risk assignments.
 */
export function isVIPLeader(leaderId: string, faction: FactionId): boolean {
    const strategy = getStrategyForFaction(faction);
    // Check both exact match and 'sir_name' vs 'name' variations if needed
    // Assuming IDs in config are normalized
    return strategy.vipLeaders.some(id => leaderId.includes(id) || id.includes(leaderId));
}

/**
 * Gets the GO_DARK threshold for a faction.
 */
export function getGoDarkThreshold(faction: FactionId): number {
    return getStrategyForFaction(faction).riskThresholds.goDark;
}

/**
 * Gets the exfiltration threshold for a faction.
 */
export function getExfiltrationThreshold(faction: FactionId): number {
    return getStrategyForFaction(faction).riskThresholds.exfiltrate;
}

/**
 * Checks if GRAND_INSURRECTION can be forced at the given risk level.
 * 
 * Per specs: If risk is between 20-33% and insurrection was planned,
 * the agent should commit to the insurrection anyway.
 */
export function canForceGrandInsurrection(
    currentRisk: number,
    faction: FactionId,
    wasPlanned: boolean
): boolean {
    if (!wasPlanned) return false;

    const thresholds = getStrategyForFaction(faction).riskThresholds;
    return currentRisk >= thresholds.forceInsurrection.min &&
        currentRisk <= thresholds.forceInsurrection.max;
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export { CONSPIRATOR_STRATEGY } from './conspiratorStrategy';
export { NOBLE_STRATEGY } from './nobleStrategy';
export { REPUBLICAN_STRATEGY } from './republicanStrategy';
