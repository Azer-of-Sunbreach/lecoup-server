"use strict";
/**
 * Military Recruitment Service
 * Handles the logic for recruiting new regiments
 * Extracted from useGameEngine.ts recruit()
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeRecruitment = exports.canRecruit = exports.calculateRecruitCost = void 0;
const data_1 = require("../../../data");
const economy_1 = require("../../../utils/economy");
/**
 * Get the recruitment cost at a location (always standard cost now).
 * CONSCRIPTION discount has been moved to separate conscription system.
 */
const calculateRecruitCost = (_locationId, _faction, _characters) => {
    return {
        cost: data_1.RECRUIT_COST
    };
};
exports.calculateRecruitCost = calculateRecruitCost;
/**
 * Check if recruitment is possible at a given location
 */
const canRecruit = (state, locId, faction) => {
    const loc = state.locations.find(l => l.id === locId);
    if (!loc) {
        return { canRecruit: false, reason: 'Location not found', cost: data_1.RECRUIT_COST };
    }
    if (loc.faction !== faction) {
        return { canRecruit: false, reason: 'Location not controlled by faction', cost: data_1.RECRUIT_COST };
    }
    if (loc.population < 2000) {
        return { canRecruit: false, reason: 'Insufficient population', cost: data_1.RECRUIT_COST };
    }
    if (loc.actionsTaken && loc.actionsTaken.recruit >= 4) {
        return { canRecruit: false, reason: 'Maximum recruits this turn reached', cost: data_1.RECRUIT_COST };
    }
    const { cost } = (0, exports.calculateRecruitCost)(locId, faction, state.characters);
    if (state.resources[faction].gold < cost) {
        return { canRecruit: false, reason: 'Insufficient gold', cost };
    }
    return { canRecruit: true, cost };
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
    const { cost } = (0, exports.calculateRecruitCost)(locId, faction, state.characters);
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
    newLocations = (0, economy_1.calculateEconomyAndFood)(state, newLocations, newArmies, state.characters, state.roads);
    // Update resources
    const newResources = {
        ...state.resources,
        [faction]: {
            ...state.resources[faction],
            gold: state.resources[faction].gold - cost
        }
    };
    return {
        success: true,
        newState: {
            locations: newLocations,
            armies: newArmies,
            resources: newResources
        },
        message: `Recruited new regiment in ${loc.name}.`
    };
};
exports.executeRecruitment = executeRecruitment;
