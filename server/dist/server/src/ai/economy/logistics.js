"use strict";
// Logistics Module - Food convoy management
Object.defineProperty(exports, "__esModule", { value: true });
exports.manageLogistics = manageLogistics;
const types_1 = require("../../../../shared/types");
const constants_1 = require("../../../../shared/constants");
const ports_1 = require("../../../../shared/data/ports");
const utils_1 = require("../utils");
/**
 * Manage food logistics for a faction.
 * Anticipates food shortages and sends convoys (naval or land).
 * Uses smart routing to find the fastest path: naval, land, or hybrid.
 */
function manageLogistics(state, faction, locations, convoys, navalConvoys) {
    const myCities = locations.filter(l => l.faction === faction && l.type === types_1.LocationType.CITY);
    for (const city of myCities) {
        const needsFood = checkFoodNeed(city, faction, convoys, navalConvoys);
        if (needsFood.needsFood) {
            // Try to find the BEST route (fastest) among all options
            const bestRoute = findBestRoute(city, myCities, faction, needsFood.neededAmount, state, locations);
            if (bestRoute) {
                if (bestRoute.type === 'NAVAL') {
                    // Direct naval convoy
                    sendNavalConvoy(bestRoute.source, city, bestRoute.amount, faction, navalConvoys);
                }
                else if (bestRoute.type === 'LAND') {
                    // Pure land convoy
                    sendLandConvoy(bestRoute.source, city, bestRoute.amount, bestRoute.path, faction, state, convoys);
                }
                else if (bestRoute.type === 'HYBRID') {
                    // Hybrid: Naval to transit port, then land convoy from there
                    // Step 1: Send naval convoy to transit port (food will be redistributed next turn)
                    sendNavalConvoy(bestRoute.source, bestRoute.transitPort, bestRoute.amount, faction, navalConvoys);
                    console.log(`[AI HYBRID ROUTE] Naval: ${bestRoute.source.id} → ${bestRoute.transitPort.id} (${bestRoute.navalCost} turns), then land → ${city.id} (${bestRoute.landCost} stages)`);
                }
            }
        }
    }
    return { locations, convoys, navalConvoys };
}
/**
 * Find the best route (fastest) to deliver food to target city.
 * Considers: direct naval, pure land, and hybrid (naval + land) routes.
 */
function findBestRoute(targetCity, myCities, faction, neededAmount, state, locations) {
    const sources = myCities.filter(c => c.id !== targetCity.id && c.foodStock > 100);
    let bestRoute = null;
    let bestCost = Infinity;
    const targetRuralId = targetCity.linkedLocationId;
    const isTargetPort = (0, ports_1.isPort)(targetCity.id);
    for (const source of sources) {
        const safetyBuffer = source.foodIncome > 0 ? 60 : 150;
        const available = source.foodStock - safetyBuffer;
        if (available <= 50)
            continue;
        const amount = Math.min(neededAmount, available);
        const isSourcePort = (0, ports_1.isPort)(source.id);
        const sourceRuralId = source.linkedLocationId;
        // Option 1: Direct naval (both are ports)
        if (isSourcePort && isTargetPort) {
            const navalCost = (0, constants_1.getNavalTravelTime)(source.id, targetCity.id);
            if (navalCost < bestCost) {
                bestCost = navalCost;
                bestRoute = { type: 'NAVAL', source, amount, cost: navalCost };
            }
        }
        // Option 2: Pure land route
        if (sourceRuralId && targetRuralId) {
            const path = (0, utils_1.findSafePath)(sourceRuralId, targetRuralId, state, faction);
            if (path && path.length > 0) {
                const filteredPath = path.filter(roadId => {
                    const road = state.roads.find(r => r.id === roadId);
                    return road && road.stages.length > 0;
                });
                if (filteredPath.length > 0) {
                    // Calculate land cost: sum of all stages
                    const landCost = filteredPath.reduce((total, roadId) => {
                        const road = state.roads.find(r => r.id === roadId);
                        return total + (road ? road.stages.length : 1);
                    }, 0);
                    if (landCost < bestCost) {
                        bestCost = landCost;
                        bestRoute = { type: 'LAND', source, amount, cost: landCost, path: filteredPath };
                    }
                }
            }
        }
        // Option 3: Hybrid (source is port, target is inland) - via intermediate port
        if (isSourcePort && !isTargetPort && targetRuralId) {
            // Find all friendly ports that could serve as transit
            const transitPorts = myCities.filter(p => (0, ports_1.isPort)(p.id) &&
                p.id !== source.id &&
                p.id !== targetCity.id);
            for (const transitPort of transitPorts) {
                const transitRuralId = transitPort.linkedLocationId;
                if (!transitRuralId)
                    continue;
                // Calculate: naval to transit + land from transit to target
                const navalToTransit = (0, constants_1.getNavalTravelTime)(source.id, transitPort.id);
                const landPath = (0, utils_1.findSafePath)(transitRuralId, targetRuralId, state, faction);
                if (landPath && landPath.length > 0) {
                    const filteredLandPath = landPath.filter(roadId => {
                        const road = state.roads.find(r => r.id === roadId);
                        return road && road.stages.length > 0;
                    });
                    if (filteredLandPath.length > 0) {
                        const landCost = filteredLandPath.reduce((total, roadId) => {
                            const road = state.roads.find(r => r.id === roadId);
                            return total + (road ? road.stages.length : 1);
                        }, 0);
                        const totalCost = navalToTransit + landCost;
                        if (totalCost < bestCost) {
                            bestCost = totalCost;
                            bestRoute = {
                                type: 'HYBRID',
                                source,
                                transitPort,
                                amount,
                                navalCost: navalToTransit,
                                landCost,
                                landPath: filteredLandPath
                            };
                        }
                    }
                }
            }
        }
    }
    return bestRoute;
}
/**
 * Send a naval convoy from source to destination.
 */
function sendNavalConvoy(source, destination, amount, faction, navalConvoys) {
    source.foodStock -= amount;
    const days = (0, constants_1.getNavalTravelTime)(source.id, destination.id);
    navalConvoys.push({
        id: `ai_naval_${Math.random()}`,
        faction,
        foodAmount: amount,
        sourceCityId: source.id,
        destinationCityId: destination.id,
        daysRemaining: days
    });
    console.log(`[AI CONVOY] Naval: ${source.id} → ${destination.id}, amount=${amount}, turns=${days}`);
}
/**
 * Send a land convoy from source to destination.
 */
function sendLandConvoy(source, destination, amount, path, faction, state, convoys) {
    const sourceRuralId = source.linkedLocationId;
    if (!sourceRuralId || path.length === 0)
        return;
    source.foodStock -= amount;
    const roadId = path[0];
    const road = state.roads.find(r => r.id === roadId);
    convoys.push({
        id: `ai_convoy_${Math.random()}`,
        faction,
        foodAmount: amount,
        sourceCityId: source.id,
        destinationCityId: destination.id,
        locationType: 'ROAD',
        roadId: roadId,
        stageIndex: road.from === sourceRuralId ? 0 : road.stages.length - 1,
        direction: road.from === sourceRuralId ? 'FORWARD' : 'BACKWARD',
        isCaptured: false,
        locationId: null,
        lastSafePosition: { type: 'LOCATION', id: sourceRuralId },
        path: path,
        pathIndex: 0
    });
    console.log(`[AI CONVOY] Land: ${source.id} → ${destination.id}, amount=${amount}, path=${path.join(' -> ')}`);
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
