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
import { Location, GovernorPolicy, Character } from '../../../types';
/**
 * Check if Hunt Networks policy is active for a location.
 */
export declare function isHuntNetworksActive(location: Location): boolean;
/**
 * Check if policy should be auto-disabled.
 * Disables when faction revenue reaches zero.
 */
export declare function shouldDisableHuntNetworks(factionRevenue: number): {
    shouldDisable: boolean;
    reason: 'none' | 'revenue_zero';
};
/**
 * Check if a policy is a full-time policy (mutually exclusive with others).
 */
export declare function isFullTimePolicy(policy: GovernorPolicy): boolean;
/**
 * Check if a policy is exempt from full-time restrictions.
 * Currently only MAKE_EXAMPLES (doctrine, not action).
 */
export declare function isExemptFromFullTime(policy: GovernorPolicy): boolean;
/**
 * Get all policies that should be disabled when a full-time policy is activated.
 * Returns policies to disable (all except the activating policy and exempt policies).
 */
export declare function getPoliciesToDisableForFullTime(activatingPolicy: GovernorPolicy, currentPolicies: Partial<Record<GovernorPolicy, boolean>> | undefined): GovernorPolicy[];
/**
 * Check if any full-time policy is currently active.
 */
export declare function getActiveFullTimePolicy(currentPolicies: Partial<Record<GovernorPolicy, boolean>> | undefined): GovernorPolicy | null;
/**
 * Find the governor character for a location.
 */
export declare function findGovernorForLocation(locationId: string, locationFaction: string, characters: Character[]): Character | undefined;
