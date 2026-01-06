/**
 * AI Utilities - Pathfinding and shared helpers
 * 
 * Migrated from Application/services/ai/utils.ts
 */

import { GameState, FactionId } from '../../types';

/**
 * Finds a safe path between two locations for a faction leader.
 * Avoids enemy armies if possible.
 * 
 * @param startId Starting location ID
 * @param endId Destination location ID
 * @param state Current game state
 * @param faction Faction of the leader (to identify enemies)
 * @returns Array of road IDs forming the path, or null if no path
 */
export function findSafePath(
    startId: string,
    endId: string,
    state: GameState,
    faction: FactionId
): string[] | null {
    if (startId === endId) return [];

    // Dijkstra's algorithm
    const distances = new Map<string, number>();
    const previous = new Map<string, { roadId: string, fromNode: string }>();
    const unvisited = new Set<string>();

    // Initialize
    state.locations.forEach(l => {
        distances.set(l.id, Infinity);
        unvisited.add(l.id);
    });
    distances.set(startId, 0);

    while (unvisited.size > 0) {
        // Find closest unvisited node
        let currentId: string | null = null;
        let minDist = Infinity;

        for (const id of unvisited) {
            const dist = distances.get(id) || Infinity;
            if (dist < minDist) {
                minDist = dist;
                currentId = id;
            }
        }

        if (currentId === null || minDist === Infinity) break; // No reachable nodes left
        if (currentId === endId) break; // Reached target

        unvisited.delete(currentId);

        const currentLoc = state.locations.find(l => l.id === currentId);

        // === LINKED LOCATION: City ↔ Rural (instant travel, 0 cost) ===
        if (currentLoc?.linkedLocationId && unvisited.has(currentLoc.linkedLocationId)) {
            const alt = distances.get(currentId)!;
            if (alt < distances.get(currentLoc.linkedLocationId)!) {
                distances.set(currentLoc.linkedLocationId, alt);
                previous.set(currentLoc.linkedLocationId, { roadId: '__LINKED__', fromNode: currentId });
            }
        }

        // Check if any other location links TO this one (reverse link)
        const reverseLinked = state.locations.find(l => l.linkedLocationId === currentId);
        if (reverseLinked && unvisited.has(reverseLinked.id)) {
            const alt = distances.get(currentId)!;
            if (alt < distances.get(reverseLinked.id)!) {
                distances.set(reverseLinked.id, alt);
                previous.set(reverseLinked.id, { roadId: '__LINKED__', fromNode: currentId });
            }
        }

        // === ROAD NEIGHBORS ===
        const roads = state.roads.filter(r => r.from === currentId || r.to === currentId);

        for (const road of roads) {
            const neighborId = road.from === currentId ? road.to : road.from;
            if (!unvisited.has(neighborId)) continue; // Already visited

            // Calculate cost (danger)
            let cost = road.travelTurns || 1;

            // Check for unsafe location (enemy controlled)
            const neighborLoc = state.locations.find(l => l.id === neighborId);
            if (neighborLoc && neighborLoc.faction !== faction && neighborLoc.faction !== 'NEUTRAL') {
                cost += 10; // High penalty for enemy territory
            }

            // Check for enemy armies on road or at destination
            const enemyArmies = state.armies.filter(a =>
                a.faction !== faction &&
                a.faction !== 'NEUTRAL' &&
                (a.locationId === neighborId) // Simplified check
            );
            if (enemyArmies.length > 0) {
                cost += 50; // Very high penalty for enemy armies
            }

            const alt = distances.get(currentId)! + cost;
            if (alt < distances.get(neighborId)!) {
                distances.set(neighborId, alt);
                previous.set(neighborId, { roadId: road.id, fromNode: currentId });
            }
        }
    }

    // Reconstruct path
    if (distances.get(endId) === Infinity) return null;

    const path: string[] = [];
    let current = endId;
    while (current !== startId) {
        const prev = previous.get(current);
        if (!prev) return null;
        path.unshift(prev.roadId);
        current = prev.fromNode;
    }

    return path;
}
