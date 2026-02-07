/**
 * Log Factory - Helper functions for creating structured log entries
 * Centralizes log creation logic with proper metadata for personalization and highlighting
 */

import { FactionId, LogEntry, LogType, LogSeverity, LogHighlightTarget } from '../../types';

let logIdCounter = 0;

/** Generate unique log ID */
const generateLogId = (): string => {
    logIdCounter++;
    return `log_${Date.now()}_${logIdCounter}`;
};

/**
 * Create a simple generic log from a string message.
 * Use for basic logging where no specific type/visibility is needed.
 */
export const createGenericLog = (message: string, turn: number = 1): LogEntry => ({
    id: generateLogId(),
    type: LogType.NARRATIVE,
    message,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.INFO
});

/** Get all player factions (excludes NEUTRAL) */
const ALL_PLAYER_FACTIONS: FactionId[] = [
    FactionId.REPUBLICANS,
    FactionId.CONSPIRATORS,
    FactionId.NOBLES
];

// ============================================================================
// CORE LOG CREATORS
// ============================================================================

/**
 * Create a turn marker log (visible to all)
 */
export const createTurnMarkerLog = (turn: number): LogEntry => ({
    id: generateLogId(),
    type: LogType.TURN_MARKER,
    message: `--- Turn ${turn} ---`,
    turn,
    visibleToFactions: [],  // Empty = visible to all
    baseSeverity: LogSeverity.INFO,
    i18nKey: 'turnMarker',
    i18nParams: { turn }
});

/**
 * Create a game start log (visible to all)
 */
export const createGameStartLog = (message: string, turn: number): LogEntry => ({
    id: generateLogId(),
    type: LogType.GAME_START,
    message,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.INFO,
    i18nKey: 'gameStart'
});

/**
 * Create a faction chosen log (visible to player)
 */
export const createFactionChosenLog = (faction: FactionId, turn: number): LogEntry => ({
    id: generateLogId(),
    type: LogType.GAME_START,
    message: `You have chosen the ${faction}.`,
    turn,
    visibleToFactions: [faction],
    baseSeverity: LogSeverity.INFO,
    i18nKey: 'factionChosen',
    i18nParams: { faction }
});

// ============================================================================
// MOVEMENT LOGS
// ============================================================================

/**
 * Create a "Forces marching" warning log (visible only to destination owner if enemy)
 * Returns null if not visible to any player faction (e.g., same faction moving)
 */
export const createForcesApproachingLog = (
    destinationId: string,
    destinationFaction: FactionId,
    movingFaction: FactionId,
    armyId: string,
    turn: number
): LogEntry | null => {
    // Not visible if same faction or destination is NEUTRAL
    if (destinationFaction === movingFaction || destinationFaction === FactionId.NEUTRAL) {
        return null;
    }

    return {
        id: generateLogId(),
        type: LogType.MOVEMENT,
        message: `Forces marching to ${destinationId}.`,
        turn,
        visibleToFactions: [destinationFaction],
        baseSeverity: LogSeverity.WARNING,
        highlightTarget: { type: 'ARMY', id: armyId },
        i18nKey: 'forcesMarching',
        i18nParams: { destination: destinationId }
    };
};

/**
 * Create a "Location secured" log
 * CRITICAL if player lost the location, INFO otherwise
 */
export const createLocationSecuredLog = (
    locationId: string,
    previousFaction: FactionId,
    newFaction: FactionId,
    turn: number
): LogEntry => {
    return {
        id: generateLogId(),
        type: LogType.CAPTURE,
        message: `${locationId} secured by ${newFaction}.`,
        turn,
        visibleToFactions: [],  // All see it
        baseSeverity: LogSeverity.INFO,
        criticalForFactions: previousFaction !== FactionId.NEUTRAL ? [previousFaction] : undefined,
        highlightTarget: { type: 'LOCATION', id: locationId },
        i18nKey: 'locationSecured',
        i18nParams: { location: locationId, faction: newFaction }
    };
};

