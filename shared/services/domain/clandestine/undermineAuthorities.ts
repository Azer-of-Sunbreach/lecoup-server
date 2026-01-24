/**
 * Undermine Authorities - Clandestine action effect processor
 * 
 * Effect: Reduces stability by clandestineOps level each turn.
 * Risk: MODERATE
 * Cost: 10 gold/turn from leader budget
 * 
 * @see Spécifications fonctionnelles Nouvelle gestion des leaders.txt
 */

import { Character, Location, LogEntry } from '../../../types';
import { createClandestineSabotageWarningLog } from '../../logs/logFactory';

/**
 * Process Undermine Authorities effect for a single leader.
 * 
 * @param leader The clandestine agent performing the action
 * @param location The target location (enemy territory)
 * @param turn Current game turn
 * @returns Updated location and optional warning log for defender
 */
export function processUndermineAuthorities(
    leader: Character,
    location: Location,
    turn: number
): { location: Location; log?: LogEntry; reductionAmount: number } {
    // Get leader's clandestineOps level (1-5, defaults to 3 if not set)
    const clandestineOpsLevel = leader.stats.clandestineOps ?? 3;

    // Calculate stability reduction: 2 points per clandestineOps level (doubled for balance)
    const stabilityReduction = 2 * clandestineOpsLevel;

    // Apply stability reduction (minimum 0)
    const newStability = Math.max(0, location.stability - stabilityReduction);

    const updatedLocation: Location = {
        ...location,
        stability: newStability
    };

    // 25% chance to generate warning log for defender
    let warningLog: LogEntry | undefined;

    if (Math.random() < 0.25) {
        warningLog = createClandestineSabotageWarningLog(
            location.id,
            location.faction,
            turn
        );
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
export function shouldDisableUndermineAuthorities(
    leaderBudget: number,
    locationStability: number
): boolean {
    return leaderBudget <= 0 || locationStability <= 0;
}
