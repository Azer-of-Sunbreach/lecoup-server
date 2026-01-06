/**
 * Hunt Networks Service - Domain logic for "Hunt enemy underground networks" policy
 * 
 * This full-time governor policy increases detection risk for enemy clandestine leaders
 * and provides intelligence when they leave the region.
 * 
 * Effects when active:
 * - Increases infiltration detection risk: adjustedRisk * (1 + (statesmanship * 0.2))
 * - Increases cumulative clandestine action detection: +5% per action + statesmanship modifier
 * - Reduces burn operation success: -10 - (5 * statesmanship)
 * - Notifies when enemy leaders leave (except GHOST ability)
 */

import { Location, GovernorPolicy, Character, CharacterStatus } from '../../../types';
import { FULL_TIME_POLICIES, EXEMPT_FROM_FULL_TIME } from '../../../types/governorTypes';

// ============================================================================
// POLICY CHECKERS
// ============================================================================

/**
 * Check if Hunt Networks policy is active for a location.
 */
export function isHuntNetworksActive(location: Location): boolean {
    return location.governorPolicies?.[GovernorPolicy.HUNT_NETWORKS] === true;
}

/**
 * Check if policy should be auto-disabled.
 * Disables when faction revenue reaches zero.
 */
export function shouldDisableHuntNetworks(
    factionRevenue: number
): { shouldDisable: boolean; reason: 'none' | 'revenue_zero' } {
    if (factionRevenue <= 0) {
        return { shouldDisable: true, reason: 'revenue_zero' };
    }
    return { shouldDisable: false, reason: 'none' };
}

// ============================================================================
// FULL-TIME POLICY HELPERS
// ============================================================================

/**
 * Check if a policy is a full-time policy (mutually exclusive with others).
 */
export function isFullTimePolicy(policy: GovernorPolicy): boolean {
    return FULL_TIME_POLICIES.includes(policy);
}

/**
 * Check if a policy is exempt from full-time restrictions.
 * Currently only MAKE_EXAMPLES (doctrine, not action).
 */
export function isExemptFromFullTime(policy: GovernorPolicy): boolean {
    return EXEMPT_FROM_FULL_TIME.includes(policy);
}

/**
 * Get all policies that should be disabled when a full-time policy is activated.
 * Returns policies to disable (all except the activating policy and exempt policies).
 */
export function getPoliciesToDisableForFullTime(
    activatingPolicy: GovernorPolicy,
    currentPolicies: Partial<Record<GovernorPolicy, boolean>> | undefined
): GovernorPolicy[] {
    if (!currentPolicies) return [];

    const policiesToDisable: GovernorPolicy[] = [];

    for (const [policyKey, isActive] of Object.entries(currentPolicies)) {
        const policy = policyKey as GovernorPolicy;

        // Skip if not active, is the activating policy, or is exempt
        if (!isActive) continue;
        if (policy === activatingPolicy) continue;
        if (isExemptFromFullTime(policy)) continue;

        policiesToDisable.push(policy);
    }

    return policiesToDisable;
}

/**
 * Check if any full-time policy is currently active.
 */
export function getActiveFullTimePolicy(
    currentPolicies: Partial<Record<GovernorPolicy, boolean>> | undefined
): GovernorPolicy | null {
    if (!currentPolicies) return null;

    for (const policy of FULL_TIME_POLICIES) {
        if (currentPolicies[policy]) {
            return policy;
        }
    }

    return null;
}

// ============================================================================
// GOVERNOR HELPERS
// ============================================================================

/**
 * Find the governor character for a location.
 */
export function findGovernorForLocation(
    locationId: string,
    locationFaction: string,
    characters: Character[]
): Character | undefined {
    return characters.find(c =>
        c.locationId === locationId &&
        c.faction === locationFaction &&
        c.status === CharacterStatus.GOVERNING
    );
}
