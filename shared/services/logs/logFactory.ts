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
    baseSeverity: LogSeverity.INFO
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
    baseSeverity: LogSeverity.INFO
});

// ============================================================================
// MOVEMENT LOGS
// ============================================================================

/**
 * Create a "Forces marching" warning log (visible only to destination owner if enemy)
 * Returns null if not visible to any player faction (e.g., same faction moving)
 */
export const createForcesApproachingLog = (
    destinationName: string,
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
        message: `Forces marching to ${destinationName}.`,
        turn,
        visibleToFactions: [destinationFaction],
        baseSeverity: LogSeverity.WARNING,
        highlightTarget: { type: 'ARMY', id: armyId }
    };
};

/**
 * Create a "Location secured" log
 * CRITICAL if player lost the location, INFO otherwise
 */
export const createLocationSecuredLog = (
    locationName: string,
    locationId: string,
    previousFaction: FactionId,
    newFaction: FactionId,
    turn: number
): LogEntry => {
    const FACTION_NAMES: Record<FactionId, string> = {
        [FactionId.REPUBLICANS]: 'Republicans',
        [FactionId.CONSPIRATORS]: 'Conspirators',
        [FactionId.NOBLES]: "Nobles' rights faction",
        [FactionId.NEUTRAL]: 'Neutral'
    };

    return {
        id: generateLogId(),
        type: LogType.CAPTURE,
        message: `${locationName} secured by ${FACTION_NAMES[newFaction]}.`,
        turn,
        visibleToFactions: [],  // All see it
        baseSeverity: LogSeverity.INFO,
        criticalForFactions: previousFaction !== FactionId.NEUTRAL ? [previousFaction] : undefined,
        highlightTarget: { type: 'LOCATION', id: locationId }
    };
};

/**
 * Create a "Location captured (uncontested)" log
 */
export const createCaptureUncontestedLog = (
    locationName: string,
    locationId: string,
    previousFaction: FactionId,
    newFaction: FactionId,
    turn: number
): LogEntry => {
    const FACTION_NAMES: Record<FactionId, string> = {
        [FactionId.REPUBLICANS]: 'Republicans',
        [FactionId.CONSPIRATORS]: 'Conspirators',
        [FactionId.NOBLES]: "Nobles' rights faction",
        [FactionId.NEUTRAL]: 'Neutral'
    };

    return {
        id: generateLogId(),
        type: LogType.CAPTURE,
        message: `${locationName} captured by ${FACTION_NAMES[newFaction]} (Uncontested).`,
        turn,
        visibleToFactions: [],
        baseSeverity: LogSeverity.INFO,
        criticalForFactions: previousFaction !== FactionId.NEUTRAL ? [previousFaction] : undefined,
        highlightTarget: { type: 'LOCATION', id: locationId }
    };
};

// ============================================================================
// CONVOY LOGS
// ============================================================================

/**
 * Create a convoy arrival log
 */
export const createConvoyArrivalLog = (
    cityName: string,
    foodAmount: number,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.CONVOY,
    message: `Convoy arrived at ${cityName} with ${foodAmount} food.`,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.INFO
});

/**
 * Create a naval convoy arrival log
 */
export const createNavalConvoyArrivalLog = (
    cityName: string,
    foodAmount: number,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.CONVOY,
    message: `Naval convoy arrived at ${cityName} with ${foodAmount} food.`,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.INFO
});

// ============================================================================
// INSURRECTION LOGS
// ============================================================================

/**
 * Create an insurrection preparation log
 */
export const createInsurrectionPreparationLog = (
    leaderName: string,
    locationName: string,
    locationId: string,
    locationFaction: FactionId,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.INSURRECTION,
    message: `${leaderName} is preparing an insurrection in ${locationName}.`,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.INFO,
    criticalForFactions: locationFaction !== FactionId.NEUTRAL ? [locationFaction] : undefined,
    highlightTarget: { type: 'LOCATION', id: locationId }
});

/**
 * Create an uprising log
 */
export const createUprisingLog = (
    leaderName: string,
    locationName: string,
    locationId: string,
    locationFaction: FactionId,
    rebelCount: number,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.INSURRECTION,
    message: `Uprising in ${locationName}! ${leaderName} leads ${rebelCount} rebels.`,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.INFO,
    criticalForFactions: locationFaction !== FactionId.NEUTRAL ? [locationFaction] : undefined,
    highlightTarget: { type: 'LOCATION', id: locationId }
});

/**
 * Create a spontaneous uprising log
 */
