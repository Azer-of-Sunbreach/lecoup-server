import { GameState, FactionId, Army } from '../../../../shared/types';
/**
 * Handle idle armies that are not assigned to any mission.
 *
 * Priority:
 * 1. Respect garrison requirements at current location
 * 2. Join nearest active campaign
 * 3. Redeploy to strategic locations
 *
 * @param state - Current game state
 * @param faction - Faction to process
 * @param armies - Reference to all armies array (modified in place)
 * @param assigned - Set of already-assigned army IDs
 */
export declare function handleIdleArmies(state: GameState, faction: FactionId, armies: Army[], assigned: Set<string>): void;
