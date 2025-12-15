import { Army, Character, Location, Road, CombatState, FactionId, GameStats } from '../../types';
export interface CascadeResult {
    armies: Army[];
    locations: Location[];
    roads: Road[];
    characters: Character[];
    stats: GameStats;
    logMessages: string[];
}
/**
 * Auto-resolve all AI vs AI battles (neither faction is player)
 * Loops until no more AI battles exist (max 10 iterations for safety)
 */
export declare const resolveAIBattleCascade: (playerFaction: FactionId, armies: Army[], characters: Character[], locations: Location[], roads: Road[], stats: GameStats) => CascadeResult;
/**
 * Filter battles to only include those involving the player
 */
export declare const getPlayerBattles: (battles: CombatState[], playerFaction: FactionId) => CombatState[];
