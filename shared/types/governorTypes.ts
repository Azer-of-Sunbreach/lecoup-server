/**
 * Governor Policy Types
 * 
 * Definitions for Governor Policies and their associated costs/configs.
 * Mirrors the structure of clandestineTypes.
 */

export enum GovernorPolicy {
    // Maintain Order
    MAKE_EXAMPLES = 'MAKE_EXAMPLES',
    STABILIZE_REGION = 'STABILIZE_REGION',
    APPEASE_MINDS = 'APPEASE_MINDS',
    DENOUNCE_ENEMIES = 'DENOUNCE_ENEMIES',

    // Counter-Espionage
    HUNT_NETWORKS = 'HUNT_NETWORKS',

    // Civil Administration
    IMPROVE_ECONOMY = 'IMPROVE_ECONOMY',
    RATIONING = 'RATIONING',
    REBUILD_REGION = 'REBUILD_REGION'
}

/**
 * Fixed gold costs per turn for governor policies.
 * Some policies (like APPEASE_MINDS) have dynamic costs calculated elsewhere.
 */
export const GOVERNOR_POLICY_COSTS: Partial<Record<GovernorPolicy, number>> = {
    [GovernorPolicy.STABILIZE_REGION]: 10,
    [GovernorPolicy.MAKE_EXAMPLES]: 0,
    [GovernorPolicy.DENOUNCE_ENEMIES]: 10,
    [GovernorPolicy.HUNT_NETWORKS]: 20,
    [GovernorPolicy.IMPROVE_ECONOMY]: 0,
    [GovernorPolicy.REBUILD_REGION]: 10
};

/**
 * Full-time policies that disable all other policies (except MAKE_EXAMPLES).
 * These policies are mutually exclusive with each other and with all other actions.
 */
export const FULL_TIME_POLICIES: GovernorPolicy[] = [
    GovernorPolicy.HUNT_NETWORKS,
    GovernorPolicy.IMPROVE_ECONOMY
];

/**
 * Policies that can be active alongside full-time policies.
 * Currently only MAKE_EXAMPLES (doctrine, not an action).
 */
export const EXEMPT_FROM_FULL_TIME: GovernorPolicy[] = [
    GovernorPolicy.MAKE_EXAMPLES
];
