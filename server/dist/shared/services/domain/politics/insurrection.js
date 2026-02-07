"use strict";
/**
 * Insurrection Service
 * Handles player-initiated insurrections
 * Extracted from useGameEngine.ts incite()
 *
 * IMPORTANT: All validation is handled by the UI layer (LocationInfo.tsx):
 * - Enemy territory check (not neutral, not controlled)
 * - No pending insurrection for this location
 * - Leader availability (alive, not on mission, not attached to army)
 * - Sufficient gold
 * - LEGENDARY defender check (with proper error animation)
 * - Noble cannot incite in cities
 *
 * This service only executes the insurrection initiation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeIncite = void 0;
const types_1 = require("../../../types");
const logFactory_1 = require("../../logs/logFactory");
const insurrectionFormulas_1 = require("../clandestine/insurrectionFormulas");
/**
 * Execute insurrection initiation
 *
 * Assumes ALL UI-level validations have already passed.
 * Does not perform redundant validation - trust the UI.
 */
const executeIncite = (state, locId, charId, goldAmount, faction) => {
    const loc = state.locations.find(l => l.id === locId);
    const character = state.characters.find(c => c.id === charId);
    // Basic sanity check only (not validation)
    if (!loc || !character) {
        return {
            success: false,
            newState: {},
            message: 'Invalid location or character'
        };
    }
    const costReduction = character.bonuses?.costReduction || 0;
    const finalCost = Math.floor(goldAmount * (1 - costReduction));
    return {
        success: true,
        newState: {
            locations: state.locations.map(l => l.id === locId
                ? {
                    ...l,
                    actionsTaken: {
                        seizeGold: 0,
                        seizeFood: 0,
                        recruit: 0,
                        ...(l.actionsTaken || {}),
                        incite: 1
                    }
                }
                : l),
            characters: state.characters.map(c => c.id === charId
                ? {
                    ...c,
                    status: types_1.CharacterStatus.ON_MISSION,
                    locationId: "Traveling",
                    turnsUntilArrival: 4,
                    missionData: { targetLocationId: locId, goldSpent: goldAmount }
                }
                : c),
            resources: {
                ...state.resources,
                [faction]: {
                    ...state.resources[faction],
                    gold: state.resources[faction].gold - finalCost
                }
            },
            logs: [
                ...state.logs,
                (0, logFactory_1.createInsurrectionPreparationLog)(character.id, loc.id, loc.faction, (0, insurrectionFormulas_1.estimateGrandInsurgents)(goldAmount, loc.population, loc.stability, character.stats.clandestineOps || 1, loc.resentment?.[loc.faction] || 0, loc.resentment?.[faction] || 0, character.stats.ability?.includes('FIREBRAND') || false), state.turn)
            ]
        },
        message: `${character.name} is preparing an insurrection in ${loc.name}`
    };
};
exports.executeIncite = executeIncite;
