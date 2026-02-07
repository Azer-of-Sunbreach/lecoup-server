/**
 * Security Alerts Service
 *
 * Analyzes game state (logs, locations, stability) to generate alerts for the player
 * regarding enemy activities in their territory.
 *
 * Focuses on:
 * 1. Insurrections (Grand, Neutral, Low Stability)
 * 2. Clandestine Activities (Infiltration, Sabotage, Departures)
 */
import { Location, GameState } from '../../../types';
export interface InsurrectionAlert {
    type: 'GRAND_INSURRECTION' | 'NEUTRAL_INSURRECTION' | 'LOW_STABILITY';
    location: Location;
    turnExpected: string;
    messageKey: string;
    messageParams?: Record<string, any>;
    priority: number;
}
export interface OtherAlert {
    type: 'INFILTRATION' | 'DEPARTURE' | 'SABOTAGE' | 'ELIMINATED' | 'SIEGE' | 'OTHER';
    location: Location;
    messageKey: string;
    messageParams?: Record<string, any>;
    stability: number;
    governorId?: string;
    isSuccess?: boolean;
}
export interface SecurityAlertsData {
    insurrections: InsurrectionAlert[];
    otherAlerts: OtherAlert[];
}
/**
 * Build security alerts for the current turn
 */
export declare const buildSecurityAlerts: (gameState: GameState, currentTurn: number, explicitSiegeNotification?: any) => SecurityAlertsData;
