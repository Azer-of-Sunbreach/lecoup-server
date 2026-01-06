import { Army, Road } from '../../types';
import { RetreatPosition } from './types';
/**
 * Calculate the retreat position for an army after losing combat or choosing to retreat.
 *
 * This function handles complex retreat scenarios including:
 * - Road stage retreat (forward/backward direction)
 * - Location retreat using startOfTurnPosition
 * - Fallback to tripOriginId or adjacent friendly locations
 *
 * @param army - The army that needs to retreat
 * @param roads - All roads in the game
 * @param locations - All locations in the game
 * @returns Partial Army object with new position fields
 */
export declare const getRetreatPosition: (army: Army, roads: Road[], locations: {
    id: string;
    faction: typeof army.faction;
}[]) => RetreatPosition;
