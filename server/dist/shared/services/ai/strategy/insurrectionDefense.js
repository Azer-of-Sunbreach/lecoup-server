"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectInsurrectionThreats = detectInsurrectionThreats;
exports.convertToAlerts = convertToAlerts;
exports.getCurrentGarrison = getCurrentGarrison;
exports.analyzeGarrisonDeficits = analyzeGarrisonDeficits;
exports.groupThreatsByPair = groupThreatsByPair;
exports.allocateGarrison = allocateGarrison;
exports.getInsurrectionAlerts = getInsurrectionAlerts;
const types_1 = require("../../../types");
const insurrectionFormulas_1 = require("../../domain/clandestine/insurrectionFormulas");
// ============================================================================
// LOG-BASED THREAT DETECTION
// ============================================================================
/**
 * Detect GRAND_INSURRECTION preparations from logs.
 * Looks for CRITICAL logs with "preparing an insurrection" pattern.
 */
function detectGrandInsurrectionThreats(logs, faction, locations, currentTurn) {
    const threats = [];
    // Pattern: "[Leader] is preparing an insurrection in [Region]"
    const pattern = /(\w+(?:\s\w+)*) is preparing an insurrection in (.+)/i;
    // Look at recent logs (last 4 turns for GRAND_INSURRECTION)
    const recentLogs = logs.filter(log => log.turn >= currentTurn - 4 &&
        log.type === types_1.LogType.INSURRECTION &&
        log.criticalForFactions?.includes(faction));
    for (const log of recentLogs) {
        const match = log.message.match(pattern);
        if (!match)
            continue;
        const regionName = match[2];
        // Find the location
        const location = locations.find(l => l.name === regionName && l.faction === faction);
        if (!location)
            continue;
        // Calculate turns remaining (GRAND takes 4 turns)
        const turnsElapsed = currentTurn - log.turn;
        const turnsRemaining = Math.max(0, 4 - turnsElapsed);
        // Skip if already processed (don't double-count)
        if (threats.some(t => t.locationId === location.id && t.type === 'GRAND')) {
            continue;
        }
        const instigatorFaction = types_1.FactionId.NEUTRAL;
        const estimatedInsurgents = (0, insurrectionFormulas_1.estimateGrandInsurgentsForAI)(location, instigatorFaction);
        const requiredGarrison = (0, insurrectionFormulas_1.calculateRequiredGarrison)(estimatedInsurgents);
        threats.push({
            type: 'GRAND',
            locationId: location.id,
            locationName: location.name,
            turnsUntilThreat: turnsRemaining,
            estimatedInsurgents,
            requiredGarrison,
            probability: 1.0,
            instigatorFaction,
            linkedLocationId: location.linkedLocationId || undefined
        });
    }
    return threats;
}
/**
 * Detect INCITE_NEUTRAL_INSURRECTIONS preparations from logs.
 * Looks for CRITICAL logs with "stirring imminent neutral insurrections" pattern.
 */
function detectNeutralInsurrectionThreats(logs, faction, locations, currentTurn) {
    const threats = [];
    // Pattern: "Enemy agents have been reported stirring imminent neutral insurrections against us in [Region]!"
    const pattern = /stirring imminent neutral insurrections.*in (.+)!/i;
    // Look at recent logs (1-2 turns for NEUTRAL)
    const recentLogs = logs.filter(log => log.turn >= currentTurn - 2 &&
        log.type === types_1.LogType.INSURRECTION &&
        log.criticalForFactions?.includes(faction));
    for (const log of recentLogs) {
        const match = log.message.match(pattern);
        if (!match)
            continue;
        const regionName = match[1];
        const location = locations.find(l => l.name === regionName && l.faction === faction);
        if (!location)
            continue;
        // NEUTRAL triggers 1 turn after warning
        const turnsElapsed = currentTurn - log.turn;
        const turnsRemaining = Math.max(0, 1 - turnsElapsed);
        if (threats.some(t => t.locationId === location.id && t.type === 'NEUTRAL')) {
            continue;
        }
        const estimatedInsurgents = (0, insurrectionFormulas_1.estimateNeutralInsurgentsForAI)(location);
        const requiredGarrison = (0, insurrectionFormulas_1.calculateRequiredGarrison)(estimatedInsurgents);
        threats.push({
            type: 'NEUTRAL',
            locationId: location.id,
            locationName: location.name,
            turnsUntilThreat: turnsRemaining,
            estimatedInsurgents,
            requiredGarrison,
            probability: 1.0,
            linkedLocationId: location.linkedLocationId || undefined
        });
    }
    return threats;
}
/**
 * Detect spontaneous insurrection risks from low stability.
 * Only for faction's own territories with stability < 50%.
 */
