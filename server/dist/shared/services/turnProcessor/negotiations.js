"use strict";
// Negotiations Module - Process pending diplomatic negotiations
Object.defineProperty(exports, "__esModule", { value: true });
exports.processNegotiations = processNegotiations;
const types_1 = require("../../types");
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
    const nextNegotiations = [];
    for (const neg of state.pendingNegotiations) {
        if (neg.turnsRemaining <= 0) {
            const targetIndex = locations.findIndex(l => l.id === neg.targetLocationId);
            const target = targetIndex !== -1 ? locations[targetIndex] : null;
            if (target && target.faction === types_1.FactionId.NEUTRAL) {
                const score = target.stability + (neg.goldOffer / 5) + neg.foodOffer;
                const success = score > 60;
                if (success) {
                    // Use the negotiating faction's ID
                    // Fallback to Player if undefined (Legacy/Save compat)
                    const winnerFaction = neg.factionId || state.playerFaction;
                    // Update location
                    locations[targetIndex] = {
                        ...locations[targetIndex],
                        faction: winnerFaction,
                        stability: Math.min(100, score)
                    };
                    // Convert neutral troops
                    armies = armies.map(a => {
                        if (a.locationId === target.id && a.faction === types_1.FactionId.NEUTRAL) {
                            let newArmy = { ...a, faction: winnerFaction };
                            // Cap troop strength at 1000, return excess to population
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
                    logs.push(`Negotiations successful! ${target.name} has joined ${types_1.FACTION_NAMES[winnerFaction] || winnerFaction}.`);
                }
                else {
                    logs.push(`Negotiations failed with ${target.name}.`);
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
        logs
    };
}
