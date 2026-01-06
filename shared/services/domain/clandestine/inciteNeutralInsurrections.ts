/**
 * Incite Neutral Insurrections - Clandestine Action Processor
 * 
 * Generates neutral insurgent armies in enemy-controlled territories.
 * 
 * @see ./insurrectionFormulas.ts - Centralized formulas for insurgent estimation
 * @module inciteNeutralInsurrections
 */

import { Character, Location, LogEntry, LogType, LogSeverity, FactionId, Army } from '../../../types';
import { ActiveClandestineAction } from '../../../types/clandestineTypes';
import { isNeutralInsurrectionBlocked, createBlockedInsurrectionLog } from '../governor/makeExamples';

/**
 * Result of the incite neutral insurrections process
 */
export interface InciteInsurrectionResult {
    log?: LogEntry;          // Warning log for the defender
    feedbackLog?: LogEntry;  // Feedback log for the operator
    newArmy?: Army;          // The generated neutral army
    popDeduction?: number;   // Amount of population to remove
    refund?: number;         // Gold refund if action was blocked
}

/**
 * Check if the action should be disabled (e.g. not enough budget)
 */
export function shouldDisableInciteNeutralInsurrections(leaderBudget: number): boolean {
    return leaderBudget <= 0;
}

/**
 * Calculate the number of insurgents to spawn
 */
export function calculateInsurgentStrength(
    leader: Character,
    location: Location
): number {
    const population = location.population || 0;
    // Clandestine ops level (1-5), default to 1 if missing
    // Use safe access just in case
    const stats = leader.stats || {};
    const clandestineLevel = (stats as any).clandestineOps || 1;

    // Resentment against the CONTROLLING faction
    // Default to 0 if no resentment entry exists
    const controllerFaction = location.faction;
    const resentmentObj = location.resentment as Record<string, number> | undefined;
    const resentment = resentmentObj?.[controllerFaction] || 0;

    const stability = location.stability || 0;

    // Formula:
    // City: (Pop * ClandestineOps * (Resentment + 1)) / (10000 * (1 + Stability/100))
    // Rural: (Pop * ClandestineOps * (Resentment + 1)) / (100000 * (1 + Stability/100))

    // Use string literal instead of Enum to avoid circular dependency runtime crashes
    const isCity = location.type === 'CITY';
    const divisorBase = isCity ? 10000 : 100000;

    const stabilityFactor = 1 + (stability / 100);
    const denominator = divisorBase * stabilityFactor;

    const numerator = population * clandestineLevel * (resentment + 1);

    // Use Math.ceil to ensure at least 1 insurgent if the result is positive but small
    const rawStrength = Math.ceil(numerator / denominator);

    // Cap at 1500
    return Math.min(1500, rawStrength);
}

/**
 * Process the Incite Neutral Insurrections action
 */
export function processInciteNeutralInsurrections(
    leader: Character,
    location: Location,
    activeAction: ActiveClandestineAction,
    turn: number
): InciteInsurrectionResult {
    const turnStarted = activeAction.turnStarted;

    // Should not happen if initialized correctly in processor, but safe fallback
    if (turnStarted === undefined) return {};

    const duration = turn - turnStarted;

    const uniqueId = Math.random().toString(36).substring(2, 9);

    // T1 (duration 1): Send Warning Log
    if (duration === 1) {
        const warningLog: LogEntry = {
            id: `incite-insurrection-warn-${turn}-${location.id}-${uniqueId}`,
            type: LogType.INSURRECTION,
            message: `Enemy agents have been reported stirring imminent neutral insurrections against us in ${location.name}!`,
            turn,
            visibleToFactions: [location.faction],
            baseSeverity: LogSeverity.CRITICAL,
            criticalForFactions: [location.faction],
            highlightTarget: { type: 'LOCATION', id: location.id }
        };

        return { log: warningLog };
    }

    // T2+ (duration >= 2): Generate Insurgents
    if (duration >= 2) {
        // === MAKE EXAMPLES BLOCKING CHECK ===
        // If neutral insurrections are blocked due to recent brutal repression
        if (isNeutralInsurrectionBlocked(location, turn)) {
            const governorName = location.neutralInsurrectionBlockedBy || "The Governor";
            const message = `${leader.name} failed to mobilize a civilian insurrection in ${location.name}. ${governorName}'s hanging are still lingering in the people's mind.`;

            // Log for the INSTIGATOR (Warning level)
            const feedbackLog: LogEntry = {
                id: `blocked-insurrection-${turn}-${location.id}`,
                type: LogType.INSURRECTION,
                message: message,
                turn,
                visibleToFactions: [leader.faction],
                baseSeverity: LogSeverity.WARNING,
                highlightTarget: { type: 'LOCATION', id: location.id }
            };

            // Refund the cost (50 gold)
            return { feedbackLog, refund: 50 };
        }

        const strength = calculateInsurgentStrength(leader, location);

        // If strength is 0 (e.g. 0 population), don't spawn
        if (strength <= 0) return {};

        const popDeduction = strength;

        const newArmy: Army = {
            id: `neutral-insurgents-${turn}-${location.id}-${uniqueId}`,
            faction: FactionId.NEUTRAL,
            locationId: location.id,
            locationType: 'LOCATION',
            tripOriginId: location.id,
            stageIndex: 0,
            direction: 'FORWARD',
            roadId: null,
            strength: strength,
            isInsurgent: true,
            isSieging: false,
            isSpent: false,
            foodSourceId: 'forage',
            turnsUntilArrival: 0,
            lastSafePosition: { type: 'LOCATION', id: location.id },
            originLocationId: location.id, // Legacy field
            destinationId: null // Legacy field
        };

        const feedbackLog: LogEntry = {
            id: `incite-insurrection-spawn-${turn}-${location.id}-${uniqueId}`,
            type: LogType.INSURRECTION,
            message: `Our agents in ${location.name} have successfully incited ${strength} commoners to take up arms against the ${location.faction}!`,
            turn,
            visibleToFactions: [leader.faction],
            baseSeverity: LogSeverity.GOOD
        };

        return {
            newArmy,
            popDeduction,
            feedbackLog
        };
    }

    return {};
}
