/**
 * Republican Strategy - AI strategy for the Republicans faction
 * 
 * The Republicans are aggressive and rely heavily on clandestine ops:
 * - Highest risk tolerance (GO_DARK at 20%)
 * - Many leaders with negative stability (designed for clandestine work)
 * - Use ATTACK_TAX_CONVOYS for self-funding (if ops >= CAPABLE)
 * - GRAND_INSURRECTION prioritized over INCITE_NEUTRAL
 * - VIP leader: Sir Azer
 * 
 * @see AI_LEADER_REFACTORING_SPECS.md Section 10
 */

import { FactionId } from '../../../../types';
import { GovernorPolicy } from '../../../../types/governorTypes';
import { ClandestineActionId } from '../../../../types/clandestineTypes';
import { FactionStrategy } from '../types';

/**
 * Republican faction AI strategy.
 * 
 * Key characteristics:
 * - Risk max 20% → GO_DARK (most aggressive)
 * - Risk > 33% → Exfiltrate
 * - 9 leaders, only 2 territories = many available for clandestine ops
 * - Leaders with -3 stability/turn (Argo, Alia, Lain, Caelan, Tordis)
 *   are designed to be sent on clandestine missions
 */
export const REPUBLICAN_STRATEGY: FactionStrategy = {
    factionId: FactionId.REPUBLICANS,

    riskThresholds: {
        goDark: 0.20,      // 20% - most aggressive
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
        GovernorPolicy.REBUILD_REGION,
        GovernorPolicy.DENOUNCE_ENEMIES
    ],

    /**
     * Clandestine actions in priority order.
     */
    clandestinePriorityActions: [
        ClandestineActionId.PREPARE_GRAND_INSURRECTION,
        ClandestineActionId.UNDERMINE_AUTHORITIES,
        ClandestineActionId.DISTRIBUTE_PAMPHLETS,
        ClandestineActionId.ATTACK_TAX_CONVOYS,
        ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS,
        ClandestineActionId.SPREAD_PROPAGANDA
    ],

    /**
     * VIP leader - protect from high-risk assignments.
     */
    vipLeaders: [
        'azer' // Corrected to match config ID 'azer'
    ]
};
