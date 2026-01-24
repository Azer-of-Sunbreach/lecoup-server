/**
 * Attack Tax Convoys - Clandestine Action
 * 
 * Logic for attacking tax convoys to steal gold.
 */

import { Character, Location, LogEntry, LogType, LogSeverity, FactionId, LocationType } from '../../../types';

export interface AttackTaxConvoysResult {
    stolenAmount: number;
    log?: LogEntry;  // Primary success log for leader
    warningLog?: LogEntry; // Warning log for victim
}

/**
 * Check if the action should be disabled (e.g. no budget)
 */
export function shouldDisableAttackTaxConvoys(leaderBudget: number): boolean {
    return leaderBudget <= 0;
}

/**
 * Process the Attack Tax Convoys action
 */
export function processAttackTaxConvoys(
    leader: Character,
    location: Location,
    locations: Location[],
    turn: number
): AttackTaxConvoysResult {
    const clandestineLevel = leader.stats.clandestineOps || 1;

    // 1. Success Chance: 10% * Clandestine Level
    const chance = 0.10 * clandestineLevel;
    const roll = Math.random();

    if (roll >= chance) {
        return { stolenAmount: 0 };
    }

    // 2. Identify Target Income Source
    // If in Rural area, target is the attached City.
    // If in City, target is the City itself.
    let targetLocation = location;
    if (location.type === LocationType.RURAL && location.linkedLocationId) {
        const linkedCity = locations.find(l => l.id === location.linkedLocationId);
        if (linkedCity) {
            targetLocation = linkedCity;
        }
    }

    // 3. Calculate Stolen Amount
    // Random amount [1, 5] * Clandestine Level
    const randomBase = Math.floor(Math.random() * 5) + 1; // 1 to 5
    const potentialAmount = randomBase * clandestineLevel;

    // Cap at target location income
    const maxAmount = Math.max(0, targetLocation.goldIncome);
    const stolenAmount = Math.min(potentialAmount, maxAmount);

    if (stolenAmount <= 0) {
        return { stolenAmount: 0 };
    }

    const controllerFaction = location.faction;

    // 4. Generate Logs

    // GOOD Log for Leader
    const successLog: LogEntry = {
        id: `attack-tax-success-${turn}-${leader.id}`,
        type: LogType.ECONOMY, // Or LEADER/CRIME? Using ECONOMY fits "Stolen gold". Or CONVOY? User didn't specify category, but msg implies success.
        message: `${stolenAmount} gold stolen from the enemy in ${location.name} and added to ${leader.name}'s cell treasury.`,
        turn,
        visibleToFactions: [leader.faction],
        baseSeverity: LogSeverity.GOOD,
        i18nKey: 'attackTaxSuccess',
        i18nParams: { amount: stolenAmount, location: location.id, leader: leader.id }
    };

    // Warning Log for Victim (50% Chance)
    let warningLog: LogEntry | undefined;
    if (Math.random() < 0.5) {
        warningLog = {
            id: `attack-tax-warning-${turn}-${leader.id}`,
            // LogType.WARNING does not exist, using ECONOMY as it relates to tax convoys
            type: LogType.ECONOMY,
            message: `Enemy agents have attacked our tax convoys in ${location.name}!`,
            turn,
            visibleToFactions: [controllerFaction],
            baseSeverity: LogSeverity.WARNING,
            highlightTarget: {
                type: 'LOCATION',
                id: location.id
            },
            i18nKey: 'attackTaxWarning',
            i18nParams: { location: location.id }
        };
    }

    return {
        stolenAmount,
        log: successLog,
        warningLog
    };
}
