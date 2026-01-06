import { Character, Location, LogEntry, LogSeverity, LogType, FactionId } from '../../../types';
import { LeaderStatLevel } from '../../../types/leaderTypes';

export interface DistributePamphletsResult {
    location: Location;
    log: LogEntry | null;
}

/**
 * Process the effects of distributing pamphlets.
 * 
 * @param leader The undercover leader performing the action
 * @param location The location where the action takes place
 * @param turn Current game turn
 */
export function processDistributePamphlets(
    leader: Character,
    location: Location,
    turn: number
): DistributePamphletsResult {
    const controllerFaction = location.faction;

    // Cannot increase resentment against Neutral (mechanic not supported)
    if (controllerFaction === FactionId.NEUTRAL) {
        return { location, log: null };
    }

    // 1. Calculate Resentment Increase
    // Amount = 2 * Clandestine Ops Level (doubled for balance)
    const opsLevel = leader.stats.clandestineOps || LeaderStatLevel.INEPT;
    const increaseAmount = 2 * opsLevel;

    // Apply resentment increase
    let updatedLocation = { ...location };

    // Initialize resentment object if missing
    if (!updatedLocation.resentment) {
        updatedLocation.resentment = {
            [FactionId.NOBLES]: 0,
            [FactionId.CONSPIRATORS]: 0,
            [FactionId.REPUBLICANS]: 0
        };
    }

    const factionKey = controllerFaction as keyof typeof updatedLocation.resentment;

    // Check if valid faction key
    if (factionKey in updatedLocation.resentment!) {
        const currentResentment = updatedLocation.resentment![factionKey] || 0;
        const newResentment = Math.min(100, currentResentment + increaseAmount);

        updatedLocation.resentment = {
            ...updatedLocation.resentment!,
            [factionKey]: newResentment
        };
    }

    // 2. Check for Warning Log (25% chance)
    let log: LogEntry | null = null;
    if (Math.random() < 0.25) {
        log = {
            id: `pamphlets-warn-${turn}-${location.id}`,
            // Using LEADER type as it relates to clandestine actions (closest fit)
            type: LogType.LEADER,
            message: `Something is steering the people’s mind against us in ${location.name}…`,
            turn,
            visibleToFactions: [controllerFaction],
            baseSeverity: LogSeverity.WARNING,
            highlightTarget: {
                type: 'LOCATION',
                id: location.id
            }
        };
    }

    return {
        location: updatedLocation,
        log
    };
}

/**
 * Check if the action should be auto-disabled.
 * Conditions:
 * 1. Resentment against controller is 100
 * (Budget check handled by caller)
 */
export function shouldDisableDistributePamphlets(
    location: Location
): boolean {
    const controllerFaction = location.faction;
    if (controllerFaction === FactionId.NEUTRAL) return true; // Disable if neutral context

    if (!location.resentment) return false;

    const factionKey = controllerFaction as keyof typeof location.resentment;
    if (factionKey in location.resentment) {
        return (location.resentment[factionKey] || 0) >= 100;
    }

    return false;
}
