/**
 * Conspirator Strategy - AI strategy for the Conspirators faction
 * 
 * The Conspirators are cautious and methodical:
 * - Lowest risk tolerance (GO_DARK at 10%)
 * - Prioritize stability and legitimacy
 * - Avoid MAKE_EXAMPLES unless absolutely necessary
 * - VIP leaders: Count Rivenberg, Sir Barrett
 * 
 * @see AI_LEADER_REFACTORING_SPECS.md Section 10
 */

import { FactionId } from '../../../../types';
import { GovernorPolicy } from '../../../../types/governorTypes';
import { ClandestineActionId } from '../../../../types/clandestineTypes';
import { FactionStrategy } from '../types';

/**
 * Conspirator faction AI strategy.
 * 
 * Key characteristics:
 * - Risk max 10% → GO_DARK
 * - Risk > 33% → Exfiltrate
 * - Force insurrection only if 20-33% risk AND was planned
 * - Avoid MAKE_EXAMPLES (generates resentment)
 * - Focus on GRAND_INSURRECTION over neutral insurrections
 */
export const CONSPIRATOR_STRATEGY: FactionStrategy = {
    factionId: FactionId.CONSPIRATORS,

    riskThresholds: {
        goDark: 0.10,      // 10% - most conservative
        exfiltrate: 0.33,  // 33% - universal threshold
        forceInsurrection: { min: 0.20, max: 0.33 }
    },

    /**
     * Governor policies in priority order.
     */
    governorPriorityPolicies: [
        GovernorPolicy.STABILIZE_REGION,
        GovernorPolicy.APPEASE_MINDS,
        GovernorPolicy.IMPROVE_ECONOMY,
        GovernorPolicy.HUNT_NETWORKS,
        GovernorPolicy.DENOUNCE_ENEMIES,
        GovernorPolicy.REBUILD_REGION
    ],

    /**
     * Clandestine actions in priority order.
     */
    clandestinePriorityActions: [
        ClandestineActionId.PREPARE_GRAND_INSURRECTION,
        ClandestineActionId.UNDERMINE_AUTHORITIES,
        ClandestineActionId.DISTRIBUTE_PAMPHLETS,
        ClandestineActionId.SPREAD_PROPAGANDA
    ],

    /**
     * VIP leaders - protect from high-risk assignments.
     */
    vipLeaders: [
        'count_rivenberg', // Corrected IDs to match config
        'sir_barrett'
    ],

    /**
     * Avoid MAKE_EXAMPLES - it generates resentment which
     * conflicts with Conspirator goals. Only use if enemy
     * agent is organizing insurrections.
     */
    avoidPolicies: [
        GovernorPolicy.MAKE_EXAMPLES
    ]
};
