"use strict";
/**
 * Governor Policy Types
 *
 * Definitions for Governor Policies and their associated costs/configs.
 * Mirrors the structure of clandestineTypes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXEMPT_FROM_FULL_TIME = exports.FULL_TIME_POLICIES = exports.GOVERNOR_POLICY_COSTS = exports.GovernorPolicy = void 0;
var GovernorPolicy;
(function (GovernorPolicy) {
    // Maintain Order
    GovernorPolicy["MAKE_EXAMPLES"] = "MAKE_EXAMPLES";
    GovernorPolicy["STABILIZE_REGION"] = "STABILIZE_REGION";
    GovernorPolicy["APPEASE_MINDS"] = "APPEASE_MINDS";
    GovernorPolicy["DENOUNCE_ENEMIES"] = "DENOUNCE_ENEMIES";
    // Counter-Espionage
    GovernorPolicy["HUNT_NETWORKS"] = "HUNT_NETWORKS";
    // Civil Administration
    GovernorPolicy["IMPROVE_ECONOMY"] = "IMPROVE_ECONOMY";
    GovernorPolicy["RATIONING"] = "RATIONING";
    GovernorPolicy["REBUILD_REGION"] = "REBUILD_REGION";
})(GovernorPolicy || (exports.GovernorPolicy = GovernorPolicy = {}));
/**
 * Fixed gold costs per turn for governor policies.
 * Some policies (like APPEASE_MINDS) have dynamic costs calculated elsewhere.
 */
exports.GOVERNOR_POLICY_COSTS = {
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
exports.FULL_TIME_POLICIES = [
    GovernorPolicy.HUNT_NETWORKS,
    GovernorPolicy.IMPROVE_ECONOMY
];
/**
 * Policies that can be active alongside full-time policies.
 * Currently only MAKE_EXAMPLES (doctrine, not an action).
 */
exports.EXEMPT_FROM_FULL_TIME = [
    GovernorPolicy.MAKE_EXAMPLES
];
