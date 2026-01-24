/**
 * Clandestine Types - Types for clandestine operations state
 *
 * Defines persistent state for clandestine actions that leaders perform
 * in enemy territories. Stored on Character for multiplayer sync.
 *
 * @see Application/components/game/clandestine/ClandestineActionTypes.ts for UI definitions
 */
export declare enum ClandestineActionId {
    UNDERMINE_AUTHORITIES = "UNDERMINE_AUTHORITIES",
    DISTRIBUTE_PAMPHLETS = "DISTRIBUTE_PAMPHLETS",
    INCITE_NEUTRAL_INSURRECTIONS = "INCITE_NEUTRAL_INSURRECTIONS",
    SPREAD_PROPAGANDA = "SPREAD_PROPAGANDA",
    ASSASSINATE_LEADER = "ASSASSINATE_LEADER",
    ATTACK_TAX_CONVOYS = "ATTACK_TAX_CONVOYS",
    STEAL_FROM_GRANARIES = "STEAL_FROM_GRANARIES",
    BURN_CROP_FIELDS = "BURN_CROP_FIELDS",
    START_URBAN_FIRE = "START_URBAN_FIRE",
    PREPARE_GRAND_INSURRECTION = "PREPARE_GRAND_INSURRECTION"
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
    isOneTime?: boolean;
};
export declare const CLANDESTINE_ACTIONS: Record<ClandestineActionId, ClandestineActionType>;
/**
 * Persistent state for an active clandestine action.
 * Stored on Character.activeClandestineActions for sync between client/server.
 */
export interface ActiveClandestineAction {
    actionId: string;
    turnStarted?: number;
    targetLeaderId?: string;
    oneTimeGoldAmount?: number;
    isRevealed?: boolean;
}
/**
 * Risk level values for calculation.
 * Low = 1, Moderate = 2, High = 3, Extremely High = 4
 */
export declare const CLANDESTINE_ACTION_RISKS: Record<string, number>;
/**
 * Cost per turn for each recurring clandestine action.
 * One-time actions have costPerTurn = 0.
 */
export declare const CLANDESTINE_ACTION_COSTS: Record<string, number>;
/**
 * Event types for clandestine alerts modal
 */
export declare enum ClandestineAlertEventType {
    INFILTRATION_SUCCESS = "infiltration_success",
    INFILTRATION_DETECTED = "infiltration_detected",
    HUNT_NETWORKS_ACTIVATED = "hunt_networks_activated",
    DETECTION_WARNING = "detection_warning",
    /** Agent's detection level exceeded threshold - now at risk */
    THRESHOLD_EXCEEDED = "threshold_exceeded",
    /** PARANOID governor appointed in agent's location */
    PARANOID_GOVERNOR_APPOINTED = "paranoid_governor_appointed",
    /** Both PARANOID governor AND HUNT_NETWORKS activated same turn */
    COMBINED_PARANOID_HUNT = "combined_paranoid_hunt",
    /** Leader captured and executed */
    EXECUTION = "execution",
    /** Leader captured but escaped (Daredevil) */
    ESCAPE = "escape",
    OTHER = "other"
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
