"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleEnRouteReversals = handleEnRouteReversals;
const types_1 = require("../../../../shared/types");
const retreat_1 = require("../../../../shared/services/domain/retreat");
const gameConstants_1 = require("../../../../shared/data/gameConstants");
/**
 * Handle En Route Reversals
 *
 * Checks armies currently on roads. If their origin location has been captured
 * by an enemy, and their current destination is too strong to take, they reverse
 * to attempt to liberate their home base.
 *
 * @param state - Current game state
 * @param faction - Faction to process
 * @param armies - Current list of armies (modified in place if reversals occur)
 */
function handleEnRouteReversals(state, faction, armies) {
    const onRoadArmies = armies.filter(a => a.faction === faction &&
        a.locationType === 'ROAD' &&
        a.roadId);
    for (const army of onRoadArmies) {
        // 1. Identify Origin
        // If moving FORWARD, origin is road.from. If BACKWARD, origin is road.to
        // But for reversal check, we care about the "home base" we just left.
        // The army struct has originLocationId which tracks where it came from.
        if (!army.originLocationId)
            continue;
        const originLoc = state.locations.find(l => l.id === army.originLocationId);
        if (!originLoc)
            continue;
        // 2. Check if Origin is Enemy Controlled
        // Enemy = Not Faction AND Not Neutral
        if (originLoc.faction === faction || originLoc.faction === types_1.FactionId.NEUTRAL) {
            continue; // Basic secured or neutral, no panic
        }
        // 3. Check Designation
        const targetId = army.destinationId;
        if (!targetId)
            continue;
        const targetLoc = state.locations.find(l => l.id === targetId);
        if (!targetLoc)
            continue;
        // 4. Decision: Compare Destination Defense vs Army Strength
        // If destination is ours, we should continue (reinforce). only reverse if target is enemy.
        if (targetLoc.faction === faction)
            continue;
        const destinationDefense = calculateDefenseStrength(state, targetId, targetLoc.faction);
        // Add safety margin: We need to be at least 10% stronger than defense to be confident
        const confidentAttackThreshold = destinationDefense * 1.1;
        if (army.strength < confidentAttackThreshold) {
            // WE ARE LOSING HOME BASE AND CAN'T TAKE TARGET - REVERSE!
            const result = (0, retreat_1.executeRetreat)(state, army.id);
            if (result.success) {
                // Update the army in the local array to reflect the reversal
                const updatedArmy = result.newState.armies?.find(a => a.id === army.id);
                if (updatedArmy) {
                    // Update reference in the main array
                    const idx = armies.findIndex(a => a.id === army.id);
                    if (idx !== -1) {
                        armies[idx] = updatedArmy;
                    }
                    if (gameConstants_1.DEBUG_AI) {
                        console.log(`[AI MILITARY ${faction}] Army ${army.id} REVERSING! Origin ${originLoc.name} captured by ${originLoc.faction}. Target ${targetLoc.name} too strong (${destinationDefense} > ${army.strength}).`);
                    }
                }
            }
        }
    }
}
/**
 * Calculate total defense strength at a location (Garrison + Fort + Wall)
 */
function calculateDefenseStrength(state, locationId, faction) {
    // 1. Enemy Armies (Garrison)
    const armies = state.armies.filter(a => a.locationId === locationId &&
        a.faction === faction &&
        !a.isSieging // Sieging armies don't defend inside the walls usually, but for simplicity let's count only stationed
    );
    const armyStrength = armies.reduce((sum, a) => sum + a.strength, 0);
    // 2. Fortifications
    const location = state.locations.find(l => l.id === locationId);
    let fortificationBonus = 0;
    if (location?.fortificationLevel) {
        // Rough estimate of fortification value in terms of raw army strength equivalents for deterrence
        // 1 Fort level approx 1000 strength worth of defensive advantage? 
        // Let's use simpler logic: AI just compares raw numbers, maybe with a multiplier for forts
        // For now, let's just use raw army strength, as checking walls requires siege logic
        // But if they have walls, we need a siege army. If we are just a moving regiment, we can't take it easily.
        if (location.fortificationLevel > 0) {
            fortificationBonus = 2000; // Walls are scary without siege equipment
        }
    }
    return armyStrength + fortificationBonus;
}
