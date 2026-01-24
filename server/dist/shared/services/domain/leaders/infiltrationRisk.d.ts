/**
 * Infiltration Risk Service
 *
 * Calculates the risk of a leader being DETECTED when entering enemy territory.
 * Important: Detection does NOT result in elimination - leader still arrives but is spotted.
 *
 * New Formula (v2):
 * BaseRisk = (10 + Garrison/250) × (1 + Stability/100) × (1 - Resentment/100) × (1 - Discretion/10) / 100
 *
 * Rules:
 * - If Garrison = 0: Risk = 0% (no detection possible)
 * - Max base risk: 50%
 * - Max risk with modifiers: 70%
 *
 * Modifiers:
 * - City location: ×1.33
 * - Hunt Networks active: ×(1 + GovernorStatesmanship/20)
 */
import { Location, Character } from '../../../types';
import { Army } from '../../../types';
/**
 * Calculate the base detection risk for a leader entering a specific location.
 *
 * Formula: (10 + Garrison/250) × (1 + Stability/100) × (1 - Resentment/100) × (1 - Discretion/10) / 100
 *
 * @param location The target location
 * @param factionSoldiers Number of soldiers of the controlling faction
 * @param resentment Resentment against the controlling faction (0-100)
 * @param discretion Leader's discretion stat (1-5)
 * @returns Detection probability (0.0 to MAX_BASE_RISK)
 */
export declare function calculateBaseDetectionRisk(location: Location, factionSoldiers: number, resentment: number, discretion: number): number;
/**
 * Apply location modifiers to the base detection risk.
 *
 * Modifiers:
 * - City: ×1.33
 * - Hunt Networks: ×(1 + statesmanship/20)
 *
 * @param risk Base detection risk
 * @param isCity Whether the location is a city
 * @param isHuntNetworkActive Whether Hunt Networks policy is active
 * @param governorStatesmanship Governor's statesmanship stat (1-5)
 * @returns Modified detection probability (0.0 to MAX_MODIFIED_RISK)
 */
export declare function applyLocationModifiers(risk: number, isCity: boolean, isHuntNetworkActive?: boolean, governorStatesmanship?: number): number;
/**
 * @deprecated Use calculateBaseDetectionRisk + applyLocationModifiers instead.
 * Legacy function for backwards compatibility.
 */
export declare function applyLeaderStatsModifier(risk: number, discretion: number): number;
/**
 * @deprecated Use applyLocationModifiers instead.
 * Legacy function for backwards compatibility.
 */
export declare function applyGovernorSurveillanceModifier(risk: number, governorStatesmanship: number, isHuntNetworkActive?: boolean): number;
/**
 * Clamp risk to valid range [0, MAX_MODIFIED_RISK]
 */
export declare function clampRisk(risk: number): number;
/**
 * Full calculation pipeline for infiltration detection risk.
 *
 * This is the main entry point for calculating detection risk when a leader
 * attempts to infiltrate enemy territory.
 *
 * @param location Target location to infiltrate
 * @param armies All armies in the game
 * @param infiltratingLeader The leader attempting infiltration
 * @param governor Governor of the target location (if any)
 * @param isHuntNetworkActive Whether Hunt Networks policy is active
 * @returns Final detection probability (0.0 to 0.70)
 */
export declare function calculateTotalInfiltrationRisk(location: Location, armies: Army[], infiltratingLeader: Character, governor: Character | undefined, isHuntNetworkActive?: boolean): number;
/**
 * Debug helper to get risk breakdown for logging
 */
export declare function getInfiltrationRiskBreakdown(location: Location, armies: Army[], infiltratingLeader: Character, governor: Character | undefined, isHuntNetworkActive?: boolean): {
    garrison: number;
    stability: number;
    resentment: number;
    discretion: number;
    isCity: boolean;
    isHuntNetworkActive: boolean;
    governorStatesmanship: number;
    baseRisk: number;
    finalRisk: number;
};
