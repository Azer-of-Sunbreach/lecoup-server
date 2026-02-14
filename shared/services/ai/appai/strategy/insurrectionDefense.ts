/**
 * Insurrection Defense Module (Application wrapper)
 * 
 * Re-exports shared detection logic and adds Application-specific
 * mission generation and emergency dispatch functions.
 * 
 * @see shared/services/ai/strategy/insurrectionDefense.ts - Core logic
 * @module insurrectionDefense
 */

import { GameState, FactionId, Army } from '../../../../types';

// Re-export types and functions from shared
export {
    detectInsurrectionThreats,
    convertToAlerts,
    getInsurrectionAlerts,
    getCurrentGarrison,
    analyzeGarrisonDeficits,
    groupThreatsByPair,
    allocateGarrison
} from '../../strategy';

export type {
    InsurrectionThreat,
    InsurrectionThreatType,
    InsurrectionAlert
} from '../../strategy';

// Import for local use
import {
    InsurrectionThreat,
    getCurrentGarrison,
    analyzeGarrisonDeficits
} from '../../strategy';


// ============================================================================
// MISSION GENERATION
// ============================================================================

import { AIMission } from '../../../../types';

/**
 * Generate DEFEND missions for locations under insurrection threat.
 * Called during mission update phase.
 * 
 * @param state - Current game state
 * @param faction - Faction to process
 * @param threats - Detected insurrection threats
 * @param activeMissions - Current missions (modified in place)
 */
export function generateGarrisonMissions(
    state: GameState,
    faction: FactionId,
    threats: InsurrectionThreat[],
    activeMissions: AIMission[]
): void {
    // Analyze garrison deficits
    const deficits = analyzeGarrisonDeficits(threats, state.armies, faction);

    // Limit to prevent mission spam (max 2 new garrison missions per turn)
    const existingGarrisonMissions = activeMissions.filter(
        m => m.type === 'DEFEND' && m.data?.isInsurrectionDefense
    );

    if (existingGarrisonMissions.length >= 2) {
        console.log(`[AI GARRISON ${faction}] Already have ${existingGarrisonMissions.length} garrison missions, skipping`);
        return;
    }

    const maxNewMissions = 2 - existingGarrisonMissions.length;
    let missionsCreated = 0;

    for (const deficit of deficits) {
        if (missionsCreated >= maxNewMissions) break;

        // Skip if already have a mission for this location
        const hasExistingMission = activeMissions.some(
            m => (m.type === 'DEFEND' || m.type === 'COUNTER_INSURRECTION') && m.targetId === deficit.locationId
        );
        if (hasExistingMission) continue;

        // Calculate priority: imminent threats get higher priority
        let priority = 75; // Base priority for insurrection defense
        if (deficit.turnsUntilThreat <= 1) priority = 95; // Imminent
        else if (deficit.turnsUntilThreat <= 2) priority = 85;

        // Cities get higher priority
        const location = state.locations.find(l => l.id === deficit.locationId);
        if (location?.type === 'CITY') priority += 5;

        // Create mission
        const mission: AIMission = {
            id: `garrison_insurrection_${deficit.locationId}_${state.turn}`,
            type: 'DEFEND',
            targetId: deficit.locationId,
            priority,
            status: 'PLANNING',
            stage: 'GATHERING',
            assignedArmyIds: [],
            data: {
                isInsurrectionDefense: true,
                threatType: deficit.type,
                estimatedInsurgents: deficit.estimatedInsurgents,
                requiredStrength: deficit.requiredGarrison,
                turnsUntilThreat: deficit.turnsUntilThreat,
                currentGarrison: deficit.currentGarrison,
                deficit: deficit.deficit
            }
        };

        activeMissions.push(mission);
        missionsCreated++;

        console.log(`[AI GARRISON ${faction}] Created ${deficit.type} defense mission for ${deficit.locationName}: need ${deficit.deficit} more troops (${deficit.turnsUntilThreat}t until threat)`);
    }
}

// ============================================================================
// PHASE 2: EMERGENCY DISPATCH
// ============================================================================

import { Road, RoadQuality } from '../../../../types';

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
                army.justMoved = true;

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
