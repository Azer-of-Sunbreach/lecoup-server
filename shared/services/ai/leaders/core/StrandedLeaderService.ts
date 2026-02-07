/**
 * Stranded Leader Service
 * 
 * Detects and evacuates leaders stranded in enemy/neutral territory.
 * A leader is "stranded" when:
 * - They are in a location not controlled by their faction
 * - They are NOT on an active clandestine mission (UNDERCOVER with budget > 0)
 * - They are NOT already moving (MOVING status)
 * - They are NOT preparing a grand insurrection (ON_MISSION status)
 * 
 * @module shared/services/ai/leaders/core
 */

import { GameState, FactionId, Character, CharacterStatus, Location } from '../../../../types';
import { calculateLeaderTravelTime } from '../../../domain/leaders/leaderPathfinding';

// ============================================================================
// TYPES
// ============================================================================

export interface StrandedLeaderResult {
    /** Updated characters array with evacuation orders applied */
    updatedCharacters: Character[];
    /** IDs of leaders that were evacuated */
    evacuatedLeaderIds: string[];
    /** Log messages for debugging */
    logs: string[];
}

export interface EvacuationTarget {
    locationId: string;
    locationName: string;
    priority: number;
    travelTime: number;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Process stranded leaders for a faction.
 * Detects leaders in enemy/neutral territory and initiates evacuation.
 * 
 * @param state Current game state
 * @param faction Faction to process
 * @returns Updated characters and logs
 */
export function processStrandedLeaders(
    state: GameState,
    faction: FactionId
): StrandedLeaderResult {
    const logs: string[] = [];
    const evacuatedLeaderIds: string[] = [];
    const updatedCharacters = [...state.characters];

    // Get owned territory IDs
    const ownedTerritories = state.locations.filter(l => l.faction === faction);
    const ownedTerritoryIds = new Set(ownedTerritories.map(t => t.id));

    // Detect stranded leaders
    const strandedLeaders = detectStrandedLeaders(
        updatedCharacters,
        ownedTerritoryIds,
        faction
    );

    if (strandedLeaders.length === 0) {
        return { updatedCharacters, evacuatedLeaderIds, logs };
    }

    logs.push(`Found ${strandedLeaders.length} stranded leaders`);

    // Build evacuation targets with priorities
    const evacuationTargets = buildEvacuationTargets(ownedTerritories, updatedCharacters, faction);

    // Evacuate each stranded leader
    for (const { index, leader } of strandedLeaders) {
        const result = evacuateLeader(
            leader,
            index,
            evacuationTargets,
            updatedCharacters,
            state.locations,
            state.roads
        );

        if (result.success) {
            updatedCharacters[index] = result.updatedLeader;
            evacuatedLeaderIds.push(leader.id);
            logs.push(result.log);
        }
    }

    return { updatedCharacters, evacuatedLeaderIds, logs };
}

// ============================================================================
// DETECTION
// ============================================================================

/**
 * Detect leaders stranded in non-friendly territory.
 */
function detectStrandedLeaders(
    characters: Character[],
    ownedTerritoryIds: Set<string>,
    faction: FactionId
): { index: number; leader: Character }[] {
    const stranded: { index: number; leader: Character }[] = [];

    for (let i = 0; i < characters.length; i++) {
        const leader = characters[i];

        // Must be our faction and alive
        if (leader.faction !== faction) continue;
        if (leader.status === CharacterStatus.DEAD) continue;

        // Must have a location
        if (!leader.locationId) continue;

        // Skip if already moving
        if (leader.status === CharacterStatus.MOVING) continue;

        // Skip if on mission (preparing grand insurrection)
        if ((leader.status as string) === 'ON_MISSION') continue;

        // Skip if UNDERCOVER with active budget (on clandestine mission)
        if (leader.status === CharacterStatus.UNDERCOVER) {
            const budget = leader.clandestineBudget || (leader as any).budget || 0;
            if (budget > 0) continue;
        }

        // Check if location is NOT owned by faction
        if (!ownedTerritoryIds.has(leader.locationId)) {
            stranded.push({ index: i, leader });
        }
    }

    return stranded;
}

// ============================================================================
// EVACUATION LOGIC
// ============================================================================

/**
 * Build prioritized list of evacuation targets.
 */
function buildEvacuationTargets(
    ownedTerritories: Location[],
    characters: Character[],
    faction: FactionId
): EvacuationTarget[] {
    const targets: EvacuationTarget[] = [];

    // Track which locations already have governors
    const governedLocations = new Set<string>();
    for (const c of characters) {
        if (c.faction === faction && c.status === CharacterStatus.GOVERNING && c.locationId) {
            governedLocations.add(c.locationId);
        }
    }

    for (const territory of ownedTerritories) {
        let priority = 10; // Base priority

        // Higher priority for territories needing a governor
        if (!governedLocations.has(territory.id)) {
            priority += 30;
        }

        // Higher priority for cities
        if (territory.type === 'CITY') {
            priority += 10;
        }

        // Higher priority for low stability
        const stability = territory.stability ?? 100;
        if (stability < 50) priority += 20;
        if (stability < 30) priority += 20;

        targets.push({
            locationId: territory.id,
            locationName: territory.name,
            priority,
            travelTime: 0 // Will be calculated per leader
        });
    }

    // Sort by priority descending
    targets.sort((a, b) => b.priority - a.priority);

    return targets;
}

/**
 * Evacuate a single leader to the best target.
 */
function evacuateLeader(
    leader: Character,
    index: number,
    targets: EvacuationTarget[],
    characters: Character[],
    locations: Location[],
    roads: any[]
): { success: boolean; updatedLeader: Character; log: string } {
    let bestTarget: EvacuationTarget | null = null;
    let bestScore = -Infinity;

    for (const target of targets) {
        const travelTime = calculateLeaderTravelTime(
            leader.locationId!,
            target.locationId,
            locations,
            roads
        );

        if (travelTime >= 999) continue; // Unreachable

        // Score = priority - travel time penalty
        const score = target.priority - (travelTime * 5);

        if (score > bestScore) {
            bestScore = score;
            bestTarget = { ...target, travelTime };
        }
    }

    if (!bestTarget) {
        return {
            success: false,
            updatedLeader: leader,
            log: `${leader.name}: No evacuation route found`
        };
    }

    if (bestTarget.travelTime > 0) {
        // Start evacuation movement
        const updatedLeader: Character = {
            ...leader,
            status: CharacterStatus.MOVING,
            destinationId: bestTarget.locationId,
            turnsUntilArrival: bestTarget.travelTime
        };

        return {
            success: true,
            updatedLeader,
            log: `${leader.name}: EVACUATING to ${bestTarget.locationName} (${bestTarget.travelTime} turns)`
        };
    } else {
        // Instant arrival (adjacent location)
        const updatedLeader: Character = {
            ...leader,
            locationId: bestTarget.locationId,
            status: CharacterStatus.AVAILABLE
        };

        return {
            success: true,
            updatedLeader,
            log: `${leader.name}: Fled to nearby ${bestTarget.locationName}`
        };
    }
}
