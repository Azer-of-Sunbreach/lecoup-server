import { GameState, FactionId, Location, Convoy, NavalConvoy } from '../../../../shared/types';
export interface LogisticsResult {
    locations: Location[];
    convoys: Convoy[];
    navalConvoys: NavalConvoy[];
}
/**
 * Manage food logistics for a faction.
 * Anticipates food shortages and sends convoys (naval or land).
 * Uses smart routing to find the fastest path: naval, land, or hybrid.
 */
export declare function manageLogistics(state: GameState, faction: FactionId, locations: Location[], convoys: Convoy[], navalConvoys: NavalConvoy[]): LogisticsResult;
