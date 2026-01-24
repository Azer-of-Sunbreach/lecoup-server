"use strict";
// Negotiations Module - Process pending diplomatic negotiations
Object.defineProperty(exports, "__esModule", { value: true });
exports.processNegotiations = processNegotiations;
const types_1 = require("../../types");
const logFactory_1 = require("../logs/logFactory");
const leaderStatusUpdates_1 = require("../turnLogic/leaderStatusUpdates");
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
function processNegotiations(state) {
    const logs = [];
    let locations = state.locations.map(l => ({ ...l }));
    let armies = [...state.armies];
    let characters = [...state.characters];
    const nextNegotiations = [];
    for (const neg of state.pendingNegotiations) {
        if (neg.turnsRemaining <= 0) {
            const targetIndex = locations.findIndex(l => l.id === neg.targetLocationId);
            const target = targetIndex !== -1 ? locations[targetIndex] : null;
            if (target && target.faction === types_1.FactionId.NEUTRAL) {
                const winnerFaction = neg.factionId || state.playerFaction;
                // Get resentment towards the negotiating faction (default 0)
                const resentment = target.resentment?.[winnerFaction] || 0;
                // Probabilistic success formula:
                // Base: min(stability, 50) + goldOffer/5 + foodOffer - resentment/5
                // Result is clamped to 0-100 as a percentage chance
                const clampedStability = Math.min(target.stability, 50);
                const rawScore = clampedStability + (neg.goldOffer / 5) + neg.foodOffer - (resentment / 5);
                const successChance = Math.max(0, Math.min(100, Math.round(rawScore)));
                // Roll for success
                const roll = Math.random() * 100;
                const success = roll < successChance;
                if (success) {
                    // Update location
                    locations[targetIndex] = {
                        ...locations[targetIndex],
                        faction: winnerFaction,
                        stability: Math.max(0, Math.min(100, Math.round(rawScore)))
                    };
                    // Reduce resentment against winner faction by half on success
                    if (target.resentment) {
                        const currentResentment = target.resentment[winnerFaction] || 0;
                        locations[targetIndex] = {
                            ...locations[targetIndex],
                            resentment: {
                                ...target.resentment,
                                [winnerFaction]: Math.floor(currentResentment / 2)
                            }
                        };
                    }
                    // Convert neutral troops
                    armies = armies.map(a => {
                        if (a.locationId === target.id && a.faction === types_1.FactionId.NEUTRAL) {
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
                    if (target.type === types_1.LocationType.CITY && neg.foodOffer > 0) {
                        locations[targetIndex].foodStock += neg.foodOffer;
                    }
                    // Update leaders present in the negotiated territory
                    characters = (0, leaderStatusUpdates_1.handleLeaderStatusOnCapture)(target.id, winnerFaction, characters);
                    // Success log - visible to all, WARNING for enemies, INFO for winner
                    const successLog = (0, logFactory_1.createNegotiationsSuccessLog)(target.name, target.id, winnerFaction, state.turn);
                    logs.push(successLog);
                }
                else {
                    // Failed log - visible only to initiator per user request
                    const failedLog = (0, logFactory_1.createNegotiationsFailedLog)(target.name, neg.factionId || state.playerFaction, state.turn);
                    logs.push(failedLog);
                }
            }
        }
        else {
            // Negotiation still pending
            nextNegotiations.push({ ...neg, turnsRemaining: neg.turnsRemaining - 1 });
        }
    }
    return {
        locations,
        armies,
        pendingNegotiations: nextNegotiations,
        characters,
        logs
    };
}
