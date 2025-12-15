import { Army, Location, Road, CombatState, FactionId } from '../../types';
export interface SiegeResult {
    armies: Army[];
    locations: Location[];
    roads: Road[];
    resources: {
        [key in FactionId]: {
            gold: number;
        };
    };
    logMessage: string;
}
/**
 * Handle siege construction (SIEGE choice)
 */
export declare const handleSiege: (combat: CombatState, siegeCost: number, playerFaction: FactionId, armies: Army[], locations: Location[], roads: Road[], resources: { [key in FactionId]: {
    gold: number;
}; }) => SiegeResult;
