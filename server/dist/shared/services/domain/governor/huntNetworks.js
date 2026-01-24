"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHuntNetworksActive = isHuntNetworksActive;
exports.shouldDisableHuntNetworks = shouldDisableHuntNetworks;
exports.isFullTimePolicy = isFullTimePolicy;
exports.isExemptFromFullTime = isExemptFromFullTime;
exports.getPoliciesToDisableForFullTime = getPoliciesToDisableForFullTime;
exports.getActiveFullTimePolicy = getActiveFullTimePolicy;
exports.findGovernorForLocation = findGovernorForLocation;
const types_1 = require("../../../types");
const governorTypes_1 = require("../../../types/governorTypes");
// ============================================================================
// POLICY CHECKERS
// ============================================================================
/**
 * Check if Hunt Networks policy is active for a location.
 */
function isHuntNetworksActive(location) {
    return location.governorPolicies?.[types_1.GovernorPolicy.HUNT_NETWORKS] === true;
}
/**
 * Check if policy should be auto-disabled.
 * Disables when faction revenue reaches zero.
 */
function shouldDisableHuntNetworks(factionRevenue) {
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
function isFullTimePolicy(policy) {
    return governorTypes_1.FULL_TIME_POLICIES.includes(policy);
}
/**
 * Check if a policy is exempt from full-time restrictions.
 * Currently only MAKE_EXAMPLES (doctrine, not action).
 */
function isExemptFromFullTime(policy) {
    return governorTypes_1.EXEMPT_FROM_FULL_TIME.includes(policy);
}
/**
 * Get all policies that should be disabled when a full-time policy is activated.
 * Returns policies to disable (all except the activating policy and exempt policies).
 */
function getPoliciesToDisableForFullTime(activatingPolicy, currentPolicies) {
    if (!currentPolicies)
        return [];
    const policiesToDisable = [];
    for (const [policyKey, isActive] of Object.entries(currentPolicies)) {
        const policy = policyKey;
        // Skip if not active, is the activating policy, or is exempt
        if (!isActive)
            continue;
        if (policy === activatingPolicy)
            continue;
        if (isExemptFromFullTime(policy))
            continue;
        policiesToDisable.push(policy);
    }
    return policiesToDisable;
}
/**
 * Check if any full-time policy is currently active.
 */
function getActiveFullTimePolicy(currentPolicies) {
    if (!currentPolicies)
        return null;
    for (const policy of governorTypes_1.FULL_TIME_POLICIES) {
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
function findGovernorForLocation(locationId, locationFaction, characters) {
    return characters.find(c => c.locationId === locationId &&
        c.faction === locationFaction &&
        c.status === types_1.CharacterStatus.GOVERNING);
}
