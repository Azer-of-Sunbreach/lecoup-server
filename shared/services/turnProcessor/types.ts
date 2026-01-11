// Turn Processor Types - Interfaces for turn processing phases

import { GameState, FactionId, Location, Army, Character, Road, Convoy, NavalConvoy, CombatState, LogEntry } from '../../types';

/**
 * Result of convoy processing
 */
export interface ConvoyProcessingResult {
    convoys: Convoy[];
    locations: Location[];
    logs: LogEntry[];
}

/**
 * Result of naval convoy processing
 */
export interface NavalConvoyProcessingResult {
    navalConvoys: NavalConvoy[];
    locations: Location[];
    logs: LogEntry[];
}

/**
 * Result of famine processing
 */
export interface FamineProcessingResult {
    locations: Location[];
    armies: Army[];
    stats: GameState['stats'];
    famineNotification: { cityName: string; ruralName: string } | null;
    logs: LogEntry[];
}

/**
 * Result of negotiation processing
 */
export interface NegotiationProcessingResult {
    locations: Location[];
    armies: Army[];
    pendingNegotiations: GameState['pendingNegotiations'];
    characters: Character[];
    logs: LogEntry[];
}

/**
 * Result of AI battle resolution
 */
export interface AIBattleResolutionResult {
    locations: Location[];
    roads: Road[];
    armies: Army[];
    characters: Character[];
    stats: GameState['stats'];
    logs: LogEntry[];
    insurrectionNotification: any;
}

/**
 * Result of stability processing (leader bonuses + low tax recovery + high tax penalties)
 */
export interface StabilityProcessingResult {
    locations: Location[];
    logs: LogEntry[];
}

/**
 * Context for a single turn phase
 */
export interface TurnPhaseContext {
    state: GameState;
    logs: LogEntry[];
}
