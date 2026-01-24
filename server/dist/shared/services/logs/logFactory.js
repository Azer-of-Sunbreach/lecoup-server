"use strict";
/**
 * Log Factory - Helper functions for creating structured log entries
 * Centralizes log creation logic with proper metadata for personalization and highlighting
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLeaderDepartureSpottedLog = exports.createClandestineSabotageWarningLog = exports.createNarrativeLog = exports.createCombatLog = exports.createEmbargoLog = exports.createAISeizeGoldLog = exports.createAISeizeFoodLog = exports.createLeaderCommandLog = exports.createInfiltrationRiskDebugLog = exports.createInfiltrationEliminatedLog = exports.createInfiltrationDetectedLog = exports.createInfiltrationSuccessLog = exports.createLeaderDiedLog = exports.createGrainTradeConquestLog = exports.createGrainTradeRestoredLog = exports.createLowFoodWarningLog = exports.createFamineLog = exports.createNegotiationAttemptLog = exports.createNegotiationsFailedLog = exports.createNegotiationsSuccessLog = exports.createInsurrectionCancelledLog = exports.createSpontaneousUprisingLog = exports.createUprisingLog = exports.createInsurrectionPreparationLog = exports.createNavalConvoyArrivalLog = exports.createConvoyArrivalLog = exports.createCaptureUncontestedLog = exports.createLocationSecuredLog = exports.createForcesApproachingLog = exports.createGameStartLog = exports.createTurnMarkerLog = exports.createGenericLog = void 0;
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
    baseSeverity: types_1.LogSeverity.INFO
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
    baseSeverity: types_1.LogSeverity.INFO
});
exports.createGameStartLog = createGameStartLog;
// ============================================================================
// MOVEMENT LOGS
// ============================================================================
/**
 * Create a "Forces marching" warning log (visible only to destination owner if enemy)
 * Returns null if not visible to any player faction (e.g., same faction moving)
 */
const createForcesApproachingLog = (destinationName, destinationFaction, movingFaction, armyId, turn) => {
    // Not visible if same faction or destination is NEUTRAL
    if (destinationFaction === movingFaction || destinationFaction === types_1.FactionId.NEUTRAL) {
        return null;
    }
    return {
        id: generateLogId(),
        type: types_1.LogType.MOVEMENT,
        message: `Forces marching to ${destinationName}.`,
        turn,
        visibleToFactions: [destinationFaction],
        baseSeverity: types_1.LogSeverity.WARNING,
        highlightTarget: { type: 'ARMY', id: armyId }
    };
};
exports.createForcesApproachingLog = createForcesApproachingLog;
/**
 * Create a "Location secured" log
 * CRITICAL if player lost the location, INFO otherwise
 */
const createLocationSecuredLog = (locationName, locationId, previousFaction, newFaction, turn) => {
    const FACTION_NAMES = {
        [types_1.FactionId.REPUBLICANS]: 'Republicans',
        [types_1.FactionId.CONSPIRATORS]: 'Conspirators',
        [types_1.FactionId.NOBLES]: "Nobles' rights faction",
        [types_1.FactionId.NEUTRAL]: 'Neutral'
    };
    return {
        id: generateLogId(),
        type: types_1.LogType.CAPTURE,
        message: `${locationName} secured by ${FACTION_NAMES[newFaction]}.`,
        turn,
        visibleToFactions: [], // All see it
        baseSeverity: types_1.LogSeverity.INFO,
        criticalForFactions: previousFaction !== types_1.FactionId.NEUTRAL ? [previousFaction] : undefined,
        highlightTarget: { type: 'LOCATION', id: locationId }
    };
};
exports.createLocationSecuredLog = createLocationSecuredLog;
/**
 * Create a "Location captured (uncontested)" log
 */
const createCaptureUncontestedLog = (locationName, locationId, previousFaction, newFaction, turn) => {
    const FACTION_NAMES = {
        [types_1.FactionId.REPUBLICANS]: 'Republicans',
        [types_1.FactionId.CONSPIRATORS]: 'Conspirators',
        [types_1.FactionId.NOBLES]: "Nobles' rights faction",
        [types_1.FactionId.NEUTRAL]: 'Neutral'
    };
    return {
        id: generateLogId(),
        type: types_1.LogType.CAPTURE,
        message: `${locationName} captured by ${FACTION_NAMES[newFaction]} (Uncontested).`,
        turn,
        visibleToFactions: [],
        baseSeverity: types_1.LogSeverity.INFO,
        criticalForFactions: previousFaction !== types_1.FactionId.NEUTRAL ? [previousFaction] : undefined,
        highlightTarget: { type: 'LOCATION', id: locationId }
    };
};
exports.createCaptureUncontestedLog = createCaptureUncontestedLog;
// ============================================================================
// CONVOY LOGS
// ============================================================================
/**
 * Create a convoy arrival log
 */
