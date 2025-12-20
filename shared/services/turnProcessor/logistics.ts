// Logistics Module - Convoy processing and delivery

import { GameState, Convoy, NavalConvoy, Location, Road, LogEntry } from '../../types';
import { ConvoyProcessingResult, NavalConvoyProcessingResult } from './types';
import { createConvoyArrivalLog, createNavalConvoyArrivalLog } from '../logs/logFactory';

/**
 * Process land convoy movements and deliveries.
 * Convoys move one stage per turn and deliver food when they reach their destination.
 * 
 * @param convoys - Current list of active convoys
 * @param roads - All roads in the game
 * @param locations - All locations (will be modified for food delivery)
 * @param currentTurn - Current game turn for log creation
 * @returns Updated convoys, locations and logs
 */
export function processConvoys(
    convoys: Convoy[],
    roads: Road[],
    locations: Location[],
    currentTurn: number = 1
): ConvoyProcessingResult {
    const logs: LogEntry[] = [];
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
                const arrivalLog = createConvoyArrivalLog(
                    updatedLocations[destCityIndex].name,
                    convoy.foodAmount,
                    currentTurn
                );
                logs.push(arrivalLog);
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
 * @param currentTurn - Current game turn for log creation
 * @returns Updated naval convoys, locations and logs
 */
export function processNavalConvoys(
    navalConvoys: NavalConvoy[],
    locations: Location[],
    currentTurn: number = 1
): NavalConvoyProcessingResult {
    const logs: LogEntry[] = [];
    const updatedLocations = locations.map(l => ({ ...l }));
    const nextNavalConvoys: NavalConvoy[] = [];

    navalConvoys.forEach(convoy => {
        const remaining = convoy.daysRemaining - 1;

        if (remaining <= 0) {
            // Naval convoy has arrived
            const destCityIndex = updatedLocations.findIndex(l => l.id === convoy.destinationCityId);
            if (destCityIndex !== -1) {
                updatedLocations[destCityIndex].foodStock += convoy.foodAmount;
                const navalArrivalLog = createNavalConvoyArrivalLog(
                    updatedLocations[destCityIndex].name,
                    convoy.foodAmount,
                    currentTurn
                );
                logs.push(navalArrivalLog);
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