/**
 * Create a "Location captured (uncontested)" log
 */
export const createCaptureUncontestedLog = (
    locationId: string,
    previousFaction: FactionId,
    newFaction: FactionId,
    turn: number
): LogEntry => {
    return {
        id: generateLogId(),
        type: LogType.CAPTURE,
        message: `${locationId} captured by ${newFaction} (Uncontested).`,
        turn,
        visibleToFactions: [],
        baseSeverity: LogSeverity.INFO,
        criticalForFactions: previousFaction !== FactionId.NEUTRAL ? [previousFaction] : undefined,
        highlightTarget: { type: 'LOCATION', id: locationId },
        i18nKey: 'locationCapturedUncontested',
        i18nParams: { location: locationId, faction: newFaction }
    };
};

// ============================================================================
// CONVOY LOGS
// ============================================================================

/**
 * Create a convoy arrival log
 */
export const createConvoyArrivalLog = (
    cityId: string,
    amount: number,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.CONVOY,
    message: `Convoy arrived at ${cityId} with ${amount} food.`,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.INFO,
    highlightTarget: { type: 'LOCATION', id: cityId },
    i18nKey: 'convoyArrived',
    i18nParams: { city: cityId, amount }
});

/**
 * Create a naval convoy arrival log
 */
export const createNavalConvoyArrivalLog = (
    cityId: string,
    amount: number,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.CONVOY,
    message: `Naval convoy arrived at ${cityId} with ${amount} food.`,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.INFO,
    highlightTarget: { type: 'LOCATION', id: cityId },
    i18nKey: 'navalConvoyArrived',
    i18nParams: { city: cityId, amount }
});

/**
 * Create a convoy dispatched log
 */
export const createConvoyDispatchedLog = (
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.CONVOY,
    message: `Convoy dispatched (FALLBACK).`,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.INFO,
    i18nKey: 'convoyDispatched',
    i18nParams: {}
});

/**
 * Create a naval convoy dispatched log
 */
export const createNavalConvoyDispatchedLog = (
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.CONVOY,
    message: `Naval convoy dispatched (FALLBACK).`,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.INFO,
    i18nKey: 'navalConvoyDispatched',
    i18nParams: {}
});

// ============================================================================
// INSURRECTION LOGS
// ============================================================================

/**
 * Create an insurrection preparation log
 */
export const createInsurrectionPreparationLog = (
    leaderId: string,
    locationId: string,
    locationFaction: FactionId,
    estimatedCount: number,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.INSURRECTION,
    message: `${leaderId} is preparing an insurrection in ${locationId}. Est: ${estimatedCount}`,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.INFO,
    criticalForFactions: locationFaction !== FactionId.NEUTRAL ? [locationFaction] : undefined,
    highlightTarget: { type: 'LOCATION', id: locationId },
    i18nKey: 'insurrectionPreparing',
    i18nParams: { leader: leaderId, location: locationId, count: estimatedCount }
});

/**
 * Create an uprising log
 */
export const createUprisingLog = (
    leaderId: string,
    locationId: string,
    locationFaction: FactionId,
    rebelCount: number,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.INSURRECTION,
    message: `Uprising in ${locationId}! ${leaderId} leads ${rebelCount} rebels.`,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.INFO,
    criticalForFactions: locationFaction !== FactionId.NEUTRAL ? [locationFaction] : undefined,
    highlightTarget: { type: 'LOCATION', id: locationId },
    i18nKey: 'uprising',
    i18nParams: { leader: leaderId, location: locationId, count: rebelCount }
});

/**
 * Create a spontaneous uprising log
 */
export const createSpontaneousUprisingLog = (
    locationId: string,
    locationFaction: FactionId,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.INSURRECTION,
    message: `Spontaneous uprising in ${locationId}! The people have taken up arms.`,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.INFO,
    criticalForFactions: locationFaction !== FactionId.NEUTRAL ? [locationFaction] : undefined,
    highlightTarget: { type: 'LOCATION', id: locationId },
    i18nKey: 'spontaneousUprising',
    i18nParams: { location: locationId }
});

