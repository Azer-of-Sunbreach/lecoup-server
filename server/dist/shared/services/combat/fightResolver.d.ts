import { Army, Character, Location, Road, CombatState, GameStats } from '../../types';
import { StructuredLogData } from './types';
export interface FightResult {
    armies: Army[];
    locations: Location[];
    roads: Road[];
    characters: Character[];
    stats: GameStats;
    logMessage: string;
    logEntries?: StructuredLogData[];
}
/**
 * Resolve a direct combat engagement (FIGHT choice)
 */
export declare const resolveFight: (combat: CombatState, armies: Army[], characters: Character[], locations: Location[], roads: Road[], stats: GameStats, turn?: number) => FightResult;
