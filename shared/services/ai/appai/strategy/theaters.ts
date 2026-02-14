// Theater Analysis Module - Analyze strategic theaters of operation

import { GameState, FactionId } from '../../../../types';
import { AITheater } from '../types';
import { getArmyStrength } from '../utils';

/**
 * Analyze the game map to identify theaters of operation.
 * 
 * A theater is a cluster of connected owned locations with:
 * - Border locations (adjacent enemy/neutral)
 * - Internal roads
 * - Threat level (enemy strength at borders)
 * - Army strength (friendly forces)
 * - Contested status (enemies on connecting roads)
 * 
 * @param state - Current game state
 * @param faction - Faction to analyze for
 * @returns Array of theaters
 */
export function analyzeTheaters(state: GameState, faction: FactionId): AITheater[] {
    const ownedLocs = state.locations.filter(l => l.faction === faction);
    const theaters: AITheater[] = [];
    const visited = new Set<string>();

    for (const loc of ownedLocs) {
        if (visited.has(loc.id)) continue;

        const cluster: string[] = [];
        const borders: string[] = [];
        const internalRoads: string[] = [];
        const queue = [loc.id];
        let threat = 0;
        let strength = 0;
        let contested = false;

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (visited.has(currentId)) continue;
            visited.add(currentId);
            cluster.push(currentId);

            // Strength Calculation
            const armiesHere = state.armies.filter(a =>
                a.locationId === currentId && a.faction === faction
            );
            strength += getArmyStrength(armiesHere, state.characters);

            // Check connections
            const roads = state.roads.filter(r =>
                r.from === currentId || r.to === currentId
            );

            for (const road of roads) {
                const neighborId = road.from === currentId ? road.to : road.from;
                const neighbor = state.locations.find(l => l.id === neighborId);

                // Check for enemies on road
                const enemiesOnRoad = state.armies.some(a =>
                    a.roadId === road.id && a.faction !== faction
                );
                if (enemiesOnRoad) contested = true;

                if (neighbor && neighbor.faction === faction) {
                    if (!visited.has(neighborId)) queue.push(neighborId);
                    if (!internalRoads.includes(road.id)) internalRoads.push(road.id);
                } else if (neighbor) {
                    if (!borders.includes(neighborId)) borders.push(neighborId);
                    const enemyArmies = state.armies.filter(a =>
                        a.locationId === neighborId && a.faction !== faction
                    );
                    threat += getArmyStrength(enemyArmies, state.characters);
                }
            }
        }

        theaters.push({
            id: theaters.length + 1,
            locationIds: cluster,
            borderLocationIds: borders,
            internalRoadIds: internalRoads,
            threatLevel: threat,
            armyStrength: strength,
            isContested: contested
        });
    }

    return theaters;
}
