import { Convoy, NavalConvoy, Location, Road } from '../../types';
import { ConvoyProcessingResult, NavalConvoyProcessingResult } from './types';
/**
 * Process land convoy movements and deliveries.
 * Convoys move one stage per turn and deliver food when they reach their destination.
 *
 * @param convoys - Current list of active convoys
 * @param roads - All roads in the game
 * @param locations - All locations (will be modified for food delivery)
 * @returns Updated convoys, locations and logs
 */
export declare function processConvoys(convoys: Convoy[], roads: Road[], locations: Location[]): ConvoyProcessingResult;
/**
 * Process naval convoy movements and deliveries.
 * Naval convoys decrement their days remaining and deliver when they arrive.
 *
 * @param navalConvoys - Current list of active naval convoys
 * @param locations - All locations (will be modified for food delivery)
 * @returns Updated naval convoys, locations and logs
 */
export declare function processNavalConvoys(navalConvoys: NavalConvoy[], locations: Location[]): NavalConvoyProcessingResult;