function detectSpontaneousRisks(locations, faction) {
    const threats = [];
    const ownedLocations = locations.filter(l => l.faction === faction);
    for (const location of ownedLocations) {
        const probability = (0, insurrectionFormulas_1.getSpontaneousInsurrectionProbability)(location.stability);
        if (probability <= 0)
            continue;
        const isCity = location.type === 'CITY';
        const estimatedInsurgents = (0, insurrectionFormulas_1.estimateSpontaneousInsurgents)(location.stability, location.population, isCity);
        if (estimatedInsurgents <= 0)
            continue;
        const requiredGarrison = (0, insurrectionFormulas_1.calculateRequiredGarrison)(estimatedInsurgents);
        threats.push({
            type: 'SPONTANEOUS',
            locationId: location.id,
            locationName: location.name,
            turnsUntilThreat: 0, // Can happen any turn
            estimatedInsurgents,
            requiredGarrison,
            probability,
            linkedLocationId: location.linkedLocationId || undefined
        });
    }
    return threats;
}
// ============================================================================
// MAIN DETECTION FUNCTIONS
// ============================================================================
/**
 * Detect all insurrection threats for a faction.
 * Combines log-based detection (GRAND/NEUTRAL) with stability monitoring (SPONTANEOUS).
 *
 * @param state - Current game state
 * @param faction - Faction to detect threats for
 * @returns Array of all detected threats, sorted by urgency
 */
function detectInsurrectionThreats(state, faction) {
    const allThreats = [];
    // 1. Detect GRAND_INSURRECTION from logs
    const grandThreats = detectGrandInsurrectionThreats(state.logs, faction, state.locations, state.turn);
    allThreats.push(...grandThreats);
    // 2. Detect INCITE_NEUTRAL from logs
    const neutralThreats = detectNeutralInsurrectionThreats(state.logs, faction, state.locations, state.turn);
    allThreats.push(...neutralThreats);
    // 3. Detect SPONTANEOUS from stability
    const spontaneousThreats = detectSpontaneousRisks(state.locations, faction);
    allThreats.push(...spontaneousThreats);
    // Sort by urgency: turns until threat (asc), then required garrison (desc)
    allThreats.sort((a, b) => {
        // Imminent threats first
        if (a.turnsUntilThreat !== b.turnsUntilThreat) {
            return a.turnsUntilThreat - b.turnsUntilThreat;
        }
        // Higher probability first
        if (a.probability !== b.probability) {
            return b.probability - a.probability;
        }
        // Larger threats first
        return b.requiredGarrison - a.requiredGarrison;
    });
    if (allThreats.length > 0) {
        console.log(`[AI INSURRECTION-DETECT ${faction}] Found ${allThreats.length} threats:`, allThreats.map(t => `${t.type}@${t.locationName}(${t.turnsUntilThreat}t, ${t.estimatedInsurgents} ins)`));
    }
    return allThreats;
}
// ============================================================================
// CONVERT TO ALERTS FOR RECRUITMENT MODULE
// ============================================================================
/**
 * Convert threats to alerts for the recruitment module.
 * Calculates priority based on urgency and threat size.
 *
 * @param threats - Detected threats
 * @returns Alerts for recruitment prioritization
 */
