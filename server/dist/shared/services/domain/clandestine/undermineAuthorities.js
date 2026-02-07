"use strict";
/**
 * Undermine Authorities - Clandestine action effect processor
 *
 * Effect: Reduces stability by clandestineOps level each turn.
 * Risk: MODERATE
 * Cost: 10 gold/turn from leader budget
 *
 * @see Spécifications fonctionnelles Nouvelle gestion des leaders.txt
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.processUndermineAuthorities = processUndermineAuthorities;
exports.shouldDisableUndermineAuthorities = shouldDisableUndermineAuthorities;
const logFactory_1 = require("../../logs/logFactory");
/**
 * Process Undermine Authorities effect for a single leader.
 *
 * @param leader The clandestine agent performing the action
 * @param location The target location (enemy territory)
 * @param turn Current game turn
 * @returns Updated location and optional warning log for defender
 */
function processUndermineAuthorities(leader, location, turn) {
    // Get leader's clandestineOps level (1-5, defaults to 3 if not set)
    const clandestineOpsLevel = leader.stats.clandestineOps ?? 3;
    // Calculate stability reduction: 2 points per clandestineOps level (doubled for balance)
    const stabilityReduction = 2 * clandestineOpsLevel;
    // Apply stability reduction (minimum 0)
    const newStability = Math.max(0, location.stability - stabilityReduction);
    const updatedLocation = {
        ...location,
        stability: newStability
    };
    // 25% chance to generate warning log for defender
    let warningLog;
    if (Math.random() < 0.25) {
        warningLog = (0, logFactory_1.createClandestineSabotageWarningLog)(location.id, location.faction, turn);
    }
    return {
        location: updatedLocation,
        log: warningLog,
        reductionAmount: stabilityReduction
    };
}
/**
 * Check if Undermine Authorities should be auto-disabled.
 * Conditions: budget empty OR stability at 0
 */
function shouldDisableUndermineAuthorities(leaderBudget, locationStability) {
    return leaderBudget <= 0 || locationStability <= 0;
}
