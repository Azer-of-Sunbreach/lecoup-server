"use strict";
/**
 * Log Factory - Helper functions for creating structured log entries
 * Centralizes log creation logic with proper metadata for personalization and highlighting
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNeutralInsurrectionWarningLog = exports.createLeaderDepartureSpottedLog = exports.createClandestineSabotageWarningLog = exports.createNarrativeLog = exports.createCombatLog = exports.createEmbargoLog = exports.createAISeizeGoldLog = exports.createAISeizeFoodLog = exports.createLeaderCommandLog = exports.createInfiltrationEliminatedLog = exports.createInfiltrationDetectedLog = exports.createInfiltrationSuccessLog = exports.createLeaderDiedLog = exports.createGrainTradeConquestLog = exports.createGrainTradeRestoredLog = exports.createLowFoodWarningLog = exports.createFamineLog = exports.createNegotiationAttemptLog = exports.createNegotiationsFailedLog = exports.createNegotiationsSuccessLog = exports.createInsurrectionCancelledLog = exports.createSpontaneousUprisingLog = exports.createUprisingLog = exports.createInsurrectionPreparationLog = exports.createNavalConvoyDispatchedLog = exports.createConvoyDispatchedLog = exports.createNavalConvoyArrivalLog = exports.createConvoyArrivalLog = exports.createCaptureUncontestedLog = exports.createLocationSecuredLog = exports.createForcesApproachingLog = exports.createFactionChosenLog = exports.createGameStartLog = exports.createTurnMarkerLog = exports.createGenericLog = void 0;
const types_1 = require("../../types");
let logIdCounter = 0;
/** Generate unique log ID */
const generateLogId = () => {
    logIdCounter++;
    return `log_${Date.now()}_${logIdCounter}`;
};
/**
 * Create a simple generic log from a string message.
 * Use for basic logging where no specific type/visibility is needed.
 */
const createGenericLog = (message, turn = 1) => ({
    id: generateLogId(),
    type: types_1.LogType.NARRATIVE,
    message,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.INFO
});
exports.createGenericLog = createGenericLog;
/** Get all player factions (excludes NEUTRAL) */
const ALL_PLAYER_FACTIONS = [
    types_1.FactionId.REPUBLICANS,
    types_1.FactionId.CONSPIRATORS,
    types_1.FactionId.NOBLES
];
// ============================================================================
// CORE LOG CREATORS
// ============================================================================
/**
 * Create a turn marker log (visible to all)
 */
const createTurnMarkerLog = (turn) => ({
    id: generateLogId(),
    type: types_1.LogType.TURN_MARKER,
    message: `--- Turn ${turn} ---`,
    turn,
    visibleToFactions: [], // Empty = visible to all
    baseSeverity: types_1.LogSeverity.INFO,
    i18nKey: 'turnMarker',
    i18nParams: { turn }
});
exports.createTurnMarkerLog = createTurnMarkerLog;
/**
 * Create a game start log (visible to all)
 */
const createGameStartLog = (message, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.GAME_START,
    message,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.INFO,
    i18nKey: 'gameStart'
});
exports.createGameStartLog = createGameStartLog;
/**
 * Create a faction chosen log (visible to player)
 */
const createFactionChosenLog = (faction, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.GAME_START,
    message: `You have chosen the ${faction}.`,
    turn,
    visibleToFactions: [faction],
    baseSeverity: types_1.LogSeverity.INFO,
    i18nKey: 'factionChosen',
    i18nParams: { faction }
});
exports.createFactionChosenLog = createFactionChosenLog;
// ============================================================================
// MOVEMENT LOGS
// ============================================================================
/**
 * Create a "Forces marching" warning log (visible only to destination owner if enemy)
 * Returns null if not visible to any player faction (e.g., same faction moving)
 */
const createForcesApproachingLog = (destinationId, destinationFaction, movingFaction, armyId, turn) => {
    // Not visible if same faction or destination is NEUTRAL
    if (destinationFaction === movingFaction || destinationFaction === types_1.FactionId.NEUTRAL) {
        return null;
    }
    return {
        id: generateLogId(),
        type: types_1.LogType.MOVEMENT,
        message: `Forces marching to ${destinationId}.`,
        turn,
        visibleToFactions: [destinationFaction],
        baseSeverity: types_1.LogSeverity.WARNING,
        highlightTarget: { type: 'ARMY', id: armyId },
        i18nKey: 'forcesMarching',
        i18nParams: { destination: destinationId }
    };
};
exports.createForcesApproachingLog = createForcesApproachingLog;
/**
 * Create a "Location secured" log
 * CRITICAL if player lost the location, INFO otherwise
 */
