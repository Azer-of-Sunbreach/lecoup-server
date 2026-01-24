import { GameState, FactionId, Army } from '../../../../shared/types';
/**
 * Handle En Route Reversals
 *
 * Checks armies currently on roads. If their origin location has been captured
 * by an enemy, and their current destination is too strong to take, they reverse
 * to attempt to liberate their home base.
 *
 * @param state - Current game state
 * @param faction - Faction to process
 * @param armies - Current list of armies (modified in place if reversals occur)
 */
export declare function handleEnRouteReversals(state: GameState, faction: FactionId, armies: Army[]): void;
