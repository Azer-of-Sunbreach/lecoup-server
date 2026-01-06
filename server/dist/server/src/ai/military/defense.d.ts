import { GameState, FactionId, Army, AIMission } from '../../../../shared/types';
/**
 * Handle a DEFEND mission for a faction.
 *
 * Responsibilities:
 * - Garrison troops at the target location
 * - Execute sortie if we dominate besiegers
 * - Pull reinforcements if under-strength
 * - Deploy screen forces to adjacent road stages
 *
 * @param mission - The DEFEND mission to process
 * @param state - Current game state
 * @param faction - Faction executing the mission
 * @param armies - Reference to all armies array (modified in place)
 * @param assigned - Set of assigned army IDs
 */
export declare function handleDefense(mission: AIMission, state: GameState, faction: FactionId, armies: Army[], assigned: Set<string>): void;
