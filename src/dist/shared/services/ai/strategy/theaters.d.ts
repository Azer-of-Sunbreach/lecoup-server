import { GameState, FactionId } from '../../../types';
import { AITheater } from '../types';
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
export declare function analyzeTheaters(state: GameState, faction: FactionId): AITheater[];
