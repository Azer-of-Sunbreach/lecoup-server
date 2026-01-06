/**
 * Clandestine Types - Types for clandestine operations state
 * 
 * Defines persistent state for clandestine actions that leaders perform
 * in enemy territories. Stored on Character for multiplayer sync.
 * 
 * @see Application/components/game/clandestine/ClandestineActionTypes.ts for UI definitions
 */

// Re-use the ClandestineActionId from the existing Application types
// Note: This type mirrors the one in Application but is defined in shared for domain use
export enum ClandestineActionId {
    UNDERMINE_AUTHORITIES = 'UNDERMINE_AUTHORITIES',
    DISTRIBUTE_PAMPHLETS = 'DISTRIBUTE_PAMPHLETS',
    INCITE_NEUTRAL_INSURRECTIONS = 'INCITE_NEUTRAL_INSURRECTIONS',
    SPREAD_PROPAGANDA = 'SPREAD_PROPAGANDA',
    ASSASSINATE_LEADER = 'ASSASSINATE_LEADER',
    ATTACK_TAX_CONVOYS = 'ATTACK_TAX_CONVOYS',
    STEAL_FROM_GRANARIES = 'STEAL_FROM_GRANARIES',
    BURN_CROP_FIELDS = 'BURN_CROP_FIELDS',
    START_URBAN_FIRE = 'START_URBAN_FIRE',
    PREPARE_GRAND_INSURRECTION = 'PREPARE_GRAND_INSURRECTION'
}

export type ClandestineActionType = {
    id: ClandestineActionId;
    name: string;
    description: string;
    costPerTurn: number;
    detectionRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' | 'NONE';
    requiredOpsLevel: number;
    isOneTime?: boolean; // If true, cost is paid once at start
};

export const CLANDESTINE_ACTIONS: Record<ClandestineActionId, ClandestineActionType> = {
    [ClandestineActionId.UNDERMINE_AUTHORITIES]: {
        id: ClandestineActionId.UNDERMINE_AUTHORITIES,
        name: 'Undermine Authorities',
        description: 'Reduces stability by 2 to 10 points per turn.',
        costPerTurn: 20,
        detectionRisk: 'LOW',
        requiredOpsLevel: 1
    },
    [ClandestineActionId.DISTRIBUTE_PAMPHLETS]: {
        id: ClandestineActionId.DISTRIBUTE_PAMPHLETS,
        name: 'Distribute Pamphlets',
        description: 'Increases resentment against the local ruler.',
        costPerTurn: 10,
        detectionRisk: 'LOW',
        requiredOpsLevel: 1
    },
    [ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS]: {
        id: ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS,
        name: 'Incite Neutral Insurrections',
        description: 'Attempts to trigger a neutral uprising.',
        costPerTurn: 50,
        detectionRisk: 'MODERATE',
        requiredOpsLevel: 3
    },
    [ClandestineActionId.SPREAD_PROPAGANDA]: {
        id: ClandestineActionId.SPREAD_PROPAGANDA,
        name: 'Spread Propaganda',
        description: 'Reduces resentment against your faction.',
        costPerTurn: 10,
        detectionRisk: 'LOW',
        requiredOpsLevel: 2
    },
    [ClandestineActionId.ASSASSINATE_LEADER]: {
        id: ClandestineActionId.ASSASSINATE_LEADER,
        name: 'Assassinate Leader',
        description: 'Attempt to assassinate an enemy leader in the region.',
        costPerTurn: 0,
        detectionRisk: 'HIGH',
        requiredOpsLevel: 4,
        isOneTime: true
    },
    [ClandestineActionId.ATTACK_TAX_CONVOYS]: {
        id: ClandestineActionId.ATTACK_TAX_CONVOYS,
        name: 'Attack Tax Convoys',
        description: 'Intercept tax gold before it reaches the faction treasury.',
        costPerTurn: 0, // Funded by loot? Or actually 0 cost? Spec implies it might have a cost or risk. 
        // Wait, checked previous memory: Attack Tax Convoys has a cost of 0 but requires budget?
        // Let's stick to existing definition or update if needed.
        // Actually typically these have 0 cost but high risk.
        detectionRisk: 'HIGH',
        requiredOpsLevel: 2
    },
    [ClandestineActionId.STEAL_FROM_GRANARIES]: {
        id: ClandestineActionId.STEAL_FROM_GRANARIES,
        name: 'Steal from Granaries',
        description: 'Sabotage food stocks to cause unrest.',
        costPerTurn: 0,
        detectionRisk: 'HIGH',
        requiredOpsLevel: 2
    },
    [ClandestineActionId.BURN_CROP_FIELDS]: {
        id: ClandestineActionId.BURN_CROP_FIELDS,
        name: 'Burn Crop Fields',
        description: 'Destroy food production capacity.',
        costPerTurn: 25,
        detectionRisk: 'HIGH',
        requiredOpsLevel: 3,
        isOneTime: true
    },
    [ClandestineActionId.START_URBAN_FIRE]: {
        id: ClandestineActionId.START_URBAN_FIRE,
        name: 'Start Urban Fire',
        description: 'Set fire to city districts to ruin economy.',
        costPerTurn: 25,
        detectionRisk: 'HIGH',
        requiredOpsLevel: 3,
        isOneTime: true
    },
    [ClandestineActionId.PREPARE_GRAND_INSURRECTION]: {
        id: ClandestineActionId.PREPARE_GRAND_INSURRECTION,
        name: 'Prepare Grand Insurrection',
        description: 'Prepare a large-scale uprising to seize the region.',
        costPerTurn: 0, // One-time investment 100-500 handled dynamically
        detectionRisk: 'MODERATE',
        requiredOpsLevel: 1, // User request: Available to all leaders
        isOneTime: true
    }
};

