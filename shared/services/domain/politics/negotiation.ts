/**
 * Negotiation Service
 * Handles player negotiations with neutral factions
 * Extracted from App.tsx handleNegotiate()
 */

import { GameState, FactionId, LogEntry } from '../../../types';
import { createNegotiationAttemptLog } from '../../logs/logFactory';

export interface NegotiationResult {
    success: boolean;
    newState: Partial<GameState>;
    message: string;
    log?: LogEntry; // Optional log entry for multiplayer notification
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

    const target = state.locations.find(l => l.id === locId);
    const targetName = target?.name || 'Unknown';

    // Create multiplayer notification log (WARNING for other players)
    const negotiationLog = createNegotiationAttemptLog(
        locId,
        faction,
        state.turn
    );

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
                    factionId: faction,
                    targetLocationId: locId,
                    goldOffer: gold,
                    foodOffer: food,
                    foodSourceCityIds: foodSourceIds,
                    turnsRemaining: 0
                }
            ]
        },
        message: `Agent sent to negotiate with ${targetName}`,
        log: negotiationLog // Return log for multiplayer broadcast
    };
};
