/**
 * Governor Policy Types
 *
 * Definitions for Governor Policies and their associated costs/configs.
 * Mirrors the structure of clandestineTypes.
 */
export declare enum GovernorPolicy {
    MAKE_EXAMPLES = "MAKE_EXAMPLES",
    STABILIZE_REGION = "STABILIZE_REGION",
    APPEASE_MINDS = "APPEASE_MINDS",
    DENOUNCE_ENEMIES = "DENOUNCE_ENEMIES",
    HUNT_NETWORKS = "HUNT_NETWORKS",
    IMPROVE_ECONOMY = "IMPROVE_ECONOMY",
    RATIONING = "RATIONING",
    REBUILD_REGION = "REBUILD_REGION"
}
/**
 * Fixed gold costs per turn for governor policies.
 * Some policies (like APPEASE_MINDS) have dynamic costs calculated elsewhere.
 */
export declare const GOVERNOR_POLICY_COSTS: Partial<Record<GovernorPolicy, number>>;
/**
 * Full-time policies that disable all other policies (except MAKE_EXAMPLES).
 * These policies are mutually exclusive with each other and with all other actions.
 */
export declare const FULL_TIME_POLICIES: GovernorPolicy[];
/**
 * Policies that can be active alongside full-time policies.
 * Currently only MAKE_EXAMPLES (doctrine, not an action).
 */
export declare const EXEMPT_FROM_FULL_TIME: GovernorPolicy[];
