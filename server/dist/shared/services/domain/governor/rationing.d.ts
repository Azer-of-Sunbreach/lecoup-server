/**
 * rationing.ts - Domain service for "Rationing" governor policy
 *
 * Effect: Reduces food consumption by 50% (implemented as supply bonus in territorialStats)
 * Downside: Reduces stability and increases resentment per turn
 * Not available: Rural areas
 */
import { Location, Character } from '../../../types';
export declare function isRationingActive(location: Location): boolean;
export declare function shouldDisableRationing(location: Location): {
    shouldDisable: boolean;
    reason?: 'rural_area';
};
export declare function processRationing(governor: Character, location: Location): Location;
