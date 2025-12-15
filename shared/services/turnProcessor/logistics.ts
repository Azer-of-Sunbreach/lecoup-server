// Logistics Module - Convoy processing and delivery

import { GameState, Convoy, NavalConvoy, Location, Road } from '../../types';
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
export function processConvoys(
    convoys: Convoy[],
    roads: Road[],
    locations: Location[]
): ConvoyProcessingResult {
    const logs: string[] = [];
    const updatedLocations = locations.map(l => ({ ...l }));
    const nextConvoys: Convoy[] = [];

    convoys.forEach(convoy => {
        const road = roads.find(r => r.id === convoy.roadId);
        if (!road) return;

        const nextIndex = convoy.stageIndex + (convoy.direction === 'FORWARD' ? 1 : -1);

        if (nextIndex < 0 || nextIndex >= road.stages.length) {
            // Convoy has arrived at destination
            const destCityIndex = updatedLocations.findIndex(l => l.id === convoy.destinationCityId);
            if (destCityIndex !== -1) {
                updatedLocations[destCityIndex].foodStock += convoy.foodAmount;
                logs.push(`Convoy arrived at ${updatedLocations[destCityIndex].name} with ${convoy.foodAmount} food.`);
            }
        } else {
            // Convoy continues moving
            nextConvoys.push({ ...convoy, stageIndex: nextIndex });
        }
    });

    return {
        convoys: nextConvoys,
        locations: updatedLocations,
        logs
    };
}

/**
 * Process naval convoy movements and deliveries.
 * Naval convoys decrement their days remaining and deliver when they arrive.
 * 
 * @param navalConvoys - Current list of active naval convoys
 * @param locations - All locations (will be modified for food delivery)
 * @returns Updated naval convoys, locations and logs
 */
export function processNavalConvoys(
    navalConvoys: NavalConvoy[],
    locations: Location[]
): NavalConvoyProcessingResult {
    const logs: string[] = [];
    const updatedLocations = locations.map(l => ({ ...l }));
    const nextNavalConvoys: NavalConvoy[] = [];

    navalConvoys.forEach(convoy => {
        const remaining = convoy.daysRemaining - 1;

        if (remaining <= 0) {
            // Naval convoy has arrived
            const destCityIndex = updatedLocations.findIndex(l => l.id === convoy.destinationCityId);
            if (destCityIndex !== -1) {
                updatedLocations[destCityIndex].foodStock += convoy.foodAmount;
                logs.push(`Naval convoy arrived at ${updatedLocations[destCityIndex].name} with ${convoy.foodAmount} food.`);
            }
        } else {
            // Naval convoy continues voyage
            nextNavalConvoys.push({ ...convoy, daysRemaining: remaining });
        }
    });

    return {
        navalConvoys: nextNavalConvoys,
        locations: updatedLocations,
        logs
    };
}
