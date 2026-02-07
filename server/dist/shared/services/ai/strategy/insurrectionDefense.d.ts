/**
 * Insurrection Defense Module (Shared)
 *
 * Detects and responds to all three types of insurrections:
 * - GRAND_INSURRECTION (clandestine, 4-turn prep)
 * - INCITE_NEUTRAL_INSURRECTIONS (clandestine, 1-turn prep + recurring)
 * - Spontaneous neutral insurrections (stability < 50%)
 *
 * Uses log-based detection for clandestine insurrections.
 *
 * @see shared/services/domain/clandestine/insurrectionFormulas.ts - Centralized formulas
 * @module shared/services/ai/strategy/insurrectionDefense
 */
import { GameState, FactionId, Location, Army } from '../../../types';
import { InsurrectionAlert } from '../economy/types';
export type InsurrectionThreatType = 'GRAND' | 'NEUTRAL' | 'SPONTANEOUS';
export interface InsurrectionThreat {
    type: InsurrectionThreatType;
    locationId: string;
    locationName: string;
    /** Estimated turns until insurrection triggers (0 = imminent this turn) */
    turnsUntilThreat: number;
    /** Estimated insurgent count */
    estimatedInsurgents: number;
    /** Required garrison to defend */
    requiredGarrison: number;
    /** Probability of occurrence (1.0 for GRAND/NEUTRAL, 0-1 for SPONTANEOUS) */
    probability: number;
    /** Instigator faction (for GRAND/NEUTRAL) */
    instigatorFaction?: FactionId;
    /** Linked location ID if exists (for multi-location handling) */
    linkedLocationId?: string;
}
export type { InsurrectionAlert } from '../economy/types';
/**
 * Detect all insurrection threats for a faction.
 * Combines log-based detection (GRAND/NEUTRAL) with stability monitoring (SPONTANEOUS).
 *
 * @param state - Current game state
 * @param faction - Faction to detect threats for
 * @returns Array of all detected threats, sorted by urgency
 */
export declare function detectInsurrectionThreats(state: GameState, faction: FactionId): InsurrectionThreat[];
/**
 * Convert threats to alerts for the recruitment module.
 * Calculates priority based on urgency and threat size.
 *
 * @param threats - Detected threats
 * @returns Alerts for recruitment prioritization
 */
export declare function convertToAlerts(threats: InsurrectionThreat[]): InsurrectionAlert[];
/**
 * Check current garrison status at a location.
 */
export declare function getCurrentGarrison(locationId: string, armies: Army[], faction: FactionId): number;
/**
 * Calculate garrison deficit for all threats.
 */
export declare function analyzeGarrisonDeficits(threats: InsurrectionThreat[], armies: Army[], faction: FactionId): Array<InsurrectionThreat & {
    currentGarrison: number;
    deficit: number;
}>;
/**
 * Group threats by city/rural pairs for coordinated defense.
 * Prioritizes city protection, allocates surplus to rural.
 *
 * @param threats - All detected threats
 * @param locations - All locations
 * @returns Map of location pairs with combined requirements
 */
export declare function groupThreatsByPair(threats: InsurrectionThreat[], locations: Location[]): Map<string, {
    city: InsurrectionThreat | null;
    rural: InsurrectionThreat | null;
    totalRequired: number;
}>;
/**
 * Calculate garrison allocation for city/rural pair.
 * Priority: City first, surplus to rural.
 *
 * @param availableTroops - Total troops available for this pair
 * @param cityRequired - Troops needed for city
 * @param ruralRequired - Troops needed for rural
 * @returns Allocation { cityAlloc, ruralAlloc }
 */
export declare function allocateGarrison(availableTroops: number, cityRequired: number, ruralRequired: number): {
    cityAlloc: number;
    ruralAlloc: number;
};
/**
 * One-call function to detect threats and convert to alerts.
 * Convenience function for use in economy modules.
 *
 * @param state - Current game state
 * @param faction - Faction to detect threats for
 * @returns Alerts for recruitment prioritization
 */
export declare function getInsurrectionAlerts(state: GameState, faction: FactionId): InsurrectionAlert[];
