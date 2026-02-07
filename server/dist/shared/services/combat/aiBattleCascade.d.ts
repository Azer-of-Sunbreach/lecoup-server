import { Army, Character, Location, Road, CombatState, FactionId, GameStats } from '../../types';
import { StructuredLogData } from './types';
export interface CascadeResult {
    armies: Army[];
    locations: Location[];
    roads: Road[];
    characters: Character[];
    stats: GameStats;
    logMessages: string[];
    logEntries?: StructuredLogData[];
}
/**
 * Auto-resolve all AI vs AI battles (neither faction is player)
 * Loops until no more AI battles exist (max 10 iterations for safety)
 *
 * @param playerFaction - The player's faction (or AI faction in multiplayer)
 * @param armies - Current armies
 * @param characters - Current characters
 * @param locations - Current locations
 * @param roads - Current roads
 * @param stats - Current game stats
 * @param humanFactions - Array of human-controlled factions (for multiplayer)
 */
export declare const resolveAIBattleCascade: (playerFaction: FactionId, armies: Army[], characters: Character[], locations: Location[], roads: Road[], stats: GameStats, humanFactions?: FactionId[]) => CascadeResult;
/**
 * Filter battles to only include those involving the player
 */
export declare const getPlayerBattles: (battles: CombatState[], playerFaction: FactionId) => CombatState[];
