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

import { GameState, FactionId, Location, LogEntry, LogType, Army, RoadQuality } from '../../../types';
import {
    estimateGrandInsurgentsForAI,
    estimateNeutralInsurgentsForAI,
    estimateSpontaneousInsurgents,
    getSpontaneousInsurrectionProbability,
    calculateRequiredGarrison
} from '../../domain/clandestine/insurrectionFormulas';
import { InsurrectionAlert } from '../economy/types';

// ============================================================================
// TYPES
// ============================================================================

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

// Re-export InsurrectionAlert for convenience
export type { InsurrectionAlert } from '../economy/types';

// ============================================================================
// LOG-BASED THREAT DETECTION
// ============================================================================

/**
 * Detect GRAND_INSURRECTION preparations from logs.
 * Looks for CRITICAL logs with "preparing an insurrection" pattern.
 */
function detectGrandInsurrectionThreats(
    logs: LogEntry[],
    faction: FactionId,
    locations: Location[],
    currentTurn: number
): InsurrectionThreat[] {
    const threats: InsurrectionThreat[] = [];

    // Pattern: "[Leader] is preparing an insurrection in [Region]"
    const pattern = /(\w+(?:\s\w+)*) is preparing an insurrection in (.+)/i;

    // Look at recent logs (last 4 turns for GRAND_INSURRECTION)
    const recentLogs = logs.filter(log =>
        log.turn >= currentTurn - 4 &&
        log.type === LogType.INSURRECTION &&
        log.criticalForFactions?.includes(faction)
    );

    for (const log of recentLogs) {
        const match = log.message.match(pattern);
        if (!match) continue;

        const regionName = match[2];

        // Find the location
        const location = locations.find(l =>
            l.name === regionName && l.faction === faction
        );
        if (!location) continue;

        // Calculate turns remaining (GRAND takes 4 turns)
        const turnsElapsed = currentTurn - log.turn;
        const turnsRemaining = Math.max(0, 4 - turnsElapsed);

        // Skip if already processed (don't double-count)
        if (threats.some(t => t.locationId === location.id && t.type === 'GRAND')) {
            continue;
        }

        const instigatorFaction = FactionId.NEUTRAL;
        const estimatedInsurgents = estimateGrandInsurgentsForAI(location, instigatorFaction);
        const requiredGarrison = calculateRequiredGarrison(estimatedInsurgents);

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
function detectNeutralInsurrectionThreats(
    logs: LogEntry[],
    faction: FactionId,
    locations: Location[],
    currentTurn: number
): InsurrectionThreat[] {
    const threats: InsurrectionThreat[] = [];

    // Pattern: "Enemy agents have been reported stirring imminent neutral insurrections against us in [Region]!"
    const pattern = /stirring imminent neutral insurrections.*in (.+)!/i;

    // Look at recent logs (1-2 turns for NEUTRAL)
    const recentLogs = logs.filter(log =>
        log.turn >= currentTurn - 2 &&
        log.type === LogType.INSURRECTION &&
        log.criticalForFactions?.includes(faction)
    );

    for (const log of recentLogs) {
        const match = log.message.match(pattern);
        if (!match) continue;

        const regionName = match[1];

        const location = locations.find(l =>
            l.name === regionName && l.faction === faction
        );
        if (!location) continue;

        // NEUTRAL triggers 1 turn after warning
        const turnsElapsed = currentTurn - log.turn;
        const turnsRemaining = Math.max(0, 1 - turnsElapsed);

        if (threats.some(t => t.locationId === location.id && t.type === 'NEUTRAL')) {
            continue;
        }

        const estimatedInsurgents = estimateNeutralInsurgentsForAI(location);
        const requiredGarrison = calculateRequiredGarrison(estimatedInsurgents);

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
function detectSpontaneousRisks(
    locations: Location[],
    faction: FactionId
): InsurrectionThreat[] {
    const threats: InsurrectionThreat[] = [];

    const ownedLocations = locations.filter(l => l.faction === faction);

    for (const location of ownedLocations) {
        const probability = getSpontaneousInsurrectionProbability(location.stability);
        if (probability <= 0) continue;

        const isCity = location.type === 'CITY';
        const estimatedInsurgents = estimateSpontaneousInsurgents(
            location.stability,
            location.population,
            isCity
        );

        if (estimatedInsurgents <= 0) continue;

        const requiredGarrison = calculateRequiredGarrison(estimatedInsurgents);

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
export function detectInsurrectionThreats(
    state: GameState,
    faction: FactionId
): InsurrectionThreat[] {
    const allThreats: InsurrectionThreat[] = [];

    // 1. Detect GRAND_INSURRECTION from logs
    const grandThreats = detectGrandInsurrectionThreats(
        state.logs,
        faction,
        state.locations,
        state.turn
    );
    allThreats.push(...grandThreats);

    // 2. Detect INCITE_NEUTRAL from logs
    const neutralThreats = detectNeutralInsurrectionThreats(
        state.logs,
        faction,
        state.locations,
        state.turn
    );
    allThreats.push(...neutralThreats);

    // 3. Detect SPONTANEOUS from stability
    const spontaneousThreats = detectSpontaneousRisks(
        state.locations,
        faction
    );
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
        console.log(`[AI INSURRECTION-DETECT ${faction}] Found ${allThreats.length} threats:`,
            allThreats.map(t => `${t.type}@${t.locationName}(${t.turnsUntilThreat}t, ${t.estimatedInsurgents} ins)`));
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
export function convertToAlerts(threats: InsurrectionThreat[]): InsurrectionAlert[] {
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
export function getCurrentGarrison(
    locationId: string,
    armies: Army[],
    faction: FactionId
): number {
    return armies
        .filter(a =>
            a.faction === faction &&
            a.locationId === locationId &&
            a.locationType === 'LOCATION'
        )
        .reduce((sum, a) => sum + a.strength, 0);
}

/**
 * Calculate garrison deficit for all threats.
 */
export function analyzeGarrisonDeficits(
    threats: InsurrectionThreat[],
    armies: Army[],
    faction: FactionId
): Array<InsurrectionThreat & { currentGarrison: number; deficit: number }> {
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
export function groupThreatsByPair(
    threats: InsurrectionThreat[],
    locations: Location[]
): Map<string, { city: InsurrectionThreat | null; rural: InsurrectionThreat | null; totalRequired: number }> {
    const pairs = new Map<string, { city: InsurrectionThreat | null; rural: InsurrectionThreat | null; totalRequired: number }>();

    for (const threat of threats) {
        const location = locations.find(l => l.id === threat.locationId);
        if (!location) continue;

        // Create pair key (use city id as key)
        const isCity = location.type === 'CITY';
        const cityId = isCity ? location.id : location.linkedLocationId;
        if (!cityId) continue;

        const existing = pairs.get(cityId) || { city: null, rural: null, totalRequired: 0 };

        if (isCity) {
            existing.city = threat;
        } else {
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
export function allocateGarrison(
    availableTroops: number,
    cityRequired: number,
    ruralRequired: number
): { cityAlloc: number; ruralAlloc: number } {
    // Priority: Fully protect city, then rural
    const cityAlloc = Math.min(availableTroops, cityRequired);
    const remaining = availableTroops - cityAlloc;
    const ruralAlloc = Math.min(remaining, ruralRequired);

    return { cityAlloc, ruralAlloc };
}

// ============================================================================
// EMERGENCY REINFORCEMENT DISPATCH
// ============================================================================

/**
 * Dispatch emergency reinforcements to threatened locations.
 * Called BEFORE recruitment to move existing armies immediately.
 * 
 * Only triggers for imminent threats (turnsUntilThreat <= 1).
 * Prioritizes CITY over RURAL when both linked locations are threatened.
 * 
 * @param state - Current game state
 * @param faction - Faction to process
 * @param threats - Detected insurrection threats
 * @param armies - Armies array (modified in place)
 */
export function dispatchEmergencyReinforcements(
    state: GameState,
    faction: FactionId,
    threats: InsurrectionThreat[],
    armies: Army[]
): void {
    // Only process imminent threats
    const imminentThreats = threats.filter(t => t.turnsUntilThreat <= 1);
    if (imminentThreats.length === 0) return;

    const threatenedIds = new Set(threats.map(t => t.locationId));

    for (const threat of imminentThreats) {
        const location = state.locations.find(l => l.id === threat.locationId);
        if (!location) continue;

        // Calculate current garrison
        const currentGarrison = getCurrentGarrison(threat.locationId, armies, faction);
        const deficit = threat.requiredGarrison - currentGarrison;

        if (deficit <= 0) {
            console.log(`[AI EMERGENCY ${faction}] ${location.name}: Already defended (${currentGarrison} >= ${threat.requiredGarrison})`);
            continue;
        }

        console.log(`[AI EMERGENCY ${faction}] ${location.name}: IMMINENT THREAT! Deficit: ${deficit}. Searching for reinforcements...`);

        // Find armies in linked location (instant travel via LOCAL road)
        if (location.linkedLocationId) {
            const linkedLoc = state.locations.find(l => l.id === location.linkedLocationId);
            if (!linkedLoc || linkedLoc.faction !== faction) continue;

            // Check if linked location is ALSO threatened
            const linkedAlsoThreatened = threatenedIds.has(location.linkedLocationId);
            const currentIsCity = location.type === 'CITY';
            const linkedIsCity = linkedLoc.type === 'CITY';

            // Priority: CITY > RURAL. Skip if linked is a threatened city and current is rural
            if (linkedAlsoThreatened && linkedIsCity && !currentIsCity) {
                console.log(`[AI EMERGENCY ${faction}] Skipping ${location.name} (rural) - prioritizing ${linkedLoc.name} (city)`);
                continue;
            }

            // Find road between them
            const road = state.roads.find(r =>
                (r.from === location.id && r.to === location.linkedLocationId) ||
                (r.to === location.id && r.from === location.linkedLocationId)
            );

            if (!road || road.quality !== RoadQuality.LOCAL) continue;

            // Find available armies at linked location
            const availableAtLinked = armies.filter(a =>
                a.faction === faction &&
                a.locationId === location.linkedLocationId &&
                a.locationType === 'LOCATION' &&
                !a.isSpent && !a.isSieging && !a.isInsurgent && !a.action
            );

            // Calculate how much can be moved (leave minimum garrison at linked if also threatened)
            let maxToMove = availableAtLinked.reduce((sum, a) => sum + a.strength, 0);

            if (linkedAlsoThreatened) {
                const linkedThreat = threats.find(t => t.locationId === location.linkedLocationId);
                if (linkedThreat) {
                    // Leave enough to defend the linked location
                    const linkedGarrison = getCurrentGarrison(location.linkedLocationId!, armies, faction);
                    const linkedNeeded = linkedThreat.requiredGarrison;
                    maxToMove = Math.max(0, linkedGarrison - linkedNeeded);
                }
            }

            // Move armies
            let movedTotal = 0;
            for (const army of availableAtLinked) {
                if (movedTotal >= deficit) break;
                if (maxToMove <= 0) break;

                const toMove = Math.min(army.strength, deficit - movedTotal, maxToMove);
                if (toMove <= 0) continue;

                // Move the army
                army.locationId = threat.locationId;
                army.originLocationId = threat.locationId;
                army.foodSourceId = threat.locationId;
                army.lastSafePosition = { type: 'LOCATION', id: threat.locationId };
                (army as any).justMoved = true;

                movedTotal += army.strength;
                maxToMove -= army.strength;

                console.log(`[AI EMERGENCY ${faction}] DISPATCHED ${army.strength} troops from ${linkedLoc.name} to ${location.name}`);
            }

            if (movedTotal > 0) {
                console.log(`[AI EMERGENCY ${faction}] Total reinforcements to ${location.name}: ${movedTotal}`);
            }
        }
    }
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
export function getInsurrectionAlerts(
    state: GameState,
    faction: FactionId
): InsurrectionAlert[] {
    const threats = detectInsurrectionThreats(state, faction);
    return convertToAlerts(threats);
}