/**
 * Create an insurrection cancelled log (visible only to territory owner)
 */
export const createInsurrectionCancelledLog = (
    locationId: string,
    ownerFaction: FactionId,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.INSURRECTION,
    message: `Insurrection cancelled at ${locationId}. Gold refunded.`,
    turn,
    visibleToFactions: [ownerFaction],
    baseSeverity: LogSeverity.INFO,
    i18nKey: 'insurrectionCancelled',
    i18nParams: { location: locationId }
});

// ============================================================================
// NEGOTIATION LOGS
// ============================================================================

/**
 * Create a negotiations successful log
 */
export const createNegotiationsSuccessLog = (
    locationId: string,
    winnerFaction: FactionId,
    turn: number
): LogEntry => {
    // WARNING for enemies, INFO for winner
    const warningFactions = ALL_PLAYER_FACTIONS.filter(f => f !== winnerFaction);

    return {
        id: generateLogId(),
        type: LogType.NEGOTIATION,
        message: `Negotiations successful! ${locationId} has joined ${winnerFaction}.`,
        turn,
        visibleToFactions: [],
        baseSeverity: LogSeverity.INFO,
        warningForFactions: warningFactions,
        highlightTarget: { type: 'LOCATION', id: locationId },
        i18nKey: 'negotiationSuccess',
        i18nParams: { location: locationId, faction: winnerFaction }
    };
};

/**
 * Create a negotiations failed log (visible only to initiator)
 */
export const createNegotiationsFailedLog = (
    locationId: string,
    initiatorFaction: FactionId,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.NEGOTIATION,
    message: `Negotiations failed with ${locationId}.`,
    turn,
    visibleToFactions: [initiatorFaction],
    baseSeverity: LogSeverity.INFO,
    i18nKey: 'negotiationFailed',
    i18nParams: { location: locationId }
});

/**
 * Create a negotiation attempt log (visible to OTHER players as WARNING)
 * Used in multiplayer to notify other human players when someone initiates a negotiation
 */
export const createNegotiationAttemptLog = (
    locationId: string,
    initiatorFaction: FactionId,
    turn: number
): LogEntry => {
    // Visible to all OTHER player factions as WARNING
    const otherFactions = ALL_PLAYER_FACTIONS.filter(f => f !== initiatorFaction);

    return {
        id: generateLogId(),
        type: LogType.NEGOTIATION,
        message: `${initiatorFaction} has sent a negotiator to ${locationId}.`,
        turn,
        visibleToFactions: otherFactions,
        baseSeverity: LogSeverity.WARNING,
        warningForFactions: otherFactions,
        highlightTarget: { type: 'LOCATION', id: locationId },
        i18nKey: 'negotiationAttempt',
        i18nParams: { faction: initiatorFaction, location: locationId }
    };
};

// ============================================================================
// FAMINE LOGS
// ============================================================================

/**
 * Create a famine log
 * CRITICAL for city owner, WARNING for others
 */
export const createFamineLog = (
    cityId: string,
    cityFaction: FactionId,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.FAMINE,
    message: `Famine in ${cityId}! Stability plummets while the death toll mounts!`,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.WARNING,
    criticalForFactions: cityFaction !== FactionId.NEUTRAL ? [cityFaction] : undefined,
    i18nKey: 'famine',
    i18nParams: { city: cityId }
});

/**
 * Create a low food stock warning log
 * Visible only to city owner when food drops below 50
 */
export const createLowFoodWarningLog = (
    cityId: string,
    cityFaction: FactionId,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.FAMINE,
    message: `Stability drops in ${cityId} as worries mount due to low food stocks.`,
    turn,
    visibleToFactions: cityFaction !== FactionId.NEUTRAL ? [cityFaction] : [],
    baseSeverity: LogSeverity.WARNING,
    highlightTarget: { type: 'LOCATION', id: cityId },
    i18nKey: 'lowFoodWarning',
    i18nParams: { city: cityId }
});

