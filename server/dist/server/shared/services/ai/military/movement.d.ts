import { GameState, FactionId, Army } from '../../../types';
/**
 * Move a selection of armies toward a target location.
 * Handles both LOCAL roads (instant) and REGIONAL roads (staged).
 *
 * @param selection - Armies to move
 * @param targetId - Destination location ID
 * @param state - Current game state
 * @param allArmies - Reference to all armies array (modified in place)
 * @param assigned - Set of assigned army IDs
 */
export declare function moveArmiesTo(selection: Army[], targetId: string, state: GameState, allArmies: Army[], assigned: Set<string>): void;
/**
 * Pull reinforcements from other locations to a target.
 * Prioritizes biggest armies first, then closest.
 * Respects minimum garrison requirements at source locations.
 * Can split armies when needed to maximize reinforcements.
 *
 * @param targetId - Destination for reinforcements
 * @param armies - Reference to all armies array (modified in place)
 * @param state - Current game state
 * @param faction - Faction pulling reinforcements
 * @param assigned - Set of assigned army IDs
 * @param maxAmountNeeded - Maximum troops to pull (default: no limit)
 */
export declare function pullReinforcements(targetId: string, armies: Army[], state: GameState, faction: FactionId, assigned: Set<string>, maxAmountNeeded?: number): void;
