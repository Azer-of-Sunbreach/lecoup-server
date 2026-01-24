"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateBaseDetectionRisk = calculateBaseDetectionRisk;
exports.applyLocationModifiers = applyLocationModifiers;
exports.applyLeaderStatsModifier = applyLeaderStatsModifier;
exports.applyGovernorSurveillanceModifier = applyGovernorSurveillanceModifier;
exports.clampRisk = clampRisk;
exports.calculateTotalInfiltrationRisk = calculateTotalInfiltrationRisk;
exports.getInfiltrationRiskBreakdown = getInfiltrationRiskBreakdown;
const types_1 = require("../../../types");
const resentment_1 = require("../../domain/politics/resentment");
// Risk bounds
const MAX_BASE_RISK = 0.50; // 50% before modifiers
const MAX_MODIFIED_RISK = 0.70; // 70% after all modifiers
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
function calculateBaseDetectionRisk(location, factionSoldiers, resentment, discretion) {
    // No detection if no garrison
    if (factionSoldiers === 0)
        return 0;
    const stability = location.stability;
    // Calculate each factor
    const garrisonFactor = 10 + (factionSoldiers / 250);
    const stabilityFactor = 1 + (stability / 100);
    const resentmentFactor = 1 - (resentment / 100);
    const discretionFactor = 1 - (discretion / 10);
    // Combine factors and convert to percentage
    let risk = (garrisonFactor * stabilityFactor * resentmentFactor * discretionFactor) / 100;
    // Clamp to base max
    return Math.max(0, Math.min(risk, MAX_BASE_RISK));
}
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
function applyLocationModifiers(risk, isCity, isHuntNetworkActive = false, governorStatesmanship = 0) {
    let modifiedRisk = risk;
    // City modifier: ×1.33
    if (isCity) {
        modifiedRisk *= 1.33;
    }
    // Hunt Networks modifier: ×(1 + statesmanship/20)
    if (isHuntNetworkActive && governorStatesmanship > 0) {
        modifiedRisk *= (1 + (governorStatesmanship / 20));
    }
    // Clamp to modified max
    return Math.max(0, Math.min(modifiedRisk, MAX_MODIFIED_RISK));
}
/**
 * @deprecated Use calculateBaseDetectionRisk + applyLocationModifiers instead.
 * Legacy function for backwards compatibility.
 */
function applyLeaderStatsModifier(risk, discretion) {
    // Discretion is now integrated into the main formula
    const effectiveDiscretion = Math.min(10, Math.max(0, discretion));
    return risk * (1 - (effectiveDiscretion / 10));
}
/**
 * @deprecated Use applyLocationModifiers instead.
 * Legacy function for backwards compatibility.
 */
function applyGovernorSurveillanceModifier(risk, governorStatesmanship, isHuntNetworkActive = false) {
    if (!isHuntNetworkActive) {
        return risk;
    }
    return risk * (1 + (governorStatesmanship / 20));
}
/**
 * Clamp risk to valid range [0, MAX_MODIFIED_RISK]
 */
function clampRisk(risk) {
    return Math.max(0, Math.min(MAX_MODIFIED_RISK, risk));
}
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
function calculateTotalInfiltrationRisk(location, armies, infiltratingLeader, governor, isHuntNetworkActive = false) {
    // 1. Count soldiers of the controlling faction in the location
    const controllingFaction = location.faction;
    const factionSoldiers = armies
        .filter(a => a.locationId === location.id && a.faction === controllingFaction)
        .reduce((sum, a) => sum + a.strength, 0);
    // No detection if no garrison
    if (factionSoldiers === 0)
        return 0;
    // 2. Get resentment against the controlling faction
    const resentment = (0, resentment_1.getResentment)(location, controllingFaction);
    // 3. Get leader's discretion stat
    const discretion = infiltratingLeader.stats?.discretion || 1;
    // 4. Calculate base risk
    const baseRisk = calculateBaseDetectionRisk(location, factionSoldiers, resentment, discretion);
    // 5. Determine if location is a city
    const isCity = location.type === types_1.LocationType.CITY;
    // 6. Get governor statesmanship if Hunt Networks is active
    const governorStatesmanship = governor?.stats?.statesmanship || 0;
    // 7. Apply location modifiers
    const finalRisk = applyLocationModifiers(baseRisk, isCity, isHuntNetworkActive, governorStatesmanship);
    return finalRisk;
}
/**
 * Debug helper to get risk breakdown for logging
 */
function getInfiltrationRiskBreakdown(location, armies, infiltratingLeader, governor, isHuntNetworkActive = false) {
    const controllingFaction = location.faction;
    const garrison = armies
        .filter(a => a.locationId === location.id && a.faction === controllingFaction)
        .reduce((sum, a) => sum + a.strength, 0);
    const resentment = (0, resentment_1.getResentment)(location, controllingFaction);
    const discretion = infiltratingLeader.stats?.discretion || 1;
    const isCity = location.type === types_1.LocationType.CITY;
    const governorStatesmanship = governor?.stats?.statesmanship || 0;
    const baseRisk = calculateBaseDetectionRisk(location, garrison, resentment, discretion);
    const finalRisk = applyLocationModifiers(baseRisk, isCity, isHuntNetworkActive, governorStatesmanship);
    return {
        garrison,
        stability: location.stability,
        resentment,
        discretion,
        isCity,
        isHuntNetworkActive,
        governorStatesmanship,
        baseRisk,
        finalRisk
    };
}
