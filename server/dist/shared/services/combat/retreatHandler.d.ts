import { Army, Location, Road, CombatState } from '../../types';
import { StructuredLogData } from './types';
export interface RetreatResult {
    armies: Army[];
    locations: Location[];
    characters: Character[];
    logMessage: string;
    logEntries?: StructuredLogData[];
}
import { Character } from '../../types';
/**
 * Handle attacker retreat (RETREAT choice)
 * FIX BUG RETRAITE 2: After retreat, advance blocked defenders one step
 */
export declare const handleAttackerRetreat: (combat: CombatState, armies: Army[], prevArmies: Army[], roads: Road[], locations: Location[], characters: Character[]) => RetreatResult;
/**
 * Handle defender retreat to linked city (RETREAT_CITY choice)
 */
export declare const handleDefenderRetreatToCity: (combat: CombatState, armies: Army[], locations: Location[], characters: Character[]) => RetreatResult;