export const createSpontaneousUprisingLog = (
    locationName: string,
    locationId: string,
    locationFaction: FactionId,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.INSURRECTION,
    message: `Spontaneous uprising in ${locationName}! The people have taken up arms.`,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.INFO,
    criticalForFactions: locationFaction !== FactionId.NEUTRAL ? [locationFaction] : undefined,
    highlightTarget: { type: 'LOCATION', id: locationId }
});

/**
 * Create an insurrection cancelled log (visible only to territory owner)
 */
export const createInsurrectionCancelledLog = (
    locationName: string,
    ownerFaction: FactionId,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.INSURRECTION,
    message: `Insurrection cancelled at ${locationName}. Gold refunded.`,
    turn,
    visibleToFactions: [ownerFaction],
    baseSeverity: LogSeverity.INFO
});

// ============================================================================
// NEGOTIATION LOGS
// ============================================================================

/**
 * Create a negotiations successful log
 */
export const createNegotiationsSuccessLog = (
    locationName: string,
    locationId: string,
    winnerFaction: FactionId,
    turn: number
): LogEntry => {
    const FACTION_NAMES: Record<FactionId, string> = {
        [FactionId.REPUBLICANS]: 'Republicans',
        [FactionId.CONSPIRATORS]: 'Conspirators',
        [FactionId.NOBLES]: "Nobles' rights faction",
        [FactionId.NEUTRAL]: 'Neutral'
    };

    // WARNING for enemies, INFO for winner
    const warningFactions = ALL_PLAYER_FACTIONS.filter(f => f !== winnerFaction);

    return {
        id: generateLogId(),
        type: LogType.NEGOTIATION,
        message: `Negotiations successful! ${locationName} has joined ${FACTION_NAMES[winnerFaction]}.`,
        turn,
        visibleToFactions: [],
        baseSeverity: LogSeverity.INFO,
        warningForFactions: warningFactions,
        highlightTarget: { type: 'LOCATION', id: locationId }
    };
};

/**
 * Create a negotiations failed log (visible only to initiator)
 */
export const createNegotiationsFailedLog = (
    locationName: string,
    initiatorFaction: FactionId,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.NEGOTIATION,
    message: `Negotiations failed with ${locationName}.`,
    turn,
    visibleToFactions: [initiatorFaction],
    baseSeverity: LogSeverity.INFO
});

// ============================================================================
// FAMINE LOGS
// ============================================================================

/**
 * Create a famine log
 * CRITICAL for city owner, WARNING for others
 */
export const createFamineLog = (
    cityName: string,
    cityFaction: FactionId,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.FAMINE,
    message: `Famine in ${cityName}! Stability plummets while the death toll mounts!`,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.WARNING,
    criticalForFactions: cityFaction !== FactionId.NEUTRAL ? [cityFaction] : undefined
});

/**
 * Create a low food stock warning log
 * Visible only to city owner when food drops below 50
 */
export const createLowFoodWarningLog = (
    cityName: string,
    cityId: string,
    cityFaction: FactionId,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.FAMINE,
    message: `Stability drops in ${cityName} as worries mount due to low food stocks.`,
    turn,
    visibleToFactions: cityFaction !== FactionId.NEUTRAL ? [cityFaction] : [],
    baseSeverity: LogSeverity.WARNING,
    highlightTarget: { type: 'LOCATION', id: cityId }
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
    baseSeverity: LogSeverity.WARNING
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
    baseSeverity: LogSeverity.WARNING
});

// ============================================================================
// LEADER LOGS
// ============================================================================

/**
 * Create a leader died log
 */
export const createLeaderDiedLog = (
    leaderName: string,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.LEADER,
    message: `${leaderName} died in battle.`,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.INFO
});

/**
 * Create infiltration success log (green, good news)
 */
export const createInfiltrationSuccessLog = (
    leaderName: string,
    locationName: string,
    locationId: string,
    turn: number,
    visibleToFaction: FactionId
): LogEntry => ({
    id: generateLogId(),
    type: LogType.LEADER,
    message: `Agent ${leaderName} has infiltrated ${locationName} and is awaiting your orders.`,
    turn,
    visibleToFactions: [visibleToFaction],
    baseSeverity: LogSeverity.GOOD, // Green
    highlightTarget: { type: 'LOCATION', id: locationId } // Clickable
});

/**
 * Create infiltration detected log (warning)
 * Used when leader is spotted but NOT eliminated
 */