// ============================================================================
// COMMERCE LOGS
// ============================================================================

/**
 * Create a grain trade restored log
 */
export const createGrainTradeRestoredLog = (turn: number): LogEntry => ({
    id: generateLogId(),
    type: LogType.COMMERCE,
    message: 'The Grain Trade has been restored due to change in control.',
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.WARNING,
    i18nKey: 'grainTradeRestored'
});

/**
 * Create a grain trade restored by conquest log
 */
export const createGrainTradeConquestLog = (turn: number): LogEntry => ({
    id: generateLogId(),
    type: LogType.COMMERCE,
    message: 'Grain Trade restored by conquest.',
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.WARNING,
    i18nKey: 'grainTradeConquest'
});

// ============================================================================
// LEADER LOGS
// ============================================================================

/**
 * Create a leader died log
 */
export const createLeaderDiedLog = (
    leaderId: string,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.LEADER,
    message: `${leaderId} died in battle.`,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.INFO,
    i18nKey: 'leaderDiedInBattle',
    i18nParams: { leader: leaderId }
});

/**
 * Create infiltration success log (green, good news)
 */
export const createInfiltrationSuccessLog = (
    leaderId: string,
    locationId: string,
    turn: number,
    visibleToFaction: FactionId
): LogEntry => ({
    id: generateLogId(),
    type: LogType.LEADER,
    message: `Agent ${leaderId} has infiltrated ${locationId} and is awaiting your orders.`,
    turn,
    visibleToFactions: [visibleToFaction],
    baseSeverity: LogSeverity.GOOD, // Green
    highlightTarget: { type: 'LOCATION', id: locationId }, // Clickable
    i18nKey: 'infiltrationSuccess',
    i18nParams: { leader: leaderId, location: locationId }
});

/**
 * Create infiltration detected log (warning)
 * Used when leader is spotted but NOT eliminated
 */
export const createInfiltrationDetectedLog = (
    leaderId: string,
    leaderFaction: FactionId,
    locationId: string,
    turn: number,
    visibleToFaction: FactionId,
    isOwnerMsg: boolean,
    pronoun: string = 'his' // Key for game:pronouns.his
): LogEntry => {
    return {
        id: generateLogId(),
        type: LogType.LEADER,
        message: `Infiltration detected.`,
        turn,
        visibleToFactions: [visibleToFaction],
        baseSeverity: LogSeverity.WARNING,
        highlightTarget: { type: 'LOCATION', id: locationId },
        i18nKey: isOwnerMsg ? 'infiltrationDetectedOwner' : 'infiltrationDetectedSender',
        i18nParams: isOwnerMsg
            ? { leader: leaderId, faction: leaderFaction, location: locationId }
            : { leader: leaderId, location: locationId, pronoun }
    };
};

/**
 * Create infiltration eliminated log (good news for defender)
 */
export const createInfiltrationEliminatedLog = (
    leaderId: string,
    leaderFaction: FactionId,
    locationId: string,
    turn: number,
    visibleToFaction: FactionId,
    pronoun: string = 'he' // Key for game:pronouns.he
): LogEntry => ({
    id: generateLogId(),
    type: LogType.LEADER,
    message: `Leader eliminated.`,
    turn,
    visibleToFactions: [visibleToFaction],
    baseSeverity: LogSeverity.WARNING,
    highlightTarget: { type: 'LOCATION', id: locationId },
    i18nKey: 'infiltrationEliminated',
    i18nParams: { leader: leaderId, faction: leaderFaction, location: locationId, pronoun }
});



/**
 * Create a leader took command log
 */
export const createLeaderCommandLog = (
    leaderId: string,
    missionId: string,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.LEADER,
    message: `${leaderId} took command.`,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.INFO,
    i18nKey: 'leaderTookCommand',
    i18nParams: { leader: leaderId, missionId }
});