/**
 * Persistent state for an active clandestine action.
 * Stored on Character.activeClandestineActions for sync between client/server.
 */
export interface ActiveClandestineAction {
    actionId: string;
    turnStarted?: number; // Turn when action was activated
    targetLeaderId?: string; // For assassination
    oneTimeGoldAmount?: number; // For variable cost actions (Assassination/Insurrection)
    isRevealed?: boolean; // For assassination: Has the plot been revealed?
}

/**
 * Risk level values for calculation.
 * Low = 1, Moderate = 2, High = 3, Extremely High = 4
 */
export const CLANDESTINE_ACTION_RISKS: Record<string, number> = {
    UNDERMINE_AUTHORITIES: 1,  // Low (was Moderate)
    DISTRIBUTE_PAMPHLETS: 1,   // Low (was Moderate)
    INCITE_NEUTRAL_INSURRECTIONS: 2,  // Moderate (was High)
    SPREAD_PROPAGANDA: 1,
    ASSASSINATE_LEADER: 3,     // High (was Extreme)
    ATTACK_TAX_CONVOYS: 2,
    STEAL_FROM_GRANARIES: 2,
    BURN_CROP_FIELDS: 3,
    START_URBAN_FIRE: 3,
    PREPARE_GRAND_INSURRECTION: 2 // Moderate risk
};

/**
 * Cost per turn for each recurring clandestine action.
 * One-time actions have costPerTurn = 0.
 */
export const CLANDESTINE_ACTION_COSTS: Record<string, number> = {
    UNDERMINE_AUTHORITIES: 20,
    DISTRIBUTE_PAMPHLETS: 10,
    INCITE_NEUTRAL_INSURRECTIONS: 50,
    SPREAD_PROPAGANDA: 10,
    ASSASSINATE_LEADER: 0, // One-time variable cost
    ATTACK_TAX_CONVOYS: 0,
    STEAL_FROM_GRANARIES: 0,
    BURN_CROP_FIELDS: 25,
    START_URBAN_FIRE: 25,
    PREPARE_GRAND_INSURRECTION: 0 // Variable one-time cost
};
