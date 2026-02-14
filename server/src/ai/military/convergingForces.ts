// Converging Forces Module - Calculate combined strength of armies converging to same destination
// Used by suicide prevention to avoid blocking armies that would win together

import { GameState, FactionId, Army, Road } from '../../../../shared/types';

/**
 * Calculate the number of turns until an army arrives at its destination.
 * Handles both moving armies and garrisoned armies on roads (which are temporarily halted).
 * 
 * @param army - The army to calculate arrival for
 * @param road - The road the army is on (null if at a location)
 * @returns Number of turns until arrival (0 = already at destination or will arrive this turn)
 */
export function getTurnsUntilArrival(army: Army, road: Road | null): number {
    // Army at a location = 0 turns (already there)
    if (army.locationType === 'LOCATION') {
        return 0;
    }

    if (!road) return 999; // No road data = can't calculate

    // Army on a road - calculate remaining stages
    const stageIndex = army.stageIndex ?? 0;
    
    if (army.direction === 'FORWARD') {
        // Moving from index 0 toward stages.length, destination is road.to
        // Remaining stages = total stages - current index
        // +1 because we need to exit the road to reach the location
        return road.stages.length - stageIndex;
    } else {
        // Moving from stages.length toward 0, destination is road.from
        // Remaining stages = current index + 1 (to reach index -1, i.e., exit)
        return stageIndex + 1;
    }
}

/**
 * Get the destination ID for an army.
 * For armies on roads, infer from direction if destinationId is not set.
 */
export function getArmyDestinationId(army: Army, road: Road | null): string | null {
    // Explicit destination takes priority
    if (army.destinationId) {
        return army.destinationId;
    }
    
    // For armies at locations, no destination
    if (army.locationType === 'LOCATION') {
        return null;
    }
    
    // Infer from road direction
    if (road) {
        return army.direction === 'FORWARD' ? road.to : road.from;
    }
    
    return null;
}

/**
 * Find all allied armies converging toward the same destination.
 * Groups them by their estimated turn of arrival.
 * 
 * @param destinationId - The target location ID
 * @param faction - The faction to find allied armies for
 * @param state - Current game state
 * @returns Map of turnsUntilArrival -> total strength arriving that turn
 */
export function getConvergingArmiesByTurn(
    destinationId: string,
    faction: FactionId,
    state: GameState
): Map<number, number> {
    const arrivalMap = new Map<number, number>();
    
    for (const army of state.armies) {
        if (army.faction !== faction) continue;
        
        // Case 1: Army already at the destination location
        if (army.locationType === 'LOCATION' && army.locationId === destinationId) {
            const currentStrength = arrivalMap.get(0) || 0;
            arrivalMap.set(0, currentStrength + army.strength);
            continue;
        }
        
        // Case 2: Army on a road heading to this destination
        if (army.locationType === 'ROAD' && army.roadId) {
            const road = state.roads.find(r => r.id === army.roadId);
            if (!road) continue;
            
            const armyDest = getArmyDestinationId(army, road);
            if (armyDest !== destinationId) continue;
            
            // Calculate turns until arrival
            // Note: garrisoned armies on roads are counted - they're just temporarily halted
            const turnsUntil = getTurnsUntilArrival(army, road);
            
            const currentStrength = arrivalMap.get(turnsUntil) || 0;
            arrivalMap.set(turnsUntil, currentStrength + army.strength);
        }
    }
    
    return arrivalMap;
}

/**
 * Calculate the combined strength of all allied armies that will arrive
 * at the destination within a certain number of turns.
 * 
 * @param destinationId - The target location ID
 * @param faction - The faction
 * @param state - Current game state
 * @param maxTurns - Maximum turns to look ahead (default: 1 = same turn arrivals only)
 * @returns Total combined strength arriving within maxTurns
 */
export function getCombinedConvergingStrength(
    destinationId: string,
    faction: FactionId,
    state: GameState,
    maxTurns: number = 1
): number {
    const arrivalMap = getConvergingArmiesByTurn(destinationId, faction, state);
    
    let totalStrength = 0;
    for (const [turns, strength] of arrivalMap.entries()) {
        if (turns <= maxTurns) {
            totalStrength += strength;
        }
    }
    
    return totalStrength;
}

/**
 * Get the combined strength of all allied armies that will arrive at the SAME TURN
 * as the given army.
 * 
 * This is the key function for suicide prevention:
 * - Finds all armies heading to the same destination
 * - Calculates when each army will arrive
 * - Returns the total strength of armies arriving the same turn as this army
 * 
 * @param army - The army being evaluated
 * @param destinationId - The target destination
 * @param faction - The faction
 * @param state - Current game state
 * @returns Combined strength of all armies arriving the same turn
 */
export function getSameTurnConvergingStrength(
    army: Army,
    destinationId: string,
    faction: FactionId,
    state: GameState
): number {
    // Calculate when THIS army will arrive
    let thisTurnsUntil = 0;
    
    if (army.locationType === 'ROAD' && army.roadId) {
        const road = state.roads.find(r => r.id === army.roadId);
        if (road) {
            thisTurnsUntil = getTurnsUntilArrival(army, road);
        }
    }
    
    // Get all armies converging and their arrival turns
    const arrivalMap = getConvergingArmiesByTurn(destinationId, faction, state);
    
    // Return strength of armies arriving the same turn
    return arrivalMap.get(thisTurnsUntil) || 0;
}

/**
 * Evaluate if an attack should proceed based on combined converging strength.
 * 
 * @param army - The army being evaluated
 * @param destinationId - Target destination
 * @param enemyStrength - Raw enemy troop count at destination
 * @param fortificationBonus - Defense bonus from fortifications (0 if enemy has < 500 troops)
 * @param faction - The faction
 * @param state - Current game state
 * @returns true if combined forces can win, false if should halt
 */
export function shouldConvergingForcesAttack(
    army: Army,
    destinationId: string,
    enemyStrength: number,
    fortificationBonus: number,
    faction: FactionId,
    state: GameState
): boolean {
    // Fortification only applies if enemy has >= 500 troops to man it
    const effectiveFortBonus = enemyStrength >= 500 ? fortificationBonus : 0;
    const effectiveEnemyStrength = enemyStrength + effectiveFortBonus;
    
    // Get combined strength of armies arriving the same turn
    const combinedStrength = getSameTurnConvergingStrength(army, destinationId, faction, state);
    
    // Attack if combined strength exceeds enemy effective strength
    // (no safety margin needed - the armies will fight together)
    return combinedStrength > effectiveEnemyStrength;
}