// ============================================================================
// ECONOMY LOGS
// ============================================================================

/**
 * Create an AI seize food log
 */
export const createAISeizeFoodLog = (
    faction: FactionId,
    ruralId: string,
    cityId: string,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.ECONOMY,
    message: `${faction} seizes food.`,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.INFO,
    i18nKey: 'aiSeizeFood',
    i18nParams: { faction, rural: ruralId, city: cityId }
});

/**
 * Create an AI seize gold log
 */
export const createAISeizeGoldLog = (
    faction: FactionId,
    cityId: string,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.ECONOMY,
    message: `${faction} seizes gold.`,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.INFO,
    i18nKey: 'aiSeizeGold',
    i18nParams: { faction, city: cityId }
});

/**
 * Create an embargo log
 */
export const createEmbargoLog = (
    faction: FactionId,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.ECONOMY,
    message: `Embargo logic.`,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.INFO,
    i18nKey: 'embargo',
    i18nParams: { faction }
});

// ============================================================================
// COMBAT LOGS
// ============================================================================

/**
 * Create a combat log
 */
export const createCombatLog = (
    message: string,
    turn: number,
    i18nKey?: string,
    i18nParams?: Record<string, any>
): LogEntry => ({
    id: generateLogId(),
    type: LogType.COMBAT,
    message,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.INFO,
    i18nKey,
    i18nParams
});

// ============================================================================
// NARRATIVE LOGS
// ============================================================================

/**
 * Create a narrative flavor text log
 */
export const createNarrativeLog = (
    message: string,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.NARRATIVE,
    message,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.INFO
});

// ============================================================================
// CLANDESTINE OPERATION LOGS
// ============================================================================

/**
 * Create a clandestine sabotage warning log (25% chance when Undermine Authorities active)
 * Visible only to territory owner, clickable to open governor menu
 */
export const createClandestineSabotageWarningLog = (
    locationId: string,
    locationFaction: FactionId,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.LEADER,
    message: `Sabotage warning in ${locationId}…`,
    turn,
    visibleToFactions: [locationFaction],
    baseSeverity: LogSeverity.WARNING,
    warningForFactions: [locationFaction],
    highlightTarget: { type: 'LOCATION', id: locationId },
    i18nKey: 'clandestineSabotageWarning',
    i18nParams: { location: locationId }
});

/**
 * Create leader departure spotted log (Hunt Networks detection)
 * Visible only to Hunt Networks region controller as GOOD news
 * Format: "[LeaderName] from the [FactionName] has been spotted leaving [RegionName] for [DestinationName]."
 */
export const createLeaderDepartureSpottedLog = (
    leaderId: string,
    leaderFaction: FactionId,
    sourceLocationId: string,
    destinationId: string,
    turn: number,
    visibleToFaction: FactionId
): LogEntry => ({
    id: generateLogId(),
    type: LogType.LEADER,
    message: `${leaderId} spotted leaving ${sourceLocationId}.`,
    turn,
    visibleToFactions: [visibleToFaction],
    baseSeverity: LogSeverity.GOOD,
    highlightTarget: { type: 'LOCATION', id: sourceLocationId },
    i18nKey: 'leaderDepartureSpotted',
    i18nParams: { leader: leaderId, faction: leaderFaction, source: sourceLocationId, destination: destinationId }
});

/**
 * Create a neutral insurrection warning log
 */
export const createNeutralInsurrectionWarningLog = (
    locationId: string,
    locationFaction: FactionId,
    estimatedCount: number,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.INSURRECTION,
    message: `Neutral insurrection warning in ${locationId}! Est: ${estimatedCount}`,
    turn,
    visibleToFactions: [locationFaction],
    baseSeverity: LogSeverity.CRITICAL,
    criticalForFactions: [locationFaction],
    highlightTarget: { type: 'LOCATION', id: locationId },
    i18nKey: 'neutralInsurrectionWarning',
    i18nParams: { location: locationId, count: estimatedCount }
});
