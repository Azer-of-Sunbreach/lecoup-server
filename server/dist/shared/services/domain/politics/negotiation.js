"use strict";
/**
 * Negotiation Service
 * Handles player negotiations with neutral factions
 * Extracted from App.tsx handleNegotiate()
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeNegotiate = void 0;
/**
 * Initiate a negotiation with a neutral location
 */
const executeNegotiate = (state, locId, gold, food, foodSourceIds, faction) => {
    // Check if player has enough gold
    if (state.resources[faction].gold < gold) {
        return { success: false, newState: {}, message: 'Insufficient gold' };
    }
    let newLocations = [...state.locations];
    // Handle food transfer if needed
    if (food > 0) {
        const source = newLocations.find(l => l.id === foodSourceIds[0]);
        if (!source || source.foodStock < food) {
            return { success: false, newState: {}, message: 'Insufficient food in source' };
        }
        newLocations = newLocations.map(l => l.id === foodSourceIds[0] ? { ...l, foodStock: l.foodStock - food } : l);
    }
    const targetName = state.locations.find(l => l.id === locId)?.name || 'Unknown';
    return {
        success: true,
        newState: {
            locations: newLocations,
            resources: {
                ...state.resources,
                [faction]: {
                    ...state.resources[faction],
                    gold: state.resources[faction].gold - gold
                }
            },
            pendingNegotiations: [
                ...state.pendingNegotiations,
                {
                    factionId: faction, // FIX: Added missing factionId
                    targetLocationId: locId,
                    goldOffer: gold,
                    foodOffer: food,
                    foodSourceCityIds: foodSourceIds,
                    turnsRemaining: 0
                }
            ],
            logs: [...state.logs, `Agent sent to negotiate with ${targetName}.`].slice(-50)
        },
        message: `Agent sent to negotiate with ${targetName}`
    };
};
exports.executeNegotiate = executeNegotiate;
