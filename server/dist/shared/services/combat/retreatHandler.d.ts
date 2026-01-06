import { Army, Location, Road, CombatState } from '../../types';
export interface RetreatResult {
    armies: Army[];
    locations: Location[];
    logMessage: string;
}
/**
 * Handle attacker retreat (RETREAT choice)
 */
export declare const handleAttackerRetreat: (combat: CombatState, armies: Army[], prevArmies: Army[], roads: Road[], locations: Location[]) => RetreatResult;
/**
 * Handle defender retreat to linked city (RETREAT_CITY choice)
 */
export declare const handleDefenderRetreatToCity: (combat: CombatState, armies: Army[], locations: Location[]) => RetreatResult;