const createConvoyArrivalLog = (cityName, foodAmount, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.CONVOY,
    message: `Convoy arrived at ${cityName} with ${foodAmount} food.`,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.INFO
});
exports.createConvoyArrivalLog = createConvoyArrivalLog;
/**
 * Create a naval convoy arrival log
 */
const createNavalConvoyArrivalLog = (cityName, foodAmount, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.CONVOY,
    message: `Naval convoy arrived at ${cityName} with ${foodAmount} food.`,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.INFO
});
exports.createNavalConvoyArrivalLog = createNavalConvoyArrivalLog;
// ============================================================================
// INSURRECTION LOGS
// ============================================================================
/**
 * Create an insurrection preparation log
 */
const createInsurrectionPreparationLog = (leaderName, locationName, locationId, locationFaction, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.INSURRECTION,
    message: `${leaderName} is preparing an insurrection in ${locationName}.`,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.INFO,
    criticalForFactions: locationFaction !== types_1.FactionId.NEUTRAL ? [locationFaction] : undefined,
    highlightTarget: { type: 'LOCATION', id: locationId }
});
exports.createInsurrectionPreparationLog = createInsurrectionPreparationLog;
/**
 * Create an uprising log
 */
const createUprisingLog = (leaderName, locationName, locationId, locationFaction, rebelCount, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.INSURRECTION,
    message: `Uprising in ${locationName}! ${leaderName} leads ${rebelCount} rebels.`,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.INFO,
    criticalForFactions: locationFaction !== types_1.FactionId.NEUTRAL ? [locationFaction] : undefined,
    highlightTarget: { type: 'LOCATION', id: locationId }
});
exports.createUprisingLog = createUprisingLog;
/**
 * Create a spontaneous uprising log
 */
const createSpontaneousUprisingLog = (locationName, locationId, locationFaction, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.INSURRECTION,
    message: `Spontaneous uprising in ${locationName}! The people have taken up arms.`,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.INFO,
    criticalForFactions: locationFaction !== types_1.FactionId.NEUTRAL ? [locationFaction] : undefined,
    highlightTarget: { type: 'LOCATION', id: locationId }
});
exports.createSpontaneousUprisingLog = createSpontaneousUprisingLog;
/**
 * Create an insurrection cancelled log (visible only to territory owner)
 */
const createInsurrectionCancelledLog = (locationName, ownerFaction, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.INSURRECTION,
    message: `Insurrection cancelled at ${locationName}. Gold refunded.`,
    turn,
    visibleToFactions: [ownerFaction],
    baseSeverity: types_1.LogSeverity.INFO
});
exports.createInsurrectionCancelledLog = createInsurrectionCancelledLog;
// ============================================================================
// NEGOTIATION LOGS
// ============================================================================
/**
 * Create a negotiations successful log
 */
const createNegotiationsSuccessLog = (locationName, locationId, winnerFaction, turn) => {
    const FACTION_NAMES = {
        [types_1.FactionId.REPUBLICANS]: 'Republicans',
        [types_1.FactionId.CONSPIRATORS]: 'Conspirators',
        [types_1.FactionId.NOBLES]: "Nobles' rights faction",
        [types_1.FactionId.NEUTRAL]: 'Neutral'
    };
    // WARNING for enemies, INFO for winner
    const warningFactions = ALL_PLAYER_FACTIONS.filter(f => f !== winnerFaction);
    return {
        id: generateLogId(),
        type: types_1.LogType.NEGOTIATION,
        message: `Negotiations successful! ${locationName} has joined ${FACTION_NAMES[winnerFaction]}.`,
        turn,
        visibleToFactions: [],
        baseSeverity: types_1.LogSeverity.INFO,
        warningForFactions: warningFactions,
        highlightTarget: { type: 'LOCATION', id: locationId }
    };
};
exports.createNegotiationsSuccessLog = createNegotiationsSuccessLog;
/**
 * Create a negotiations failed log (visible only to initiator)
 */