export const createInfiltrationDetectedLog = (
    leaderName: string,
    leaderFactionName: string,
    locationName: string,
    locationId: string,
    turn: number,
    visibleToFaction: FactionId,
    isOwnerMsg: boolean,
    pronoun: string = 'his'
): LogEntry => {
    const message = isOwnerMsg
        ? `Leader ${leaderName} from the ${leaderFactionName} has been spotted infiltrating ${locationName}.`
        : `${leaderName} has infiltrated ${locationName} but has been spotted. The enemy is now aware of ${pronoun} presence.`;

    return {
        id: generateLogId(),
        type: LogType.LEADER,
        message,
        turn,
        visibleToFactions: [visibleToFaction],
        baseSeverity: LogSeverity.WARNING,
        highlightTarget: { type: 'LOCATION', id: locationId }
    };
};

/**
 * Create infiltration eliminated log (good news for defender)
 */
export const createInfiltrationEliminatedLog = (
    leaderName: string,
    leaderFactionName: string,
    locationName: string,
    locationId: string,
    turn: number,
    visibleToFaction: FactionId,
    pronoun: string = 'he'
): LogEntry => ({
    id: generateLogId(),
    type: LogType.LEADER,
    message: `Good news! Leader ${leaderName} from the ${leaderFactionName} has been eliminated while ${pronoun} tried infiltrating ${locationName}.`,
    turn,
    visibleToFactions: [visibleToFaction],
    baseSeverity: LogSeverity.WARNING, // Still warning style for importance? Or GOOD? Spec says WARNING level event
    highlightTarget: { type: 'LOCATION', id: locationId }
});

/**
 * Create infiltration risk debug log
 */
export const createInfiltrationRiskDebugLog = (
    leaderName: string,
    locationName: string,
    risk: number, // 0-1
    turn: number,
    visibleToFaction: FactionId
): LogEntry => ({
    id: generateLogId(),
    type: LogType.LEADER,
    message: `[RISK CHECK] ${leaderName} entering ${locationName}. Infiltration Risk: ${(risk * 100).toFixed(1)}%.`,
    turn,
    visibleToFactions: [visibleToFaction],
    baseSeverity: LogSeverity.INFO
});

/**
 * Create a leader took command log
 */
export const createLeaderCommandLog = (
    leaderName: string,
    missionId: string,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.LEADER,
    message: `${leaderName} took command of an army for operation ${missionId}.`,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.INFO
});

// ============================================================================
// ECONOMY LOGS
// ============================================================================

/**
 * Create an AI seize food log
 */
export const createAISeizeFoodLog = (
    factionName: string,
    ruralName: string,
    cityName: string,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.ECONOMY,
    message: `${factionName} seizes food from ${ruralName} to feed ${cityName}.`,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.INFO
});

/**
 * Create an AI seize gold log
 */
export const createAISeizeGoldLog = (
    factionName: string,
    cityName: string,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.ECONOMY,
    message: `${factionName} seizes gold from ${cityName}'s treasury.`,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.INFO
});

/**
 * Create an embargo log
 */
export const createEmbargoLog = (
    message: string,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.ECONOMY,
    message,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.INFO
});

// ============================================================================
// COMBAT LOGS
// ============================================================================

/**
 * Create a combat log
 */
export const createCombatLog = (
    message: string,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.COMBAT,
    message,
    turn,
    visibleToFactions: [],
    baseSeverity: LogSeverity.INFO
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
    locationName: string,
    locationId: string,
    locationFaction: FactionId,
    turn: number
): LogEntry => ({
    id: generateLogId(),
    type: LogType.LEADER,
    message: `Something is stirring the people's mind against us in ${locationName}…`,
    turn,
    visibleToFactions: [locationFaction],
    baseSeverity: LogSeverity.WARNING,
    warningForFactions: [locationFaction],
    highlightTarget: { type: 'LOCATION', id: locationId }
});

/**
 * Create leader departure spotted log (Hunt Networks detection)
 * Visible only to Hunt Networks region controller as GOOD news
 * Format: "[LeaderName] from the [FactionName] has been spotted leaving [RegionName] for [DestinationName]."
 */
export const createLeaderDepartureSpottedLog = (
    leaderName: string,
    leaderFactionName: string,
    sourceLocationName: string,
    sourceLocationId: string,
    destinationName: string,
    turn: number,
    visibleToFaction: FactionId
): LogEntry => ({
    id: generateLogId(),
    type: LogType.LEADER,
    message: `${leaderName} from the ${leaderFactionName} has been spotted leaving ${sourceLocationName} for ${destinationName}.`,
    turn,
    visibleToFactions: [visibleToFaction],
    baseSeverity: LogSeverity.GOOD,
    highlightTarget: { type: 'LOCATION', id: sourceLocationId }
});
