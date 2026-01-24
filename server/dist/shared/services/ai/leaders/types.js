"use strict";
/**
 * AI Leader System - Core Types
 *
 * Defines all types used by the AI leader decision system.
 * These are separate from game domain types (shared/types/) and specific
 * to AI decision-making logic.
 *
 * @module shared/services/ai/leaders
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.STABILITY_THRESHOLDS = exports.CLANDESTINE_BUDGET = exports.GRAND_INSURRECTION_PREP_TURNS = exports.AILeaderRole = void 0;
// ============================================================================
// ROLE DEFINITIONS
// ============================================================================
/**
 * Roles a leader can be assigned by the AI.
 *
 * Governor: Manages a territory (policies, stability, economy)
 * Clandestine: Operates undercover in enemy territory
 * Commander: Leads an army (attached for combat bonus)
 * Protector: LEGENDARY leader blocking enemy insurrections
 * Stabilizer: Leader with passive stability bonus
 * Idle: No current assignment, waiting for opportunity
 */
var AILeaderRole;
(function (AILeaderRole) {
    AILeaderRole["GOVERNOR"] = "GOVERNOR";
    AILeaderRole["CLANDESTINE"] = "CLANDESTINE";
    AILeaderRole["COMMANDER"] = "COMMANDER";
    AILeaderRole["PROTECTOR"] = "PROTECTOR";
    AILeaderRole["STABILIZER"] = "STABILIZER";
    AILeaderRole["IDLE"] = "IDLE";
})(AILeaderRole || (exports.AILeaderRole = AILeaderRole = {}));
// ============================================================================
// CONSTANTS
// ============================================================================
/**
 * Grand Insurrection preparation time in turns.
 */
exports.GRAND_INSURRECTION_PREP_TURNS = 4;
/**
 * Budget limits for clandestine operations.
 */
exports.CLANDESTINE_BUDGET = {
    MIN: 100,
    MAX: 700,
    DEFAULT: 400,
    SCORCHED_EARTH_MIN: 200
};
/**
 * Stability thresholds for AI decisions.
 */
exports.STABILITY_THRESHOLDS = {
    CRITICAL: 30,
    LOW: 50,
    STABLE: 70,
    SAFE: 85
};