const createLocationSecuredLog = (locationId, previousFaction, newFaction, turn) => {
    return {
        id: generateLogId(),
        type: types_1.LogType.CAPTURE,
        message: `${locationId} secured by ${newFaction}.`,
        turn,
        visibleToFactions: [], // All see it
        baseSeverity: types_1.LogSeverity.INFO,
        criticalForFactions: previousFaction !== types_1.FactionId.NEUTRAL ? [previousFaction] : undefined,
        highlightTarget: { type: 'LOCATION', id: locationId },
        i18nKey: 'locationSecured',
        i18nParams: { location: locationId, faction: newFaction }
    };
};
exports.createLocationSecuredLog = createLocationSecuredLog;
/**
 * Create a "Location captured (uncontested)" log
 */
const createCaptureUncontestedLog = (locationId, previousFaction, newFaction, turn) => {
    return {
        id: generateLogId(),
        type: types_1.LogType.CAPTURE,
        message: `${locationId} captured by ${newFaction} (Uncontested).`,
        turn,
        visibleToFactions: [],
        baseSeverity: types_1.LogSeverity.INFO,
        criticalForFactions: previousFaction !== types_1.FactionId.NEUTRAL ? [previousFaction] : undefined,
        highlightTarget: { type: 'LOCATION', id: locationId },
        i18nKey: 'locationCapturedUncontested',
        i18nParams: { location: locationId, faction: newFaction }
    };
};
exports.createCaptureUncontestedLog = createCaptureUncontestedLog;
// ============================================================================
// CONVOY LOGS
// ============================================================================
/**
 * Create a convoy arrival log
 */
const createConvoyArrivalLog = (cityId, amount, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.CONVOY,
    message: `Convoy arrived at ${cityId} with ${amount} food.`,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.INFO,
    highlightTarget: { type: 'LOCATION', id: cityId },
    i18nKey: 'convoyArrived',
    i18nParams: { city: cityId, amount }
});
exports.createConvoyArrivalLog = createConvoyArrivalLog;
/**
 * Create a naval convoy arrival log
 */
const createNavalConvoyArrivalLog = (cityId, amount, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.CONVOY,
    message: `Naval convoy arrived at ${cityId} with ${amount} food.`,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.INFO,
    highlightTarget: { type: 'LOCATION', id: cityId },
    i18nKey: 'navalConvoyArrived',
    i18nParams: { city: cityId, amount }
});
exports.createNavalConvoyArrivalLog = createNavalConvoyArrivalLog;
/**
 * Create a convoy dispatched log
 */
const createConvoyDispatchedLog = (turn) => ({
    id: generateLogId(),
    type: types_1.LogType.CONVOY,
    message: `Convoy dispatched (FALLBACK).`,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.INFO,
    i18nKey: 'convoyDispatched',
    i18nParams: {}
});
exports.createConvoyDispatchedLog = createConvoyDispatchedLog;
/**
 * Create a naval convoy dispatched log
 */
const createNavalConvoyDispatchedLog = (turn) => ({
    id: generateLogId(),
    type: types_1.LogType.CONVOY,
    message: `Naval convoy dispatched (FALLBACK).`,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.INFO,
    i18nKey: 'navalConvoyDispatched',
    i18nParams: {}
});
exports.createNavalConvoyDispatchedLog = createNavalConvoyDispatchedLog;
// ============================================================================
// INSURRECTION LOGS
// ============================================================================
/**
 * Create an insurrection preparation log
 */
const createInsurrectionPreparationLog = (leaderId, locationId, locationFaction, estimatedCount, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.INSURRECTION,
    message: `${leaderId} is preparing an insurrection in ${locationId}. Est: ${estimatedCount}`,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.INFO,
    criticalForFactions: locationFaction !== types_1.FactionId.NEUTRAL ? [locationFaction] : undefined,
    highlightTarget: { type: 'LOCATION', id: locationId },
    i18nKey: 'insurrectionPreparing',
    i18nParams: { leader: leaderId, location: locationId, count: estimatedCount }
});
exports.createInsurrectionPreparationLog = createInsurrectionPreparationLog;
/**
 * Create an uprising log
 */
