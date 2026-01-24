import { GameState, FactionId, Convoy, NavalConvoy } from '../../types';
import { getNavalTravelTime } from '../../constants';
import { createConvoyDispatchedLog, createNavalConvoyDispatchedLog } from '../logs/logFactory';

export const executeSendConvoy = (
    state: GameState,
    locationId: string,
    amount: number,
    destinationId: string,
    faction: FactionId
): { success: boolean; newState: GameState; error?: string } => {
    const loc = state.locations.find(l => l.id === locationId);
    if (!loc) return { success: false, newState: state, error: 'Location not found' };

    // Validation: Cannot send convoy to itself
    if (locationId === destinationId) return { success: false, newState: state, error: 'Cannot send convoy to same location' };

    // Validation (simplified)
    if (loc.faction !== faction) return { success: false, newState: state, error: 'Not your location' };
    if (loc.foodStock < amount) return { success: false, newState: state, error: 'Not enough food' };

    const startRural = loc.linkedLocationId;
    const destCity = state.locations.find(l => l.id === destinationId);
    if (!destCity) return { success: false, newState: state, error: 'Destination not found' };
    const destRural = destCity.linkedLocationId;

    // Find road
    const road = state.roads.find(r => (r.from === startRural && r.to === destRural) || (r.to === startRural && r.from === destRural));

    if (!road) return { success: false, newState: state, error: 'No road connection' };

    if (!startRural) return { success: false, newState: state, error: 'Invalid start location' };

    const newConvoy: Convoy = {
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

    const newLocations = state.locations.map(l =>
        l.id === locationId ? { ...l, foodStock: l.foodStock - amount } : l
    );

    return {
        success: true,
        newState: {
            ...state,
            locations: newLocations,
            convoys: [...state.convoys, newConvoy],
            logs: [...state.logs, createConvoyDispatchedLog(state.turn)]
        }
    };
};

export const executeSendNavalConvoy = (
    state: GameState,
    locationId: string,
    amount: number,
    destinationId: string,
    faction: FactionId
): { success: boolean; newState: GameState; error?: string } => {
    const loc = state.locations.find(l => l.id === locationId);
    if (!loc) {
        console.log(`[NAVAL] Failed: Location not found (${locationId})`);
        return { success: false, newState: state, error: 'Location not found' };
    }

    if (loc.faction !== faction) return { success: false, newState: state, error: 'Not your location' };
    if (loc.foodStock < amount) {
        console.log(`[NAVAL] Failed: Insufficient food at ${locationId}. Has ${loc.foodStock}, needs ${amount}`);
        return { success: false, newState: state, error: 'Not enough food' };
    }
    // Check if location is coastal (or its linked rural area is)
    let isSourceCoastal = loc.isCoastal;
    if (!isSourceCoastal && loc.linkedLocationId) {
        const rural = state.locations.find(l => l.id === loc.linkedLocationId);
        if (rural && rural.isCoastal) isSourceCoastal = true;
    }
    if (!isSourceCoastal) return { success: false, newState: state, error: 'Location not coastal' };

    const destCity = state.locations.find(l => l.id === destinationId);
    if (!destCity) {
        console.log(`[NAVAL] Failed: Destination not found (${destinationId})`);
        return { success: false, newState: state, error: 'Destination not found' };
    }

    // Check if destination is coastal
    let isDestCoastal = destCity.isCoastal;
    if (!isDestCoastal && destCity.linkedLocationId) {
        const destRural = state.locations.find(l => l.id === destCity.linkedLocationId);
        if (destRural && destRural.isCoastal) isDestCoastal = true;
    }

    if (!isDestCoastal) return { success: false, newState: state, error: 'Destination not coastal' };

    const days = getNavalTravelTime(locationId, destinationId);

    const newNavalConvoy: NavalConvoy = {
        id: `naval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        faction,
        foodAmount: amount,
        sourceCityId: locationId,
        destinationCityId: destinationId,
        daysRemaining: days
    };

    const newLocations = state.locations.map(l =>
        l.id === locationId ? { ...l, foodStock: l.foodStock - amount } : l
    );

    return {
        success: true,
        newState: {
            ...state,
            locations: newLocations,
            navalConvoys: [...state.navalConvoys, newNavalConvoy],
            logs: [...state.logs, createNavalConvoyDispatchedLog(state.turn)]
        }
    };
};

export const executeReverseConvoy = (
    state: GameState,
    convoyId: string,
    faction: FactionId
): { success: boolean; newState: GameState; error?: string } => {
    const convoy = state.convoys.find(c => c.id === convoyId);
    if (!convoy) return { success: false, newState: state, error: 'Convoy not found' };
    if (convoy.faction !== faction) return { success: false, newState: state, error: 'Not your convoy' };

    const newConvoys = state.convoys.map(c => {
        if (c.id === convoyId) {
            return {
                ...c,
                direction: c.direction === 'FORWARD' ? 'BACKWARD' : 'FORWARD',
                sourceCityId: c.destinationCityId,
                destinationCityId: c.sourceCityId
            } as Convoy; // Explicit cast to help TS
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