const createNegotiationsFailedLog = (locationName, initiatorFaction, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.NEGOTIATION,
    message: `Negotiations failed with ${locationName}.`,
    turn,
    visibleToFactions: [initiatorFaction],
    baseSeverity: types_1.LogSeverity.INFO
});
exports.createNegotiationsFailedLog = createNegotiationsFailedLog;
/**
 * Create a negotiation attempt log (visible to OTHER players as WARNING)
 * Used in multiplayer to notify other human players when someone initiates a negotiation
 */
const createNegotiationAttemptLog = (locationName, locationId, initiatorFaction, turn) => {
    const FACTION_NAMES = {
        [types_1.FactionId.REPUBLICANS]: 'Republicans',
        [types_1.FactionId.CONSPIRATORS]: 'Conspirators',
        [types_1.FactionId.NOBLES]: "Nobles' rights faction",
        [types_1.FactionId.NEUTRAL]: 'Neutral'
    };
    // Visible to all OTHER player factions as WARNING
    const otherFactions = ALL_PLAYER_FACTIONS.filter(f => f !== initiatorFaction);
    return {
        id: generateLogId(),
        type: types_1.LogType.NEGOTIATION,
        message: `${FACTION_NAMES[initiatorFaction]} has sent a negotiator to ${locationName}.`,
        turn,
        visibleToFactions: otherFactions,
        baseSeverity: types_1.LogSeverity.WARNING,
        warningForFactions: otherFactions,
        highlightTarget: { type: 'LOCATION', id: locationId }
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
const createFamineLog = (cityName, cityFaction, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.FAMINE,
    message: `Famine in ${cityName}! Stability plummets while the death toll mounts!`,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.WARNING,
    criticalForFactions: cityFaction !== types_1.FactionId.NEUTRAL ? [cityFaction] : undefined
});
exports.createFamineLog = createFamineLog;
/**
 * Create a low food stock warning log
 * Visible only to city owner when food drops below 50
 */
const createLowFoodWarningLog = (cityName, cityId, cityFaction, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.FAMINE,
    message: `Stability drops in ${cityName} as worries mount due to low food stocks.`,
    turn,
    visibleToFactions: cityFaction !== types_1.FactionId.NEUTRAL ? [cityFaction] : [],
    baseSeverity: types_1.LogSeverity.WARNING,
    highlightTarget: { type: 'LOCATION', id: cityId }
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
    baseSeverity: types_1.LogSeverity.WARNING
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
    baseSeverity: types_1.LogSeverity.WARNING
});
exports.createGrainTradeConquestLog = createGrainTradeConquestLog;
// ============================================================================
// LEADER LOGS
// ============================================================================
/**
 * Create a leader died log
 */
const createLeaderDiedLog = (leaderName, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.LEADER,
    message: `${leaderName} died in battle.`,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.INFO
});
exports.createLeaderDiedLog = createLeaderDiedLog;
/**
 * Create infiltration success log (green, good news)
 */
const createInfiltrationSuccessLog = (leaderName, locationName, locationId, turn, visibleToFaction) => ({
    id: generateLogId(),
    type: types_1.LogType.LEADER,
    message: `Agent ${leaderName} has infiltrated ${locationName} and is awaiting your orders.`,
    turn,
    visibleToFactions: [visibleToFaction],
    baseSeverity: types_1.LogSeverity.GOOD, // Green
    highlightTarget: { type: 'LOCATION', id: locationId } // Clickable
});
exports.createInfiltrationSuccessLog = createInfiltrationSuccessLog;
/**
 * Create infiltration detected log (warning)
 * Used when leader is spotted but NOT eliminated
 */
const createInfiltrationDetectedLog = (leaderName, leaderFactionName, locationName, locationId, turn, visibleToFaction, isOwnerMsg, pronoun = 'his') => {
    const message = isOwnerMsg
        ? `Leader ${leaderName} from the ${leaderFactionName} has been spotted infiltrating ${locationName}.`
        : `${leaderName} has infiltrated ${locationName} but has been spotted. The enemy is now aware of ${pronoun} presence.`;
    return {
        id: generateLogId(),
        type: types_1.LogType.LEADER,
        message,
        turn,
        visibleToFactions: [visibleToFaction],
        baseSeverity: types_1.LogSeverity.WARNING,
        highlightTarget: { type: 'LOCATION', id: locationId }
    };
};
exports.createInfiltrationDetectedLog = createInfiltrationDetectedLog;
/**
 * Create infiltration eliminated log (good news for defender)
 */
