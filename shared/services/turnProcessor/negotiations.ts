// Negotiations Module - Process pending diplomatic negotiations

import { GameState, FactionId, Location, Army, LocationType, FACTION_NAMES, LogEntry } from '../../types';
import { NegotiationProcessingResult } from './types';
import { createNegotiationsSuccessLog, createNegotiationsFailedLog } from '../logs/logFactory';

/**
 * Process pending negotiations with neutral territories.
 * 
 * Negotiations succeed if: stability + (goldOffer / 5) + foodOffer > 60
 * 
 * On success:
 * - Territory joins the negotiating faction
 * - Stability is set to the score (capped at 100)
 * - Neutral troops become faction troops (capped at 1000)
 * - If city, food offer is added to stock
 * 
 * On failure:
 * - Territory remains neutral
 * - Invested resources are lost
 * 
 * @param state - Current game state
 * @returns Updated locations, armies, pending negotiations and logs
 */
export function processNegotiations(state: GameState): NegotiationProcessingResult {
    const logs: LogEntry[] = [];
    let locations = state.locations.map(l => ({ ...l }));
    let armies = [...state.armies];
    const nextNegotiations: typeof state.pendingNegotiations = [];

    for (const neg of state.pendingNegotiations) {
        if (neg.turnsRemaining <= 0) {
            const targetIndex = locations.findIndex(l => l.id === neg.targetLocationId);
            const target = targetIndex !== -1 ? locations[targetIndex] : null;

            if (target && target.faction === FactionId.NEUTRAL) {
                const score = target.stability + (neg.goldOffer / 5) + neg.foodOffer;
                const success = score > 60;

                if (success) {
                    const winnerFaction = neg.factionId || state.playerFaction;

                    // Update location
                    locations[targetIndex] = {
                        ...locations[targetIndex],
                        faction: winnerFaction,
                        stability: Math.min(100, score)
                    };

                    // Convert neutral troops
                    armies = armies.map(a => {
                        if (a.locationId === target.id && a.faction === FactionId.NEUTRAL) {
                            let newArmy = { ...a, faction: winnerFaction };
                            if (newArmy.strength > 1000) {
                                locations[targetIndex].population += (newArmy.strength - 1000);
                                newArmy.strength = 1000;
                            }
                            return newArmy;
                        }
                        return a;
                    });

                    // Add food offer to city stock
                    if (target.type === LocationType.CITY && neg.foodOffer > 0) {
                        locations[targetIndex].foodStock += neg.foodOffer;
                    }

                    // Success log - visible to all, WARNING for enemies, INFO for winner
                    const successLog = createNegotiationsSuccessLog(
                        target.name,
                        target.id,
                        winnerFaction,
                        state.turn
                    );
                    logs.push(successLog);
                } else {
                    // Failed log - visible only to initiator per user request
                    const failedLog = createNegotiationsFailedLog(
                        target.name,
                        neg.factionId || state.playerFaction,
                        state.turn
                    );
                    logs.push(failedLog);
                }
            }
        } else {
            // Negotiation still pending
            nextNegotiations.push({ ...neg, turnsRemaining: neg.turnsRemaining - 1 });
        }
    }

    return {
        locations,
        armies,
        pendingNegotiations: nextNegotiations,
        logs
    };
}
