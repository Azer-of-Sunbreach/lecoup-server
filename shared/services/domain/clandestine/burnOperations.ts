/**
 * Burn Operations - Clandestine Action
 * 
 * Logic for "Burn crop fields" and "Start urban fire".
 */

import { Character, Location, LogEntry, LogType, LogSeverity, FactionId, CharacterStatus, ClandestineActionId } from '../../../types';

export interface BurnOperationResult {
    burnedAmount: number;
    resentmentIncrease: number; // For failure identification
    log?: LogEntry;  // Owner warning log
    feedbackLog?: LogEntry; // Operator feedback log
}

/**
 * Check if should disable based on budget or resource level
 */
export function shouldDisableBurnOperation(
    leaderBudget: number,
    resourceLevel: number, // Net Food or Total Revenue
    threshold: number = 15
): boolean {
    return leaderBudget <= 0 || resourceLevel <= threshold;
}

/**
 * Process Burn Operation
 */
export function processBurnOperation(
    actionId: ClandestineActionId,
    leader: Character,
    location: Location,
    characters: Character[],
    turn: number
): BurnOperationResult {
    const isUrban = actionId === 'START_URBAN_FIRE';
    const clandestineLevel = leader.stats.clandestineOps || 1;
    const discretion = leader.stats.discretion || 1;
    const stability = location.stability;

    // 1. Success Chance Calculation
    // Formula: 20% * Discretion - Stability%
    let chancePercent = (20 * discretion) - stability;

    // Governor Modifiers (Counter-Espionage)
    // Only apply reduction if governor has Hunt Networks policy active
    const governor = characters.find(c =>
        c.locationId === location.id &&
        c.faction === location.faction &&
        c.status === CharacterStatus.GOVERNING
    );

    // Check if Hunt Networks policy is active (not just governor presence)
    const isHuntNetworksActive = location.governorPolicies?.HUNT_NETWORKS === true;

    if (governor && isHuntNetworksActive) {
        // Reduction: -10 - (5 * Statesmanship) to success chance
        const statesmanship = governor.stats.statesmanship || 1;
        const reduction = 10 + (5 * statesmanship);
        chancePercent -= reduction;
    }

    // Clamp to 0
    chancePercent = Math.max(0, chancePercent);

    // Roll (0-100)
    const roll = Math.random() * 100;

    if (roll > chancePercent) {
        // FAILURE
        // 50% chance of identification -> Resentment +30
        const identified = Math.random() < 0.5;
        if (identified) {
            return {
                burnedAmount: 0,
                resentmentIncrease: 30,
                feedbackLog: {
                    id: `burn-fail-${turn}-${leader.id}`,
                    type: LogType.LEADER, // or SABOTAGE?
                    message: `Sabotage failed! Our agents were identified attempting to start fires in ${location.name}. Resentment has increased.`,
                    turn,
                    visibleToFactions: [leader.faction],
                    baseSeverity: LogSeverity.WARNING
                }
            };
        } else {
            return {
                burnedAmount: 0,
                resentmentIncrease: 0,
                feedbackLog: {
                    id: `burn-fail-${turn}-${leader.id}`,
                    type: LogType.LEADER,
                    message: `Sabotage failed! Our agents failed to start the fires in ${location.name} but remained undetected.`,
                    turn,
                    visibleToFactions: [leader.faction],
                    baseSeverity: LogSeverity.INFO
                }
            };
        }
    }

    // SUCCESS

    // Calculate Burned Amount
    // Rand(1, 5) * Clandestine Level
    const randomBase = Math.floor(Math.random() * 5) + 1;
    let amount = randomBase * clandestineLevel;

    // Cap at 15
    amount = Math.min(amount, 15);

    // Cap at Production (Total Revenue or Net Food)
    const totalResource = isUrban ? location.goldIncome : location.foodIncome;
    amount = Math.min(amount, Math.max(0, totalResource));

    if (amount <= 0) {
        // Nothing burned (maybe 0 income?)
        return { burnedAmount: 0, resentmentIncrease: 0 };
    }

    // Generate Logs
    const targetName = isUrban ? "manufactures" : "crop fields";
    const consequence = isUrban ? "Tax revenue has been lowered!" : "Food production has been lowered!";

    // Choose appropriate LogType
    const logType = isUrban ? LogType.ECONOMY : LogType.FAMINE;

    const log: LogEntry = {
        id: `burn-warning-${turn}-${leader.id}`,
        // LogType.WARNING does not exist, using appropriate category
        type: logType,
        message: `Enemy agents have burned ${targetName} in ${location.name}! ${consequence}`,
        turn,
        visibleToFactions: [location.faction],
        baseSeverity: LogSeverity.WARNING,
        highlightTarget: {
            type: 'LOCATION',
            id: location.id
        }
    };

    const feedbackLog: LogEntry = {
        id: `burn-success-${turn}-${leader.id}`,
        type: LogType.LEADER,
        message: `Sabotage successful! We burned ${targetName} in ${location.name}, destroying ${amount} worth of resources.`,
        turn,
        visibleToFactions: [leader.faction],
        baseSeverity: LogSeverity.GOOD
    };

    return {
        burnedAmount: amount,
        resentmentIncrease: 0,
        log,
        feedbackLog
    };
}
