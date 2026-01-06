/**
 * Steal From Granaries - Clandestine Action
 * 
 * Logic for stealing (sabotaging) food from enemy granaries.
 */

import { Character, Location, LogEntry, LogType, LogSeverity, LocationType } from '../../../types';

export interface StealFromGranariesResult {
    destroyedAmount: number;
    log?: LogEntry;  // Success log for leader (feedback)
    warningLog?: LogEntry; // Warning log for victim
    targetLocationId?: string; // ID of the city where food was destroyed
}

/**
 * Check if the action should be disabled (e.g. no budget)
 */
export function shouldDisableStealFromGranaries(leaderBudget: number): boolean {
    return leaderBudget <= 0;
}

/**
 * Process the Steal From Granaries action
 */
export function processStealFromGranaries(
    leader: Character,
    location: Location,
    locations: Location[],
    turn: number
): StealFromGranariesResult {
    const clandestineLevel = leader.stats.clandestineOps || 1;

    // 1. Success Chance: 10% * Clandestine Level
    const chance = 0.10 * clandestineLevel;
    const roll = Math.random();

    if (roll >= chance) {
        return { destroyedAmount: 0 };
    }

    // 2. Identify Target City
    // If in Rural area, target is the linked City (granaries are in cities).
    // If in City, target is the City itself.
    let targetLocation = location;
    if (location.type === LocationType.RURAL && location.linkedLocationId) {
        const linkedCity = locations.find(l => l.id === location.linkedLocationId);
        if (linkedCity) {
            targetLocation = linkedCity;
        }
    }

    // 3. Calculate Destroyed Amount (Stealing implies consumption/removal)
    // Random amount [1, 5] * Clandestine Level
    const randomBase = Math.floor(Math.random() * 5) + 1; // 1 to 5
    const potentialAmount = randomBase * clandestineLevel;

    // Cap at target location food stock
    const currentStock = targetLocation.foodStock || 0;
    const destroyedAmount = Math.min(potentialAmount, currentStock);

    if (destroyedAmount <= 0) {
        return { destroyedAmount: 0 };
    }

    const controllerFaction = location.faction;

    // 4. Generate Logs

    // GOOD Log for Leader (Feedback)
    // Note: Spec didn't explicitly request this log, but it's standard UX.
    const successLog: LogEntry = {
        id: `steal-grain-success-${turn}-${leader.id}`,
        type: LogType.FAMINE, // Or ECONOMY? Using FAMINE/ECONOMY as it relates to food.
        message: `Sabotage successful! We destroyed ${destroyedAmount} food from the granaries in ${targetLocation.name}.`,
        turn,
        visibleToFactions: [leader.faction],
        baseSeverity: LogSeverity.GOOD
    };

    // Warning Log for Victim (50% Chance)
    let warningLog: LogEntry | undefined;
    if (Math.random() < 0.5) {
        warningLog = {
            id: `steal-grain-warning-${turn}-${leader.id}`,
            type: LogType.FAMINE, // Fits "Granaries"
            message: `Enemy agents have stolen from our granaries in ${location.name}!`,
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
        destroyedAmount,
        targetLocationId: targetLocation.id,
        log: successLog,
        warningLog
    };
}
