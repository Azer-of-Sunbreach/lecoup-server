/**
 * Negotiation Service
 * Handles player negotiations with neutral factions
 * Extracted from App.tsx handleNegotiate()
 */

import { GameState, FactionId } from '../../../types';

export interface NegotiationResult {
    success: boolean;
    newState: Partial<GameState>;
    message: string;
}

/**
 * Initiate a negotiation with a neutral location
 */
export const executeNegotiate = (
    state: GameState,
    locId: string,
    gold: number,
    food: number,
    foodSourceIds: string[],
    faction: FactionId
): NegotiationResult => {
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
        newLocations = newLocations.map(l =>
            l.id === foodSourceIds[0] ? { ...l, foodStock: l.foodStock - food } : l
        );
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
            ]
            // Negotiation log removed - player action doesn't need logging
        },
        message: `Agent sent to negotiate with ${targetName}`
    };
};
