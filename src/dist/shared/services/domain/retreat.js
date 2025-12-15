"use strict";
// Retreat Logic - Handle army retreat/reverse direction
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeRetreat = executeRetreat;
/**
 * Execute a retreat/reverse command for an army.
 *
 * - If on a road: flips direction
 * - If at a location: moves onto connected road toward origin
 * - Handles edge cases like enemy-controlled origins
 *
 * @param state - Current game state
 * @param armyId - ID of the army to retreat
 * @returns Result with updated state
 */
function executeRetreat(state, armyId) {
    const army = state.armies.find(a => a.id === armyId);
    if (!army) {
        return { success: false, newState: {}, message: 'Army not found' };
    }
    let updatedArmy;
    // Case 1: Army is on a ROAD - just flip direction
    if (army.locationType === 'ROAD' && army.roadId) {
        updatedArmy = handleRoadRetreat(army);
    }
    else {
        // Case 2: Army is at a LOCATION - handle toggle logic
        updatedArmy = handleLocationRetreat(army, state);
    }
    return {
        success: true,
        newState: {
            armies: state.armies.map(a => a.id === armyId ? updatedArmy : a)
            // Retreat log removed - player action doesn't need logging
        },
        message: 'Army reversed direction'
    };
}
/**
 * Handle retreat when army is on a road - simple direction flip.
 */
function handleRoadRetreat(army) {
    const newDirection = (army.direction === 'FORWARD' ? 'BACKWARD' : 'FORWARD');
    return {
        ...army,
        direction: newDirection,
        destinationId: army.originLocationId,
        originLocationId: army.destinationId || army.originLocationId,
        isGarrisoned: false,
        action: undefined
    };
}
/**
 * Handle retreat when army is at a location - toggle between origin and destination.
 */
function handleLocationRetreat(army, state) {
    let updatedArmy = { ...army };
    const currentDest = army.destinationId || army.tripDestinationId;
    const currentOrigin = army.tripOriginId || army.originLocationId;
    // Determine new target: toggle logic
    let newTargetId = currentOrigin;
    // If already targeting origin, swap to dest
    if (army.destinationId === currentOrigin) {
        newTargetId = army.tripDestinationId || currentDest;
    }
    // Validation: Do not target self
    if (!newTargetId || newTargetId === army.locationId) {
        // Fallback: try startOfTurnPosition
        if (army.startOfTurnPosition?.type === 'ROAD' && army.startOfTurnPosition.id !== army.roadId) {
            // Limited access to stageIndex on reverse
        }
    }
    // Valid target found - move toward it
    if (newTargetId && newTargetId !== army.locationId) {
        const road = findConnectingRoad(army, newTargetId, state.roads);
        if (road) {
            if (army.locationType === 'ROAD') {
                updatedArmy = handleRoadTargetChange(army, road, newTargetId);
            }
            else {
                updatedArmy = moveOntoRoad(army, road, newTargetId);
            }
        }
        else {
            // No road - local move fallback
            updatedArmy = {
                ...updatedArmy,
                locationId: newTargetId,
                isGarrisoned: false
            };
        }
    }
    else {
        // No valid target - just flip if on road
        if (army.locationType === 'ROAD') {
            updatedArmy.direction = army.direction === 'FORWARD' ? 'BACKWARD' : 'FORWARD';
            const temp = updatedArmy.destinationId;
            updatedArmy.destinationId = updatedArmy.originLocationId;
            updatedArmy.originLocationId = temp || "";
        }
    }
    return updatedArmy;
}
function findConnectingRoad(army, targetId, roads) {
    return roads.find(r => (r.from === army.locationId && r.to === targetId) ||
        (r.to === army.locationId && r.from === targetId) ||
        (army.locationType === 'ROAD' && r.id === army.roadId));
}
function handleRoadTargetChange(army, road, newTargetId) {
    const isTargetFrom = road.from === newTargetId;
    const isTargetTo = road.to === newTargetId;
    if (isTargetFrom || isTargetTo) {
        return {
            ...army,
            destinationId: newTargetId,
            direction: isTargetFrom ? 'BACKWARD' : 'FORWARD'
        };
    }
    else {
        // Multi-hop - simple flip as fallback
        return {
            ...army,
            direction: army.direction === 'FORWARD' ? 'BACKWARD' : 'FORWARD',
            destinationId: newTargetId
        };
    }
}
function moveOntoRoad(army, road, newTargetId) {
    const stageIdx = road.from === army.locationId ? 0 : road.stages.length - 1;
    return {
        ...army,
        locationType: 'ROAD',
        roadId: road.id,
        stageIndex: stageIdx,
        locationId: null,
        destinationId: newTargetId,
        direction: road.from === army.locationId ? 'FORWARD' : 'BACKWARD',
        isGarrisoned: false
    };
}
