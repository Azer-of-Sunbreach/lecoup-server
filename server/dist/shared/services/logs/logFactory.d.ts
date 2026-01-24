/**
 * Log Factory - Helper functions for creating structured log entries
 * Centralizes log creation logic with proper metadata for personalization and highlighting
 */
import { FactionId, LogEntry } from '../../types';
/**
 * Create a simple generic log from a string message.
 * Use for basic logging where no specific type/visibility is needed.
 */
export declare const createGenericLog: (message: string, turn?: number) => LogEntry;
/**
 * Create a turn marker log (visible to all)
 */
export declare const createTurnMarkerLog: (turn: number) => LogEntry;
/**
 * Create a game start log (visible to all)
 */
export declare const createGameStartLog: (message: string, turn: number) => LogEntry;
/**
 * Create a "Forces marching" warning log (visible only to destination owner if enemy)
 * Returns null if not visible to any player faction (e.g., same faction moving)
 */
export declare const createForcesApproachingLog: (destinationName: string, destinationFaction: FactionId, movingFaction: FactionId, armyId: string, turn: number) => LogEntry | null;
/**
 * Create a "Location secured" log
 * CRITICAL if player lost the location, INFO otherwise
 */
export declare const createLocationSecuredLog: (locationName: string, locationId: string, previousFaction: FactionId, newFaction: FactionId, turn: number) => LogEntry;
/**
 * Create a "Location captured (uncontested)" log
 */
export declare const createCaptureUncontestedLog: (locationName: string, locationId: string, previousFaction: FactionId, newFaction: FactionId, turn: number) => LogEntry;
/**
 * Create a convoy arrival log
 */
export declare const createConvoyArrivalLog: (cityName: string, foodAmount: number, turn: number) => LogEntry;
/**
 * Create a naval convoy arrival log
 */
export declare const createNavalConvoyArrivalLog: (cityName: string, foodAmount: number, turn: number) => LogEntry;
/**
 * Create an insurrection preparation log
 */
export declare const createInsurrectionPreparationLog: (leaderName: string, locationName: string, locationId: string, locationFaction: FactionId, turn: number) => LogEntry;
/**
 * Create an uprising log
 */
export declare const createUprisingLog: (leaderName: string, locationName: string, locationId: string, locationFaction: FactionId, rebelCount: number, turn: number) => LogEntry;
/**
 * Create a spontaneous uprising log
 */
export declare const createSpontaneousUprisingLog: (locationName: string, locationId: string, locationFaction: FactionId, turn: number) => LogEntry;
/**
 * Create an insurrection cancelled log (visible only to territory owner)
 */
export declare const createInsurrectionCancelledLog: (locationName: string, ownerFaction: FactionId, turn: number) => LogEntry;
/**
 * Create a negotiations successful log
 */
export declare const createNegotiationsSuccessLog: (locationName: string, locationId: string, winnerFaction: FactionId, turn: number) => LogEntry;
/**
 * Create a negotiations failed log (visible only to initiator)
 */
export declare const createNegotiationsFailedLog: (locationName: string, initiatorFaction: FactionId, turn: number) => LogEntry;
/**
 * Create a negotiation attempt log (visible to OTHER players as WARNING)
 * Used in multiplayer to notify other human players when someone initiates a negotiation
 */
export declare const createNegotiationAttemptLog: (locationName: string, locationId: string, initiatorFaction: FactionId, turn: number) => LogEntry;
/**
 * Create a famine log
 * CRITICAL for city owner, WARNING for others
 */
export declare const createFamineLog: (cityName: string, cityFaction: FactionId, turn: number) => LogEntry;
/**
 * Create a low food stock warning log
 * Visible only to city owner when food drops below 50
 */
export declare const createLowFoodWarningLog: (cityName: string, cityId: string, cityFaction: FactionId, turn: number) => LogEntry;
/**
 * Create a grain trade restored log
 */
export declare const createGrainTradeRestoredLog: (turn: number) => LogEntry;
/**
 * Create a grain trade restored by conquest log
 */
export declare const createGrainTradeConquestLog: (turn: number) => LogEntry;
/**
 * Create a leader died log
 */
export declare const createLeaderDiedLog: (leaderName: string, turn: number) => LogEntry;
/**
 * Create infiltration success log (green, good news)
 */
export declare const createInfiltrationSuccessLog: (leaderName: string, locationName: string, locationId: string, turn: number, visibleToFaction: FactionId) => LogEntry;
/**
 * Create infiltration detected log (warning)
 * Used when leader is spotted but NOT eliminated
 */
export declare const createInfiltrationDetectedLog: (leaderName: string, leaderFactionName: string, locationName: string, locationId: string, turn: number, visibleToFaction: FactionId, isOwnerMsg: boolean, pronoun?: string) => LogEntry;
/**
 * Create infiltration eliminated log (good news for defender)
 */
export declare const createInfiltrationEliminatedLog: (leaderName: string, leaderFactionName: string, locationName: string, locationId: string, turn: number, visibleToFaction: FactionId, pronoun?: string) => LogEntry;
/**
 * Create infiltration risk debug log
 */
export declare const createInfiltrationRiskDebugLog: (leaderName: string, locationName: string, risk: number, // 0-1
turn: number, visibleToFaction: FactionId) => LogEntry;
/**
 * Create a leader took command log
 */
export declare const createLeaderCommandLog: (leaderName: string, missionId: string, turn: number) => LogEntry;
/**
 * Create an AI seize food log
 */
export declare const createAISeizeFoodLog: (factionName: string, ruralName: string, cityName: string, turn: number) => LogEntry;
/**
 * Create an AI seize gold log
 */
export declare const createAISeizeGoldLog: (factionName: string, cityName: string, turn: number) => LogEntry;
/**
 * Create an embargo log
 */
export declare const createEmbargoLog: (message: string, turn: number) => LogEntry;
/**
 * Create a combat log
 */
export declare const createCombatLog: (message: string, turn: number) => LogEntry;
/**
 * Create a narrative flavor text log
 */
export declare const createNarrativeLog: (message: string, turn: number) => LogEntry;
/**
 * Create a clandestine sabotage warning log (25% chance when Undermine Authorities active)
 * Visible only to territory owner, clickable to open governor menu
 */
export declare const createClandestineSabotageWarningLog: (locationName: string, locationId: string, locationFaction: FactionId, turn: number) => LogEntry;
/**
 * Create leader departure spotted log (Hunt Networks detection)
 * Visible only to Hunt Networks region controller as GOOD news
 * Format: "[LeaderName] from the [FactionName] has been spotted leaving [RegionName] for [DestinationName]."
 */
export declare const createLeaderDepartureSpottedLog: (leaderName: string, leaderFactionName: string, sourceLocationName: string, sourceLocationId: string, destinationName: string, turn: number, visibleToFaction: FactionId) => LogEntry;
