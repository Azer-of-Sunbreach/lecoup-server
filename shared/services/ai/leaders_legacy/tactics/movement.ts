/**
 * Movement Tactics - Logic for moving leaders
 * 
 * Handles pathfinding and movement updates for leaders who need to travel.
 */

import { Character, GameState, CharacterStatus, FactionId } from '../../../../types';
import { calculateLeaderTravelTime } from '../../../domain/leaders';

/**
 * Moves a leader towards a target location.
 * 
 * @param leader The leader to move
 * @param targetId The destination location ID
 * @param state The current game state
 * @param reason Reason for movement (for potential logging)
 * @returns Updated character object if movement started, null if already there or failed
 */
export function moveLeaderToLocation(
    leader: Character,
    targetId: string,
    state: GameState,
    reason: string
): Character | null {
    if (leader.locationId === targetId) return null;

    // Use calculateLeaderTravelTime which properly handles:
    // - Linked city↔rural (instant, 0 turns)
    // - Naval routes (port-to-port)
    // - Land routes via roads
    // - Hybrid combinations
    const turnsToReach = calculateLeaderTravelTime(
        leader.locationId!,
        targetId,
        state.locations,
        state.roads
    );

    // If no path found (999), use a reasonable fallback
    const finalTurns = turnsToReach >= 999 ? 4 : turnsToReach;

    return {
        ...leader,
        status: CharacterStatus.MOVING,
        destinationId: targetId,
        turnsUntilArrival: finalTurns
    };
}

