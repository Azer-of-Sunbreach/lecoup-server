/**
 * stabilizeRegion.ts - Domain service for "Stabilize Region" governor policy
 *
 * Effect: Increase stability by Statesmanship level per turn.
 * Cost: Handled by processor (10g/turn)
 * Auto-disable: Revenue=0 OR Stability=100
 */

import { Location, Character, LogEntry, GovernorPolicy } from '../../../types';

/**
 * Check if Stabilize Region should be disabled.
 */
export function shouldDisableStabilizeRegion(
    location: Location,
    factionRevenue: number,
    factionGold: number,
    // Note: Cost check is usually done by processor before deducting, 
    // but here we check conditions for CONTINUING.
    // Spec says: "disables automatically ... if faction revenue reaches zero or stability reaches 100"
): { shouldDisable: boolean; reason?: 'revenue_zero' | 'stability_max' | 'bankruptcy' } {
    if (location.stability >= 100) {
        return { shouldDisable: true, reason: 'stability_max' };
    }
    if (factionRevenue <= 0) {
        return { shouldDisable: true, reason: 'revenue_zero' };
    }
    // Optional: Check if faction ran out of gold? 
    // Processor usually handles budget checks. 
    // But "Revenue reaches zero" is specific.
    return { shouldDisable: false };
}

/**
 * Process Stabilize Region policy effect.
 * Assumes cost has been paid.
 */
export function processStabilizeRegion(
    governor: Character,
    location: Location,
    turn: number
): { location: Location; log?: LogEntry } {
    const statesmanship = governor.stats.statesmanship || 1;
    const stabilityIncrease = statesmanship;

    // Apply stability increase
    const newStability = Math.min(100, location.stability + stabilityIncrease);

    // We don't log every turn for success, only when it disables or notable events occur?
    // Clandestine actions usually log notable events.
    // For passive buffs, usually NO log unless something special happens.
    // So we just return updated location.

    return {
        location: {
            ...location,
            stability: newStability
        }
    };
}


// Actually isStabilizeRegionActive was defined in the old file. I should re-define it here or import it.
// I'll re-define it here for completeness.

export function isStabilizeRegionActive(location: Location): boolean {
    return location.governorPolicies?.[GovernorPolicy.STABILIZE_REGION] === true;
}