const createUprisingLog = (leaderId, locationId, locationFaction, rebelCount, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.INSURRECTION,
    message: `Uprising in ${locationId}! ${leaderId} leads ${rebelCount} rebels.`,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.INFO,
    criticalForFactions: locationFaction !== types_1.FactionId.NEUTRAL ? [locationFaction] : undefined,
    highlightTarget: { type: 'LOCATION', id: locationId },
    i18nKey: 'uprising',
    i18nParams: { leader: leaderId, location: locationId, count: rebelCount }
});
exports.createUprisingLog = createUprisingLog;
/**
 * Create a spontaneous uprising log
 */
const createSpontaneousUprisingLog = (locationId, locationFaction, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.INSURRECTION,
    message: `Spontaneous uprising in ${locationId}! The people have taken up arms.`,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.INFO,
    criticalForFactions: locationFaction !== types_1.FactionId.NEUTRAL ? [locationFaction] : undefined,
    highlightTarget: { type: 'LOCATION', id: locationId },
    i18nKey: 'spontaneousUprising',
    i18nParams: { location: locationId }
});
exports.createSpontaneousUprisingLog = createSpontaneousUprisingLog;
/**
 * Create an insurrection cancelled log (visible only to territory owner)
 */
const createInsurrectionCancelledLog = (locationId, ownerFaction, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.INSURRECTION,
    message: `Insurrection cancelled at ${locationId}. Gold refunded.`,
    turn,
    visibleToFactions: [ownerFaction],
    baseSeverity: types_1.LogSeverity.INFO,
    i18nKey: 'insurrectionCancelled',
    i18nParams: { location: locationId }
});
exports.createInsurrectionCancelledLog = createInsurrectionCancelledLog;
// ============================================================================
// NEGOTIATION LOGS
// ============================================================================
/**
 * Create a negotiations successful log
 */
const createNegotiationsSuccessLog = (locationId, winnerFaction, turn) => {
    // WARNING for enemies, INFO for winner
    const warningFactions = ALL_PLAYER_FACTIONS.filter(f => f !== winnerFaction);
    return {
        id: generateLogId(),
        type: types_1.LogType.NEGOTIATION,
        message: `Negotiations successful! ${locationId} has joined ${winnerFaction}.`,
        turn,
        visibleToFactions: [],
        baseSeverity: types_1.LogSeverity.INFO,
        warningForFactions: warningFactions,
        highlightTarget: { type: 'LOCATION', id: locationId },
        i18nKey: 'negotiationSuccess',
        i18nParams: { location: locationId, faction: winnerFaction }
    };
};
exports.createNegotiationsSuccessLog = createNegotiationsSuccessLog;
/**
 * Create a negotiations failed log (visible only to initiator)
 */
const createNegotiationsFailedLog = (locationId, initiatorFaction, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.NEGOTIATION,
    message: `Negotiations failed with ${locationId}.`,
    turn,
    visibleToFactions: [initiatorFaction],
    baseSeverity: types_1.LogSeverity.INFO,
    i18nKey: 'negotiationFailed',
    i18nParams: { location: locationId }
});
exports.createNegotiationsFailedLog = createNegotiationsFailedLog;
/**
 * Create a negotiation attempt log (visible to OTHER players as WARNING)
 * Used in multiplayer to notify other human players when someone initiates a negotiation
 */
const createNegotiationAttemptLog = (locationId, initiatorFaction, turn) => {
    // Visible to all OTHER player factions as WARNING
    const otherFactions = ALL_PLAYER_FACTIONS.filter(f => f !== initiatorFaction);
    return {
        id: generateLogId(),
        type: types_1.LogType.NEGOTIATION,
        message: `${initiatorFaction} has sent a negotiator to ${locationId}.`,
        turn,
        visibleToFactions: otherFactions,
        baseSeverity: types_1.LogSeverity.WARNING,
        warningForFactions: otherFactions,
        highlightTarget: { type: 'LOCATION', id: locationId },
        i18nKey: 'negotiationAttempt',
        i18nParams: { faction: initiatorFaction, location: locationId }
    };
};
exports.createNegotiationAttemptLog = createNegotiationAttemptLog;
// ============================================================================
// FAMINE LOGS
// ============================================================================
/**
 * Create a famine log
 * CRITICAL for city owner, WARNING for others
 */
const createFamineLog = (cityId, cityFaction, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.FAMINE,
    message: `Famine in ${cityId}! Stability plummets while the death toll mounts!`,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.WARNING,
    criticalForFactions: cityFaction !== types_1.FactionId.NEUTRAL ? [cityFaction] : undefined,
    i18nKey: 'famine',
    i18nParams: { city: cityId }
});
exports.createFamineLog = createFamineLog;
/**
 * Create a low food stock warning log
 * Visible only to city owner when food drops below 50
 */
