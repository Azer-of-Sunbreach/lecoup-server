/**
 * Noble Strategy - AI strategy for the Nobles' Rights faction
 * 
 * The Nobles are authoritarian but cautious about their leaders:
 * - Moderate risk tolerance (GO_DARK at 15%)
 * - MAKE_EXAMPLES toggles based on stability
 * - SCORCHED_EARTH leaders not prioritized (except Sir Haraldic)
 * - VIP leaders: Baron Lekal, Duke of Thane
 * 
 * @see AI_LEADER_REFACTORING_SPECS.md Section 10
 */

import { FactionId } from '../../../../types';
import { GovernorPolicy } from '../../../../types/governorTypes';
import { ClandestineActionId } from '../../../../types/clandestineTypes';
import { FactionStrategy } from '../types';

/**
 * Noble faction AI strategy.
 * 
 * Key characteristics:
 * - Risk max 15% → GO_DARK
 * - Risk > 33% → Exfiltrate
 * - MAKE_EXAMPLES toggle: on if stability < 50%, off if > 50%
 * - SCORCHED_EARTH leaders are risky but Sir Haraldic is exception
 */
export const NOBLE_STRATEGY: FactionStrategy = {
    factionId: FactionId.NOBLES,

    riskThresholds: {
        goDark: 0.15,      // 15% - moderate
        exfiltrate: 0.33,  // 33% - universal threshold
        forceInsurrection: { min: 0.20, max: 0.33 }
    },

    /**
     * Governor policies in priority order.
     */
    governorPriorityPolicies: [
        GovernorPolicy.STABILIZE_REGION,
        GovernorPolicy.MAKE_EXAMPLES,  // Will be toggled by AI
        GovernorPolicy.DENOUNCE_ENEMIES,
        GovernorPolicy.IMPROVE_ECONOMY,
        GovernorPolicy.HUNT_NETWORKS,
        GovernorPolicy.APPEASE_MINDS,
        GovernorPolicy.REBUILD_REGION
    ],

    /**
     * MAKE_EXAMPLES toggle configuration.
     */
    makeExamplesToggle: {
        enableBelow: 50,
        disableAbove: 50
    },

    /**
     * Clandestine actions in priority order.
     */
    clandestinePriorityActions: [
        ClandestineActionId.PREPARE_GRAND_INSURRECTION,
        ClandestineActionId.UNDERMINE_AUTHORITIES,
        ClandestineActionId.DISTRIBUTE_PAMPHLETS,
        ClandestineActionId.ATTACK_TAX_CONVOYS,
        ClandestineActionId.BURN_CROP_FIELDS
    ],

    /**
     * VIP leaders - protect from high-risk assignments.
     */
    vipLeaders: [
        'lekal', // Corrected to match config ID 'lekal' logic (likely 'baron_lekal' in db but safe to check config)
        'thane'  // Corrected to match config ID 'thane'
    ]
};
