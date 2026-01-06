"use strict";
// Logistics Module - Food convoy management
Object.defineProperty(exports, "__esModule", { value: true });
exports.manageLogistics = manageLogistics;
const types_1 = require("../../../../shared/types");
const constants_1 = require("../../../../shared/constants");
const utils_1 = require("../utils");
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
function manageLogistics(state, faction, locations, convoys, navalConvoys) {
    const myCities = locations.filter(l => l.faction === faction && l.type === types_1.LocationType.CITY);
    for (const city of myCities) {
        const needsFood = checkFoodNeed(city, faction, convoys, navalConvoys);
        if (needsFood.needsFood) {
            const navalSent = tryNavalConvoy(city, myCities, faction, needsFood.neededAmount, locations, navalConvoys);
            if (!navalSent) {
                tryLandConvoy(city, myCities, faction, needsFood.neededAmount, state, locations, convoys);
            }
        }
    }
    return { locations, convoys, navalConvoys };
}
function checkFoodNeed(city, faction, convoys, navalConvoys) {
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
function tryNavalConvoy(targetCity, myCities, faction, neededAmount, locations, navalConvoys) {
    if (!constants_1.PORT_SEQUENCE.includes(targetCity.id))
        return false;
    const portSources = myCities.filter(c => c.id !== targetCity.id &&
        constants_1.PORT_SEQUENCE.includes(c.id) &&
        c.foodStock > 100);
    if (portSources.length === 0)
        return false;
    const bestSource = portSources.sort((a, b) => b.foodStock - a.foodStock)[0];
    const safetyBuffer = bestSource.foodIncome > 0 ? 50 : 150;
    const availableToSend = bestSource.foodStock - safetyBuffer;
    const amount = Math.min(neededAmount, availableToSend);
    if (amount <= 50)
        return false;
    const days = (0, constants_1.getNavalTravelTime)(bestSource.id, targetCity.id);
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
function tryLandConvoy(targetCity, myCities, faction, neededAmount, state, locations, convoys) {
    const sources = myCities.filter(l => l.id !== targetCity.id && l.foodStock > 100);
    let bestSource = null;
    let shortestPath = null;
    let bestSourceAmount = 0;
    for (const source of sources) {
        const safetyBuffer = source.foodIncome > 0 ? 60 : 150;
        const available = source.foodStock - safetyBuffer;
        if (available > 50) {
            const path = (0, utils_1.findSafePath)(source.id, targetCity.id, state, faction);
            if (path && path.length > 0) {
                if (!shortestPath || path.length < shortestPath.length) {
                    shortestPath = path;
                    bestSource = source.id;
                    bestSourceAmount = Math.min(neededAmount, available);
                }
            }
        }
    }
    if (!bestSource || !shortestPath || bestSourceAmount <= 0)
        return false;
    const sourceLoc = locations.find(l => l.id === bestSource);
    const sourceRuralId = sourceLoc.linkedLocationId;
    if (!sourceRuralId)
        return false;
    sourceLoc.foodStock -= bestSourceAmount;
    const roadId = shortestPath[0];
    const road = state.roads.find(r => r.id === roadId);
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
