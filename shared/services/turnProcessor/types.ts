// Turn Processor Types - Interfaces for turn processing phases

import { GameState, FactionId, Location, Army, Character, Road, Convoy, NavalConvoy, CombatState } from '../../types';

/**
 * Result of convoy processing
 */
export interface ConvoyProcessingResult {
    convoys: Convoy[];
    locations: Location[];
    logs: string[];
}

/**
 * Result of naval convoy processing
 */
export interface NavalConvoyProcessingResult {
    navalConvoys: NavalConvoy[];
    locations: Location[];
    logs: string[];
}

/**
 * Result of famine processing
 */
export interface FamineProcessingResult {
    locations: Location[];
    armies: Army[];
    stats: GameState['stats'];
    famineNotification: { cityName: string; ruralName: string } | null;
    logs: string[];
}

/**
 * Result of negotiation processing
 */
export interface NegotiationProcessingResult {
    locations: Location[];
    armies: Army[];
    pendingNegotiations: GameState['pendingNegotiations'];
    logs: string[];
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
    logs: string[];
    insurrectionNotification: any;
}

/**
 * Result of stability processing (leader bonuses + low tax recovery)
 */
export interface StabilityProcessingResult {
    locations: Location[];
}

/**
 * Context for a single turn phase
 */
export interface TurnPhaseContext {
    state: GameState;
    logs: string[];
}
