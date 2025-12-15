import { GameState, FactionId, Army, AIMission } from '../../../types';
import { FactionPersonality } from '../types';
/**
 * Handle a CAMPAIGN mission - the core offensive operation.
 *
 * Campaign stages: GATHERING -> MOVING -> SIEGING -> ASSAULTING -> COMPLETED
 *
 * Supports CONVERGENT campaigns (multi-staging) where armies from multiple
 * staging points converge on the same target simultaneously.
 *
 * @param mission - The CAMPAIGN mission to process
 * @param state - Current game state
 * @param faction - Faction executing the mission
 * @param armies - Reference to all armies array (modified in place)
 * @param assigned - Set of assigned army IDs
 * @param profile - Faction personality profile
 */
export declare function handleCampaign(mission: AIMission, state: GameState, faction: FactionId, armies: Army[], assigned: Set<string>, profile: FactionPersonality): void;
