import { GameState, FactionId, Location, Convoy, NavalConvoy } from '../../../../shared/types';
export interface LogisticsResult {
    locations: Location[];
    convoys: Convoy[];
    navalConvoys: NavalConvoy[];
}
/**
 * Manage food logistics for a faction.
 * Anticipates food shortages and sends convoys (naval or land).
 *
 * @param state - Current game state
 * @param faction - Faction to process
 * @param locations - Locations array (modified in place)
 * @param convoys - Convoys array (modified in place)
 * @param navalConvoys - Naval convoys array (modified in place)
 * @returns Updated logistics state
 */
export declare function manageLogistics(state: GameState, faction: FactionId, locations: Location[], convoys: Convoy[], navalConvoys: NavalConvoy[]): LogisticsResult;
