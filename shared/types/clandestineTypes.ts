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
    /** @deprecated Use detectionIncrease instead */
    detectionRisk?: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' | 'NONE';
    /** Detection level increase per turn (or once for one-time actions) */
    detectionIncrease: number;
    /** Whether detection applies per turn or once */
    detectionType: 'per_turn' | 'one_time';
    requiredOpsLevel: number;
    isOneTime?: boolean; // If true, cost is paid once at start
};

export const CLANDESTINE_ACTIONS: Record<ClandestineActionId, ClandestineActionType> = {
    [ClandestineActionId.UNDERMINE_AUTHORITIES]: {
        id: ClandestineActionId.UNDERMINE_AUTHORITIES,
        name: 'Undermine Authorities',
        description: 'Reduces stability by 2 to 10 points per turn.',
        costPerTurn: 10,
        detectionIncrease: 10,
        detectionType: 'per_turn',
        requiredOpsLevel: 1
    },
    [ClandestineActionId.DISTRIBUTE_PAMPHLETS]: {
        id: ClandestineActionId.DISTRIBUTE_PAMPHLETS,
        name: 'Distribute Pamphlets',
        description: 'Increases resentment against the local ruler.',
        costPerTurn: 10,
        detectionIncrease: 5,
        detectionType: 'per_turn',
        requiredOpsLevel: 1
    },
    [ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS]: {
        id: ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS,
        name: 'Incite Neutral Insurrections',
        description: 'Attempts to trigger a neutral uprising.',
        costPerTurn: 50,
        detectionIncrease: 10,
        detectionType: 'per_turn',
        requiredOpsLevel: 3
    },
    [ClandestineActionId.SPREAD_PROPAGANDA]: {
        id: ClandestineActionId.SPREAD_PROPAGANDA,
        name: 'Spread Propaganda',
        description: 'Reduces resentment against your faction.',
        costPerTurn: 10,
        detectionIncrease: 5,
        detectionType: 'per_turn',
        requiredOpsLevel: 2
    },
    [ClandestineActionId.ASSASSINATE_LEADER]: {
        id: ClandestineActionId.ASSASSINATE_LEADER,
        name: 'Assassinate Leader',
        description: 'Attempt to assassinate an enemy leader in the region.',
        costPerTurn: 0,
        detectionIncrease: 10,
        detectionType: 'one_time',
        requiredOpsLevel: 4,
        isOneTime: true
    },
    [ClandestineActionId.ATTACK_TAX_CONVOYS]: {
        id: ClandestineActionId.ATTACK_TAX_CONVOYS,
        name: 'Attack Tax Convoys',
        description: 'Intercept tax gold before it reaches the faction treasury.',
        costPerTurn: 0,
        detectionIncrease: 5,
        detectionType: 'per_turn',
        requiredOpsLevel: 2
    },
    [ClandestineActionId.STEAL_FROM_GRANARIES]: {
        id: ClandestineActionId.STEAL_FROM_GRANARIES,
        name: 'Steal from Granaries',
        description: 'Sabotage food stocks to cause unrest.',
        costPerTurn: 0,
        detectionIncrease: 5,
        detectionType: 'per_turn',
        requiredOpsLevel: 2
    },
    [ClandestineActionId.BURN_CROP_FIELDS]: {
        id: ClandestineActionId.BURN_CROP_FIELDS,
        name: 'Burn Crop Fields',
        description: 'Destroy food production capacity.',
        costPerTurn: 25,
        detectionIncrease: 10,
        detectionType: 'per_turn',
        requiredOpsLevel: 3
    },
    [ClandestineActionId.START_URBAN_FIRE]: {
        id: ClandestineActionId.START_URBAN_FIRE,
        name: 'Start Urban Fire',
        description: 'Set fire to city districts to ruin economy.',
        costPerTurn: 25,
        detectionIncrease: 10,
        detectionType: 'per_turn',
        requiredOpsLevel: 3
    },
    [ClandestineActionId.PREPARE_GRAND_INSURRECTION]: {
        id: ClandestineActionId.PREPARE_GRAND_INSURRECTION,
        name: 'Prepare Grand Insurrection',
        description: 'Prepare a large-scale uprising to seize the region.',
        costPerTurn: 0, // One-time investment 100-500 handled dynamically
        detectionIncrease: 10,
        detectionType: 'one_time',
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
    UNDERMINE_AUTHORITIES: 10,
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

// ============================================================================
// LEADER ALERT EVENTS
// ============================================================================

/**
 * Event types for clandestine alerts modal
 */
export enum ClandestineAlertEventType {
    INFILTRATION_SUCCESS = 'infiltration_success',
    INFILTRATION_DETECTED = 'infiltration_detected',
    HUNT_NETWORKS_ACTIVATED = 'hunt_networks_activated',
    DETECTION_WARNING = 'detection_warning',
    // === Detection Level System Events (2026-01-10) ===
    /** Agent's detection level exceeded threshold - now at risk */
    THRESHOLD_EXCEEDED = 'threshold_exceeded',
    /** PARANOID governor appointed in agent's location */
    PARANOID_GOVERNOR_APPOINTED = 'paranoid_governor_appointed',
    /** Both PARANOID governor AND HUNT_NETWORKS activated same turn */
    COMBINED_PARANOID_HUNT = 'combined_paranoid_hunt',
    /** Leader captured and executed */
    EXECUTION = 'execution',
    /** Leader captured but escaped (Daredevil) */
    ESCAPE = 'escape',
    OTHER = 'other'
}

/**
 * A single alert event for a leader.
 * Multiple events can accumulate per leader across a turn cycle.
 * Stored on Character.pendingAlertEvents for multiplayer sync.
 */
export interface LeaderAlertEvent {
    /** Leader this event belongs to */
    leaderId: string;
    /** Turn when event was created */
    turn: number;
    /** Type of alert event */
    eventType: ClandestineAlertEventType;
    /** Main title message (raw, needs i18n interpolation) */
    messageKey: string;
    /** Interpolation params for message */
    messageParams?: Record<string, string>;
    /** Subtitle message key */
    subMessageKey?: string;
    /** Interpolation params for subtitle */
    subMessageParams?: Record<string, string>;
    /** Faction that triggered/owns this event */
    targetFaction: string;
    /** Timestamp for ordering (Date.now()) */
    timestamp: number;
    /** Location where the event happened (useful for logs/UI if leader moves/dies) */
    locationId?: string;
}