const createInfiltrationEliminatedLog = (leaderName, leaderFactionName, locationName, locationId, turn, visibleToFaction, pronoun = 'he') => ({
    id: generateLogId(),
    type: types_1.LogType.LEADER,
    message: `Good news! Leader ${leaderName} from the ${leaderFactionName} has been eliminated while ${pronoun} tried infiltrating ${locationName}.`,
    turn,
    visibleToFactions: [visibleToFaction],
    baseSeverity: types_1.LogSeverity.WARNING, // Still warning style for importance? Or GOOD? Spec says WARNING level event
    highlightTarget: { type: 'LOCATION', id: locationId }
});
exports.createInfiltrationEliminatedLog = createInfiltrationEliminatedLog;
/**
 * Create infiltration risk debug log
 */
const createInfiltrationRiskDebugLog = (leaderName, locationName, risk, // 0-1
turn, visibleToFaction) => ({
    id: generateLogId(),
    type: types_1.LogType.LEADER,
    message: `[RISK CHECK] ${leaderName} entering ${locationName}. Infiltration Risk: ${(risk * 100).toFixed(1)}%.`,
    turn,
    visibleToFactions: [visibleToFaction],
    baseSeverity: types_1.LogSeverity.INFO
});
exports.createInfiltrationRiskDebugLog = createInfiltrationRiskDebugLog;
/**
 * Create a leader took command log
 */
const createLeaderCommandLog = (leaderName, missionId, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.LEADER,
    message: `${leaderName} took command of an army for operation ${missionId}.`,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.INFO
});
exports.createLeaderCommandLog = createLeaderCommandLog;
// ============================================================================
// ECONOMY LOGS
// ============================================================================
/**
 * Create an AI seize food log
 */
const createAISeizeFoodLog = (factionName, ruralName, cityName, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.ECONOMY,
    message: `${factionName} seizes food from ${ruralName} to feed ${cityName}.`,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.INFO
});
exports.createAISeizeFoodLog = createAISeizeFoodLog;
/**
 * Create an AI seize gold log
 */
const createAISeizeGoldLog = (factionName, cityName, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.ECONOMY,
    message: `${factionName} seizes gold from ${cityName}'s treasury.`,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.INFO
});
exports.createAISeizeGoldLog = createAISeizeGoldLog;
/**
 * Create an embargo log
 */
const createEmbargoLog = (message, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.ECONOMY,
    message,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.INFO
});
exports.createEmbargoLog = createEmbargoLog;
// ============================================================================
// COMBAT LOGS
// ============================================================================
/**
 * Create a combat log
 */
const createCombatLog = (message, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.COMBAT,
    message,
    turn,
    visibleToFactions: [],
    baseSeverity: types_1.LogSeverity.INFO
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
const createClandestineSabotageWarningLog = (locationName, locationId, locationFaction, turn) => ({
    id: generateLogId(),
    type: types_1.LogType.LEADER,
    message: `Something is stirring the people's mind against us in ${locationName}…`,
    turn,
    visibleToFactions: [locationFaction],
    baseSeverity: types_1.LogSeverity.WARNING,
    warningForFactions: [locationFaction],
    highlightTarget: { type: 'LOCATION', id: locationId }
});
exports.createClandestineSabotageWarningLog = createClandestineSabotageWarningLog;
/**
 * Create leader departure spotted log (Hunt Networks detection)
 * Visible only to Hunt Networks region controller as GOOD news
 * Format: "[LeaderName] from the [FactionName] has been spotted leaving [RegionName] for [DestinationName]."
 */
const createLeaderDepartureSpottedLog = (leaderName, leaderFactionName, sourceLocationName, sourceLocationId, destinationName, turn, visibleToFaction) => ({
    id: generateLogId(),
    type: types_1.LogType.LEADER,
    message: `${leaderName} from the ${leaderFactionName} has been spotted leaving ${sourceLocationName} for ${destinationName}.`,
    turn,
    visibleToFactions: [visibleToFaction],
    baseSeverity: types_1.LogSeverity.GOOD,
    highlightTarget: { type: 'LOCATION', id: sourceLocationId }
});
exports.createLeaderDepartureSpottedLog = createLeaderDepartureSpottedLog;