function convertToAlerts(threats) {
    return threats.map(threat => {
        // Priority calculation: Lower turns = higher priority, higher insurgents = higher priority
        const urgencyScore = (5 - threat.turnsUntilThreat) * 20; // 0-100 based on urgency
        const sizeScore = Math.min(100, threat.requiredGarrison / 50); // 0-100 based on size
        const probabilityScore = threat.probability * 50; // 0-50 based on probability
        return {
            locationId: threat.locationId,
            turnsUntilThreat: threat.turnsUntilThreat,
            estimatedInsurgents: threat.estimatedInsurgents,
            requiredGarrison: threat.requiredGarrison,
            priority: urgencyScore + sizeScore + probabilityScore
        };
    }).sort((a, b) => b.priority - a.priority);
}
// ============================================================================
// GARRISON STATUS CHECK
// ============================================================================
/**
 * Check current garrison status at a location.
 */
function getCurrentGarrison(locationId, armies, faction) {
    return armies
        .filter(a => a.faction === faction &&
        a.locationId === locationId &&
        a.locationType === 'LOCATION')
        .reduce((sum, a) => sum + a.strength, 0);
}
/**
 * Calculate garrison deficit for all threats.
 */
function analyzeGarrisonDeficits(threats, armies, faction) {
    return threats.map(threat => {
        const currentGarrison = getCurrentGarrison(threat.locationId, armies, faction);
        const deficit = Math.max(0, threat.requiredGarrison - currentGarrison);
        return {
            ...threat,
            currentGarrison,
            deficit
        };
    }).filter(t => t.deficit > 0);
}
// ============================================================================
// MULTI-LOCATION HANDLING
// ============================================================================
/**
 * Group threats by city/rural pairs for coordinated defense.
 * Prioritizes city protection, allocates surplus to rural.
 *
 * @param threats - All detected threats
 * @param locations - All locations
 * @returns Map of location pairs with combined requirements
 */
function groupThreatsByPair(threats, locations) {
    const pairs = new Map();
    for (const threat of threats) {
        const location = locations.find(l => l.id === threat.locationId);
        if (!location)
            continue;
        // Create pair key (use city id as key)
        const isCity = location.type === 'CITY';
        const cityId = isCity ? location.id : location.linkedLocationId;
        if (!cityId)
            continue;
        const existing = pairs.get(cityId) || { city: null, rural: null, totalRequired: 0 };
        if (isCity) {
            existing.city = threat;
        }
        else {
            existing.rural = threat;
        }
        // Recalculate total requirement
        const cityReq = existing.city?.requiredGarrison || 0;
        const ruralReq = existing.rural?.requiredGarrison || 0;
        existing.totalRequired = cityReq + ruralReq;
        pairs.set(cityId, existing);
    }
    return pairs;
}
/**
 * Calculate garrison allocation for city/rural pair.
 * Priority: City first, surplus to rural.
 *
 * @param availableTroops - Total troops available for this pair
 * @param cityRequired - Troops needed for city
 * @param ruralRequired - Troops needed for rural
 * @returns Allocation { cityAlloc, ruralAlloc }
 */
function allocateGarrison(availableTroops, cityRequired, ruralRequired) {
    // Priority: Fully protect city, then rural
    const cityAlloc = Math.min(availableTroops, cityRequired);
    const remaining = availableTroops - cityAlloc;
    const ruralAlloc = Math.min(remaining, ruralRequired);
    return { cityAlloc, ruralAlloc };
}
// ============================================================================
// HELPER: Get insurrection alerts for a faction
// ============================================================================
/**
 * One-call function to detect threats and convert to alerts.
 * Convenience function for use in economy modules.
 *
 * @param state - Current game state
 * @param faction - Faction to detect threats for
 * @returns Alerts for recruitment prioritization
 */
function getInsurrectionAlerts(state, faction) {
    const threats = detectInsurrectionThreats(state, faction);
    return convertToAlerts(threats);
}
