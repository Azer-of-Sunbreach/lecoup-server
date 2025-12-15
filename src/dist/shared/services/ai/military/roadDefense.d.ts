import { GameState, FactionId, AIMission, Army } from '../../../types';
/**
 * Handle ROAD_DEFENSE mission execution.
 *
 * Stages:
 * - GATHERING: Find army to assign
 * - MOVING: Move army to road stage
 * - GARRISONING: Army in position, build fortification if allowed
 * - COMPLETED: Fortification built or garrison established (natural defense)
 *
 * @param mission - The road defense mission
 * @param state - Current game state
 * @param faction - Faction executing
 * @param armies - Armies array (modified in place)
 * @param assigned - Set of already assigned army IDs
 */
export declare function handleRoadDefense(mission: AIMission, state: GameState, faction: FactionId, armies: Army[], assigned: Set<string>): void;