const createLowFoodWarningLog = (cityId, cityFaction, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.FAMINE,
    message: `Stability drops in ${cityId} as worries mount due to low food stocks.`,
    turn,
    visibleToFactions: cityFaction !== types_1.FactionId.NEUTRAL ? [cityFaction] : [],
    baseSeverity: types_1.LogSeverity.WARNING,
    highlightTarget: { type: 'LOCATION', id: cityId },
    i18nKey: 'lowFoodWarning',
    i18nParams: { city: cityId }
});
exports.createLowFoodWarningLog = createLowFoodWarningLog;
// ============================================================================
// COMMERCE LOGS
// ============================================================================
/**
 * Create a grain trade restored log
 */
const createGrainTradeRestoredLog = (turn) => ({
    id: generateLogId(),
    type: types_1.LogType.COMMERCE,
    message: 'The Grain Trade has been restored due to change in control.',
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.WARNING,
    i18nKey: 'grainTradeRestored'
});
exports.createGrainTradeRestoredLog = createGrainTradeRestoredLog;
/**
 * Create a grain trade restored by conquest log
 */
const createGrainTradeConquestLog = (turn) => ({
    id: generateLogId(),
    type: types_1.LogType.COMMERCE,
    message: 'Grain Trade restored by conquest.',
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.WARNING,
    i18nKey: 'grainTradeConquest'
});
exports.createGrainTradeConquestLog = createGrainTradeConquestLog;
// ============================================================================
// LEADER LOGS
// ============================================================================
/**
 * Create a leader died log
 */
const createLeaderDiedLog = (leaderId, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.LEADER,
    message: `${leaderId} died in battle.`,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.INFO,
    i18nKey: 'leaderDiedInBattle',
    i18nParams: { leader: leaderId }
});
exports.createLeaderDiedLog = createLeaderDiedLog;
/**
 * Create infiltration success log (green, good news)
 */
const createInfiltrationSuccessLog = (leaderId, locationId, turn, visibleToFaction) => ({
    id: generateLogId(),
    type: types_1.LogType.LEADER,
    message: `Agent ${leaderId} has infiltrated ${locationId} and is awaiting your orders.`,
    turn,
    visibleToFactions: [visibleToFaction],
    baseSeverity: types_1.LogSeverity.GOOD, // Green
    highlightTarget: { type: 'LOCATION', id: locationId }, // Clickable
    i18nKey: 'infiltrationSuccess',
    i18nParams: { leader: leaderId, location: locationId }
});
exports.createInfiltrationSuccessLog = createInfiltrationSuccessLog;
/**
 * Create infiltration detected log (warning)
 * Used when leader is spotted but NOT eliminated
 */
const createInfiltrationDetectedLog = (leaderId, leaderFaction, locationId, turn, visibleToFaction, isOwnerMsg, pronoun = 'his' // Key for game:pronouns.his
) => {
    return {
        id: generateLogId(),
        type: types_1.LogType.LEADER,
        message: `Infiltration detected.`,
        turn,
        visibleToFactions: [visibleToFaction],
        baseSeverity: types_1.LogSeverity.WARNING,
        highlightTarget: { type: 'LOCATION', id: locationId },
        i18nKey: isOwnerMsg ? 'infiltrationDetectedOwner' : 'infiltrationDetectedSender',
        i18nParams: isOwnerMsg
            ? { leader: leaderId, faction: leaderFaction, location: locationId }
            : { leader: leaderId, location: locationId, pronoun }
    };
};
exports.createInfiltrationDetectedLog = createInfiltrationDetectedLog;
/**
 * Create infiltration eliminated log (good news for defender)
 */
const createInfiltrationEliminatedLog = (leaderId, leaderFaction, locationId, turn, visibleToFaction, pronoun = 'he' // Key for game:pronouns.he
) => ({
    id: generateLogId(),
    type: types_1.LogType.LEADER,
    message: `Leader eliminated.`,
    turn,
    visibleToFactions: [visibleToFaction],
    baseSeverity: types_1.LogSeverity.WARNING,
    highlightTarget: { type: 'LOCATION', id: locationId },
    i18nKey: 'infiltrationEliminated',
    i18nParams: { leader: leaderId, faction: leaderFaction, location: locationId, pronoun }
});
exports.createInfiltrationEliminatedLog = createInfiltrationEliminatedLog;
/**
 * Create a leader took command log
 */
