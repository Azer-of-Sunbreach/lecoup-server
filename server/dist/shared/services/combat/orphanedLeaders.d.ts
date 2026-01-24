import { Character, CombatState, Army, Location, Road, FactionId } from '../../types';
export interface OrphanedLeaderResult {
    updatedCharacters: Character[];
}
interface OrphanedLeaderContext {
    combat: CombatState;
    winningFaction: FactionId;
    locations: Location[];
    roads: Road[];
}
/**
 * Process orphaned leaders from winning armies that were destroyed in combat.
 *
 * Unlike processLeaderSurvival (which handles LOSING faction leaders),
 * this function handles leaders of the WINNING faction whose armies were
 * destroyed due to heavy losses (Pyrrhic victory scenario).
 *
 * These leaders always survive and are placed appropriately:
 * - On location: detached and placed at that location
 * - On road stage: attached to surviving same-faction army, or moved to nearest rural
 *
 * @param removedArmyIds - IDs of armies that were destroyed (strength <= 0)
 * @param survivingArmies - Armies that survived the battle
 * @param characters - Current list of all characters
 * @param context - Combat context (winning faction, locations, roads)
 * @returns Updated characters array
 */
export declare const processOrphanedLeaders: (removedArmyIds: string[], survivingArmies: Army[], characters: Character[], context: OrphanedLeaderContext) => OrphanedLeaderResult;
export {};
