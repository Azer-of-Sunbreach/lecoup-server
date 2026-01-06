/**
 * Spread Propaganda - Clandestine Action
 * 
 * Effect: Reduces resentment against the leader's faction each turn.
 * Amount = Leader's Clandestine Operations Level (1-5).
 * 
 * Auto-disable: When resentment reaches 0.
 */

import { Character, Location, LogEntry, FactionId } from '../../../types';
import { LeaderStatLevel } from '../../../types/leaderTypes';

export interface SpreadPropagandaResult {
    location: Location;
    log: LogEntry | null;
}

/**
 * Process the effects of spreading propaganda.
 * 
 * @param leader The undercover leader performing the action
 * @param location The location where the action takes place
 * @param turn Current game turn
 */
export function processSpreadPropaganda(
    leader: Character,
    location: Location,
    turn: number
): SpreadPropagandaResult {
    const leaderFaction = leader.faction;

    // Cannot reduce resentment against Neutral (not tracked)
    if (leaderFaction === FactionId.NEUTRAL) {
        return { location, log: null };
    }

    // 1. Calculate Resentment Reduction
    // Amount = Clandestine Ops Level (default to INEPT=1 if missing)
    const opsLevel = leader.stats.clandestineOps || LeaderStatLevel.INEPT;
    const decreaseAmount = opsLevel;

    // Apply resentment reduction
    let updatedLocation = { ...location };

    // Initialize resentment object if missing
    if (!updatedLocation.resentment) {
        updatedLocation.resentment = {
            [FactionId.NOBLES]: 0,
            [FactionId.CONSPIRATORS]: 0,
            [FactionId.REPUBLICANS]: 0
        };
    }

    const factionKey = leaderFaction as keyof typeof updatedLocation.resentment;

    // Check if valid faction key
    if (factionKey in updatedLocation.resentment!) {
        const currentResentment = updatedLocation.resentment![factionKey] || 0;
        const newResentment = Math.max(0, currentResentment - decreaseAmount);

        updatedLocation.resentment = {
            ...updatedLocation.resentment!,
            [factionKey]: newResentment
        };
    }

    return {
        location: updatedLocation,
        log: null // No log specified for this action
    };
}

/**
 * Check if the action should be auto-disabled.
 * Conditions:
 * 1. Resentment against leader's faction is 0
 * (Budget check handled by caller)
 */
export function shouldDisableSpreadPropaganda(
    location: Location,
    leaderFaction: FactionId
): boolean {
    if (leaderFaction === FactionId.NEUTRAL) return true;

    if (!location.resentment) return false;

    const factionKey = leaderFaction as keyof typeof location.resentment;
    if (factionKey in location.resentment) {
        return (location.resentment[factionKey] || 0) <= 0;
    }

    return true; // Default to disable if faction not found in resentment keys
}