const createLeaderCommandLog = (leaderId, missionId, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.LEADER,
    message: `${leaderId} took command.`,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.INFO,
    i18nKey: 'leaderTookCommand',
    i18nParams: { leader: leaderId, missionId }
});
exports.createLeaderCommandLog = createLeaderCommandLog;
// ============================================================================
// ECONOMY LOGS
// ============================================================================
/**
 * Create an AI seize food log
 */
const createAISeizeFoodLog = (faction, ruralId, cityId, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.ECONOMY,
    message: `${faction} seizes food.`,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.INFO,
    i18nKey: 'aiSeizeFood',
    i18nParams: { faction, rural: ruralId, city: cityId }
});
exports.createAISeizeFoodLog = createAISeizeFoodLog;
/**
 * Create an AI seize gold log
 */
const createAISeizeGoldLog = (faction, cityId, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.ECONOMY,
    message: `${faction} seizes gold.`,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.INFO,
    i18nKey: 'aiSeizeGold',
    i18nParams: { faction, city: cityId }
});
exports.createAISeizeGoldLog = createAISeizeGoldLog;
/**
 * Create an embargo log
 */
const createEmbargoLog = (faction, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.ECONOMY,
    message: `Embargo logic.`,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.INFO,
    i18nKey: 'embargo',
    i18nParams: { faction }
});
exports.createEmbargoLog = createEmbargoLog;
// ============================================================================
// COMBAT LOGS
// ============================================================================
/**
 * Create a combat log
 */
const createCombatLog = (message, turn, i18nKey, i18nParams) => ({
    id: generateLogId(),
    type: types_1.LogType.COMBAT,
    message,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.INFO,
    i18nKey,
    i18nParams
});
exports.createCombatLog = createCombatLog;
// ============================================================================
// NARRATIVE LOGS
// ============================================================================
/**
 * Create a narrative flavor text log
 */
const createNarrativeLog = (message, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.NARRATIVE,
    message,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.INFO
});
exports.createNarrativeLog = createNarrativeLog;
// ============================================================================
// CLANDESTINE OPERATION LOGS
// ============================================================================
/**
 * Create a clandestine sabotage warning log (25% chance when Undermine Authorities active)
 * Visible only to territory owner, clickable to open governor menu
 */
const createClandestineSabotageWarningLog = (locationId, locationFaction, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.LEADER,
    message: `Sabotage warning in ${locationId}…`,
    turn,
    visibleToFactions: [locationFaction],
    baseSeverity: types_1.LogSeverity.WARNING,
    warningForFactions: [locationFaction],
    highlightTarget: { type: 'LOCATION', id: locationId },
    i18nKey: 'clandestineSabotageWarning',
    i18nParams: { location: locationId }
});
exports.createClandestineSabotageWarningLog = createClandestineSabotageWarningLog;
/**
 * Create leader departure spotted log (Hunt Networks detection)
 * Visible only to Hunt Networks region controller as GOOD news
 * Format: "[LeaderName] from the [FactionName] has been spotted leaving [RegionName] for [DestinationName]."
 */
const createLeaderDepartureSpottedLog = (leaderId, leaderFaction, sourceLocationId, destinationId, turn, visibleToFaction) => ({
    id: generateLogId(),
    type: types_1.LogType.LEADER,
    message: `${leaderId} spotted leaving ${sourceLocationId}.`,
    turn,
    visibleToFactions: [visibleToFaction],
    baseSeverity: types_1.LogSeverity.GOOD,
    highlightTarget: { type: 'LOCATION', id: sourceLocationId },
    i18nKey: 'leaderDepartureSpotted',
    i18nParams: { leader: leaderId, faction: leaderFaction, source: sourceLocationId, destination: destinationId }
});
exports.createLeaderDepartureSpottedLog = createLeaderDepartureSpottedLog;
/**
 * Create a neutral insurrection warning log
 */
const createNeutralInsurrectionWarningLog = (locationId, locationFaction, estimatedCount, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.INSURRECTION,
    message: `Neutral insurrection warning in ${locationId}! Est: ${estimatedCount}`,
    turn,
    visibleToFactions: [locationFaction],
    baseSeverity: types_1.LogSeverity.CRITICAL,
    criticalForFactions: [locationFaction],
    highlightTarget: { type: 'LOCATION', id: locationId },
    i18nKey: 'neutralInsurrectionWarning',
    i18nParams: { location: locationId, count: estimatedCount }
});
exports.createNeutralInsurrectionWarningLog = createNeutralInsurrectionWarningLog;
