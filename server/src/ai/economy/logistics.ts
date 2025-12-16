// Logistics Module - Food convoy management

import { GameState, FactionId, Location, LocationType, Convoy, NavalConvoy } from '../../../../shared/types';
import { PORT_SEQUENCE, getNavalTravelTime } from '../../../../shared/constants';
import { findSafePath } from '../utils';

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
export function manageLogistics(
    state: GameState,
    faction: FactionId,
    locations: Location[],
    convoys: Convoy[],
    navalConvoys: NavalConvoy[]
): LogisticsResult {
    const myCities = locations.filter(l =>
        l.faction === faction && l.type === LocationType.CITY
    );

    for (const city of myCities) {
        const needsFood = checkFoodNeed(city, faction, convoys, navalConvoys);

        if (needsFood.needsFood) {
            const navalSent = tryNavalConvoy(
                city, myCities, faction, needsFood.neededAmount,
                locations, navalConvoys
            );

            if (!navalSent) {
                tryLandConvoy(
                    city, myCities, faction, needsFood.neededAmount,
                    state, locations, convoys
                );
            }
        }
    }

    return { locations, convoys, navalConvoys };
}

interface FoodNeedResult {
    needsFood: boolean;
    neededAmount: number;
}

function checkFoodNeed(
    city: Location,
    faction: FactionId,
    convoys: Convoy[],
    navalConvoys: NavalConvoy[]
): FoodNeedResult {
    // Calculate incoming food from convoys
    const incoming = convoys
        .filter(c => c.destinationCityId === city.id && c.faction === faction)
        .reduce((sum, c) => sum + c.foodAmount, 0) +
        navalConvoys
            .filter(c => c.destinationCityId === city.id && c.faction === faction)
            .reduce((sum, c) => sum + c.foodAmount, 0);

    // Projected Stock at T+4
    const consumption = city.foodIncome < 0 ? Math.abs(city.foodIncome) : 0;
    const projectedStock = city.foodStock + incoming - (consumption * 4);

    const needsFood = projectedStock < 100;
    const neededAmount = Math.max(100, 400 - (city.foodStock + incoming));

    return { needsFood, neededAmount };
}

function tryNavalConvoy(
    targetCity: Location,
    myCities: Location[],
    faction: FactionId,
    neededAmount: number,
    locations: Location[],
    navalConvoys: NavalConvoy[]
): boolean {
    if (!PORT_SEQUENCE.includes(targetCity.id)) return false;

    const portSources = myCities.filter(c =>
        c.id !== targetCity.id &&
        PORT_SEQUENCE.includes(c.id) &&
        c.foodStock > 100
    );

    if (portSources.length === 0) return false;

    const bestSource = portSources.sort((a, b) => b.foodStock - a.foodStock)[0];
    const safetyBuffer = bestSource.foodIncome > 0 ? 50 : 150;
    const availableToSend = bestSource.foodStock - safetyBuffer;
    const amount = Math.min(neededAmount, availableToSend);

    if (amount <= 50) return false;

    const days = getNavalTravelTime(bestSource.id, targetCity.id);

    bestSource.foodStock -= amount;
    navalConvoys.push({
        id: `ai_naval_${Math.random()}`,
        faction,
        foodAmount: amount,
        sourceCityId: bestSource.id,
        destinationCityId: targetCity.id,
        daysRemaining: days
    });

    return true;
}

function tryLandConvoy(
    targetCity: Location,
    myCities: Location[],
    faction: FactionId,
    neededAmount: number,
    state: GameState,
    locations: Location[],
    convoys: Convoy[]
): boolean {
    const sources = myCities.filter(l => l.id !== targetCity.id && l.foodStock > 100);
    let bestSource: string | null = null;
    let shortestPath: string[] | null = null;
    let bestSourceAmount = 0;

    for (const source of sources) {
        const safetyBuffer = source.foodIncome > 0 ? 60 : 150;
        const available = source.foodStock - safetyBuffer;

        if (available > 50) {
            const path = findSafePath(source.id, targetCity.id, state, faction);
            if (path && path.length > 0) {
                if (!shortestPath || path.length < shortestPath.length) {
                    shortestPath = path;
                    bestSource = source.id;
                    bestSourceAmount = Math.min(neededAmount, available);
                }
            }
        }
    }

    if (!bestSource || !shortestPath || bestSourceAmount <= 0) return false;

    const sourceLoc = locations.find(l => l.id === bestSource)!;
    const sourceRuralId = sourceLoc.linkedLocationId;

    if (!sourceRuralId) return false;

    sourceLoc.foodStock -= bestSourceAmount;
    const roadId = shortestPath[0];
    const road = state.roads.find(r => r.id === roadId)!;

    convoys.push({
        id: `ai_convoy_${Math.random()}`,
        faction,
        foodAmount: bestSourceAmount,
        sourceCityId: sourceLoc.id,
        destinationCityId: targetCity.id,
        locationType: 'ROAD',
        roadId: roadId,
        stageIndex: road.from === sourceRuralId ? 0 : road.stages.length - 1,
        direction: road.from === sourceRuralId ? 'FORWARD' : 'BACKWARD',
        isCaptured: false,
        locationId: null,
        lastSafePosition: { type: 'LOCATION', id: sourceRuralId }
    });

    return true;
}
