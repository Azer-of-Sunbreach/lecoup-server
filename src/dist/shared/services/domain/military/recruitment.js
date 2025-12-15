"use strict";
/**
 * Military Recruitment Service
 * Handles the logic for recruiting new regiments
 * Extracted from useGameEngine.ts recruit()
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeRecruitment = exports.canRecruit = void 0;
const data_1 = require("../../../data");
const economy_1 = require("../../../utils/economy");
/**
 * Check if recruitment is possible at a given location
 */
const canRecruit = (state, locId, faction) => {
    const loc = state.locations.find(l => l.id === locId);
    if (!loc) {
        return { canRecruit: false, reason: 'Location not found' };
    }
    if (loc.faction !== faction) {
        return { canRecruit: false, reason: 'Location not controlled by faction' };
    }
    if (loc.population < 2000) {
        return { canRecruit: false, reason: 'Insufficient population' };
    }
    if (loc.actionsTaken && loc.actionsTaken.recruit >= 4) {
        return { canRecruit: false, reason: 'Maximum recruits this turn reached' };
    }
    if (state.resources[faction].gold < data_1.RECRUIT_COST) {
        return { canRecruit: false, reason: 'Insufficient gold' };
    }
    return { canRecruit: true };
};
exports.canRecruit = canRecruit;
/**
 * Execute recruitment at a location
 * Returns the state updates to apply
 */
const executeRecruitment = (state, locId, faction) => {
    const check = (0, exports.canRecruit)(state, locId, faction);
    if (!check.canRecruit) {
        return {
            success: false,
            newState: {},
            message: check.reason || 'Cannot recruit'
        };
    }
    const loc = state.locations.find(l => l.id === locId);
    // Find eligible armies to reinforce
    const eligibleArmies = state.armies.filter(a => a.locationId === locId &&
        a.faction === faction &&
        a.locationType === 'LOCATION' &&
        !a.isInsurgent &&
        !a.isSpent &&
        !a.isSieging &&
        a.action !== 'FORTIFY').sort((a, b) => b.strength - a.strength);
    let newArmies = [...state.armies];
    if (eligibleArmies.length > 0) {
        // Reinforce existing army
        const targetArmy = eligibleArmies[0];
        newArmies = newArmies.map(a => a.id === targetArmy.id
            ? { ...a, strength: a.strength + data_1.RECRUIT_AMOUNT }
            : a);
    }
    else {
        // Create new army
        const newArmy = {
            id: `army_${Date.now()}_${Math.random()}`,
            faction: faction,
            locationType: 'LOCATION',
            locationId: locId,
            roadId: null,
            stageIndex: 0,
            direction: 'FORWARD',
            originLocationId: locId,
            destinationId: null,
            turnsUntilArrival: 0,
            strength: data_1.RECRUIT_AMOUNT,
            isInsurgent: false,
            isSpent: false,
            isSieging: false,
            foodSourceId: locId,
            lastSafePosition: { type: 'LOCATION', id: locId }
        };
        newArmies.push(newArmy);
    }
    // Update population and action count
    let newLocations = state.locations.map(l => l.id === locId
        ? {
            ...l,
            population: l.population - data_1.RECRUIT_AMOUNT,
            actionsTaken: {
                seizeGold: l.actionsTaken?.seizeGold || 0,
                seizeFood: l.actionsTaken?.seizeFood || 0,
                incite: l.actionsTaken?.incite || 0,
                recruit: (l.actionsTaken?.recruit || 0) + 1
            }
        }
        : l);
    // Recalculate economy
    newLocations = (0, economy_1.calculateEconomyAndFood)(newLocations, newArmies, state.characters, state.roads);
    // Update resources
    const newResources = {
        ...state.resources,
        [faction]: {
            ...state.resources[faction],
            gold: state.resources[faction].gold - data_1.RECRUIT_COST
        }
    };
    return {
        success: true,
        newState: {
            locations: newLocations,
            armies: newArmies,
            resources: newResources
            // Recruitment log removed - player action doesn't need logging
        },
        message: `Recruited new regiment in ${loc.name}.`
    };
};
exports.executeRecruitment = executeRecruitment;
