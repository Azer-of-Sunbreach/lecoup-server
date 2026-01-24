"use strict";
/**
 * Clandestine Types - Types for clandestine operations state
 *
 * Defines persistent state for clandestine actions that leaders perform
 * in enemy territories. Stored on Character for multiplayer sync.
 *
 * @see Application/components/game/clandestine/ClandestineActionTypes.ts for UI definitions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClandestineAlertEventType = exports.CLANDESTINE_ACTION_COSTS = exports.CLANDESTINE_ACTION_RISKS = exports.CLANDESTINE_ACTIONS = exports.ClandestineActionId = void 0;
// Re-use the ClandestineActionId from the existing Application types
// Note: This type mirrors the one in Application but is defined in shared for domain use
var ClandestineActionId;
(function (ClandestineActionId) {
    ClandestineActionId["UNDERMINE_AUTHORITIES"] = "UNDERMINE_AUTHORITIES";
    ClandestineActionId["DISTRIBUTE_PAMPHLETS"] = "DISTRIBUTE_PAMPHLETS";
    ClandestineActionId["INCITE_NEUTRAL_INSURRECTIONS"] = "INCITE_NEUTRAL_INSURRECTIONS";
    ClandestineActionId["SPREAD_PROPAGANDA"] = "SPREAD_PROPAGANDA";
    ClandestineActionId["ASSASSINATE_LEADER"] = "ASSASSINATE_LEADER";
    ClandestineActionId["ATTACK_TAX_CONVOYS"] = "ATTACK_TAX_CONVOYS";
    ClandestineActionId["STEAL_FROM_GRANARIES"] = "STEAL_FROM_GRANARIES";
    ClandestineActionId["BURN_CROP_FIELDS"] = "BURN_CROP_FIELDS";
    ClandestineActionId["START_URBAN_FIRE"] = "START_URBAN_FIRE";
    ClandestineActionId["PREPARE_GRAND_INSURRECTION"] = "PREPARE_GRAND_INSURRECTION";
})(ClandestineActionId || (exports.ClandestineActionId = ClandestineActionId = {}));
exports.CLANDESTINE_ACTIONS = {
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
 * Risk level values for calculation.
 * Low = 1, Moderate = 2, High = 3, Extremely High = 4
 */
exports.CLANDESTINE_ACTION_RISKS = {
    UNDERMINE_AUTHORITIES: 1, // Low (was Moderate)
    DISTRIBUTE_PAMPHLETS: 1, // Low (was Moderate)
    INCITE_NEUTRAL_INSURRECTIONS: 2, // Moderate (was High)
    SPREAD_PROPAGANDA: 1,
    ASSASSINATE_LEADER: 3, // High (was Extreme)
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
exports.CLANDESTINE_ACTION_COSTS = {
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
var ClandestineAlertEventType;
(function (ClandestineAlertEventType) {
    ClandestineAlertEventType["INFILTRATION_SUCCESS"] = "infiltration_success";
    ClandestineAlertEventType["INFILTRATION_DETECTED"] = "infiltration_detected";
    ClandestineAlertEventType["HUNT_NETWORKS_ACTIVATED"] = "hunt_networks_activated";
    ClandestineAlertEventType["DETECTION_WARNING"] = "detection_warning";
    // === Detection Level System Events (2026-01-10) ===
    /** Agent's detection level exceeded threshold - now at risk */
    ClandestineAlertEventType["THRESHOLD_EXCEEDED"] = "threshold_exceeded";
    /** PARANOID governor appointed in agent's location */
    ClandestineAlertEventType["PARANOID_GOVERNOR_APPOINTED"] = "paranoid_governor_appointed";
    /** Both PARANOID governor AND HUNT_NETWORKS activated same turn */
    ClandestineAlertEventType["COMBINED_PARANOID_HUNT"] = "combined_paranoid_hunt";
    /** Leader captured and executed */
    ClandestineAlertEventType["EXECUTION"] = "execution";
    /** Leader captured but escaped (Daredevil) */
    ClandestineAlertEventType["ESCAPE"] = "escape";
    ClandestineAlertEventType["OTHER"] = "other";
})(ClandestineAlertEventType || (exports.ClandestineAlertEventType = ClandestineAlertEventType = {}));
