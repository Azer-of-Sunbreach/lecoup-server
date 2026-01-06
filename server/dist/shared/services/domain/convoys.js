"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeReverseConvoy = exports.executeSendNavalConvoy = exports.executeSendConvoy = void 0;
const constants_1 = require("../../constants");
const executeSendConvoy = (state, locationId, amount, destinationId, faction) => {
    const loc = state.locations.find(l => l.id === locationId);
    if (!loc)
        return { success: false, newState: state, error: 'Location not found' };
    // Validation (simplified)
    if (loc.faction !== faction)
        return { success: false, newState: state, error: 'Not your location' };
    if (loc.foodStock < amount)
        return { success: false, newState: state, error: 'Not enough food' };
    const startRural = loc.linkedLocationId;
    const destCity = state.locations.find(l => l.id === destinationId);
    if (!destCity)
        return { success: false, newState: state, error: 'Destination not found' };
    const destRural = destCity.linkedLocationId;
    // Find road
    const road = state.roads.find(r => (r.from === startRural && r.to === destRural) || (r.to === startRural && r.from === destRural));
    if (!road)
        return { success: false, newState: state, error: 'No road connection' };
    if (!startRural)
        return { success: false, newState: state, error: 'Invalid start location' };
    const newConvoy = {
        id: `convoy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        faction,
        foodAmount: amount,
        sourceCityId: locationId,
        destinationCityId: destinationId,
        locationType: 'ROAD',
        locationId: null,
        roadId: road.id,
        stageIndex: road.from === startRural ? 0 : road.stages.length - 1,
        direction: road.from === startRural ? 'FORWARD' : 'BACKWARD',
        isCaptured: false,
        lastSafePosition: { type: 'LOCATION', id: startRural }
    };
    const newLocations = state.locations.map(l => l.id === locationId ? { ...l, foodStock: l.foodStock - amount } : l);
    return {
        success: true,
        newState: {
            ...state,
            locations: newLocations,
            convoys: [...state.convoys, newConvoy],
            logs: [...state.logs, `Convoy dispatched to ${destCity.name}.`]
        }
    };
};
exports.executeSendConvoy = executeSendConvoy;
const executeSendNavalConvoy = (state, locationId, amount, destinationId, faction) => {
    const loc = state.locations.find(l => l.id === locationId);
    if (!loc)
        return { success: false, newState: state, error: 'Location not found' };
    if (loc.faction !== faction)
        return { success: false, newState: state, error: 'Not your location' };
    if (loc.foodStock < amount)
        return { success: false, newState: state, error: 'Not enough food' };
    if (!loc.isCoastal)
        return { success: false, newState: state, error: 'Location not coastal' };
    const destCity = state.locations.find(l => l.id === destinationId);
    if (!destCity)
        return { success: false, newState: state, error: 'Destination not found' };
    if (!destCity.isCoastal)
        return { success: false, newState: state, error: 'Destination not coastal' };
    const days = (0, constants_1.getNavalTravelTime)(locationId, destinationId);
    const newNavalConvoy = {
        id: `naval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        faction,
        foodAmount: amount,
        sourceCityId: locationId,
        destinationCityId: destinationId,
        daysRemaining: days
    };
    const newLocations = state.locations.map(l => l.id === locationId ? { ...l, foodStock: l.foodStock - amount } : l);
    return {
        success: true,
        newState: {
            ...state,
            locations: newLocations,
            navalConvoys: [...state.navalConvoys, newNavalConvoy],
            logs: [...state.logs, `Naval convoy dispatched to ${destCity.name}.`]
        }
    };
};
exports.executeSendNavalConvoy = executeSendNavalConvoy;
const executeReverseConvoy = (state, convoyId, faction) => {
    const convoy = state.convoys.find(c => c.id === convoyId);
    if (!convoy)
        return { success: false, newState: state, error: 'Convoy not found' };
    if (convoy.faction !== faction)
        return { success: false, newState: state, error: 'Not your convoy' };
    const newConvoys = state.convoys.map(c => {
        if (c.id === convoyId) {
            return {
                ...c,
                direction: c.direction === 'FORWARD' ? 'BACKWARD' : 'FORWARD',
                sourceCityId: c.destinationCityId,
                destinationCityId: c.sourceCityId
            }; // Explicit cast to help TS
        }
        return c;
    });
    return {
        success: true,
        newState: {
            ...state,
            convoys: newConvoys
        }
    };
};
exports.executeReverseConvoy = executeReverseConvoy;
