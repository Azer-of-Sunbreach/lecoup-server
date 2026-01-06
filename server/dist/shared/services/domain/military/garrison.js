"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeGarrison = void 0;
const executeGarrison = (state, armyId, faction) => {
    // Find army
    const army = state.armies.find(a => a.id === armyId);
    if (!army)
        return { success: false, newState: state, error: 'Army not found' };
    if (army.faction !== faction)
        return { success: false, newState: state, error: 'Not your army' };
    const newGarrisonState = !army.isGarrisoned;
    let updates = { isGarrisoned: newGarrisonState };
    // Fix Anomaly (Road Movement): If un-garrisoning on road ("Forward"), ensure destination matches direction
    if (!newGarrisonState && army.locationType === 'ROAD' && army.roadId) {
        if (!army.destinationId) {
            const road = state.roads.find(r => r.id === army.roadId);
            if (road) {
                updates.destinationId = army.direction === 'FORWARD' ? road.to : road.from;
                // Ensure movement triggers safely
                updates.turnsUntilArrival = Math.max(1, army.turnsUntilArrival);
            }
        }
    }
    const newArmies = state.armies.map(a => a.id === armyId ? { ...a, ...updates } : a);
    return {
        success: true,
        newState: {
            ...state,
            armies: newArmies
        }
    };
};
exports.executeGarrison = executeGarrison;
