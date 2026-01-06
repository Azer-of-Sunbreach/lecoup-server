/**
 * rationing.ts - Domain service for "Rationing" governor policy
 *
 * Effect: Reduces food consumption by 50% (implemented as supply bonus in territorialStats)
 * Downside: Reduces stability and increases resentment per turn
 * Not available: Rural areas
 */

import { Location, Character, GovernorPolicy, FactionId, LocationType } from '../../../types';
import { modifyResentment } from '../politics/resentment';

export function isRationingActive(location: Location): boolean {
    return location.governorPolicies?.[GovernorPolicy.RATIONING] === true;
}

export function shouldDisableRationing(location: Location): { shouldDisable: boolean; reason?: 'rural_area' } {
    if (location.type === LocationType.RURAL) {
        return { shouldDisable: true, reason: 'rural_area' };
    }
    return { shouldDisable: false };
}

export function processRationing(governor: Character, location: Location): Location {
    const statesmanship = governor.stats.statesmanship || 1;
    // Stability loss: 25 * (1 - statesmanship/10)
    const stabilityLoss = Math.floor(25 * (1 - (statesmanship / 10)));
    // Resentment gain: 20 * (1 - statesmanship/10)
    const resentmentGain = Math.floor(20 * (1 - (statesmanship / 10)));

    // Reduce stability
    let newStability = location.stability - stabilityLoss;
    newStability = Math.max(0, newStability); // Clamp to 0

    const locWithStability = {
        ...location,
        stability: newStability
    };

    // Increase resentment against governor's faction
    return modifyResentment(locWithStability, governor.faction, resentmentGain);
}
