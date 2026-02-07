/**
 * Military Recruitment Service
 * Handles the logic for recruiting new regiments
 * Extracted from useGameEngine.ts recruit()
 */

import { GameState, Army, FactionId, Character, Location } from '../../../types';
import { RECRUIT_COST, RECRUIT_AMOUNT } from '../../../data';
import { calculateEconomyAndFood } from '../../../utils/economy';

export interface RecruitResult {
    success: boolean;
    newState: Partial<GameState>;
    message: string;
}

/**
 * Result of the recruitment cost calculation
 */
export interface RecruitmentCostResult {
    cost: number;
}

/**
 * Get the recruitment cost at a location (always standard cost now).
 * CONSCRIPTION discount has been moved to separate conscription system.
 */
export const calculateRecruitCost = (
    _locationId: string,
    _faction: FactionId,
    _characters: Character[]
): RecruitmentCostResult => {
    return {
        cost: RECRUIT_COST
    };
};

/**
 * Check if recruitment is possible at a given location
 */
export const canRecruit = (
    state: GameState,
    locId: string,
    faction: FactionId
): { canRecruit: boolean; reason?: string; cost: number } => {
    const loc = state.locations.find(l => l.id === locId);

    if (!loc) {
        return { canRecruit: false, reason: 'Location not found', cost: RECRUIT_COST };
    }

    if (loc.faction !== faction) {
        return { canRecruit: false, reason: 'Location not controlled by faction', cost: RECRUIT_COST };
    }

    if (loc.population < 2000) {
        return { canRecruit: false, reason: 'Insufficient population', cost: RECRUIT_COST };
    }

    if (loc.actionsTaken && loc.actionsTaken.recruit >= 4) {
        return { canRecruit: false, reason: 'Maximum recruits this turn reached', cost: RECRUIT_COST };
    }

    const { cost } = calculateRecruitCost(locId, faction, state.characters);

    if (state.resources[faction].gold < cost) {
        return { canRecruit: false, reason: 'Insufficient gold', cost };
    }

    return { canRecruit: true, cost };
};

/**
 * Execute recruitment at a location
 * Returns the state updates to apply
 */
export const executeRecruitment = (
    state: GameState,
    locId: string,
    faction: FactionId
): RecruitResult => {
    const check = canRecruit(state, locId, faction);
    if (!check.canRecruit) {
        return {
            success: false,
            newState: {},
            message: check.reason || 'Cannot recruit'
        };
    }

    const loc = state.locations.find(l => l.id === locId)!;
    const { cost } = calculateRecruitCost(locId, faction, state.characters);

    // Find eligible armies to reinforce
    const eligibleArmies = state.armies.filter(a =>
        a.locationId === locId &&
        a.faction === faction &&
        a.locationType === 'LOCATION' &&
        !a.isInsurgent &&
        !a.isSpent &&
        !a.isSieging &&
        a.action !== 'FORTIFY'
    ).sort((a, b) => b.strength - a.strength);

    let newArmies = [...state.armies];

    if (eligibleArmies.length > 0) {
        // Reinforce existing army
        const targetArmy = eligibleArmies[0];
        newArmies = newArmies.map(a =>
            a.id === targetArmy.id
                ? { ...a, strength: a.strength + RECRUIT_AMOUNT }
                : a
        );
    } else {
        // Create new army
        const newArmy: Army = {
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
            strength: RECRUIT_AMOUNT,
            isInsurgent: false,
            isSpent: false,
            isSieging: false,
            foodSourceId: locId,
            lastSafePosition: { type: 'LOCATION', id: locId }
        };
        newArmies.push(newArmy);
    }

    // Update population and action count
    let newLocations = state.locations.map(l =>
        l.id === locId
            ? {
                ...l,
                population: l.population - RECRUIT_AMOUNT,
                actionsTaken: {
                    seizeGold: l.actionsTaken?.seizeGold || 0,
                    seizeFood: l.actionsTaken?.seizeFood || 0,
                    incite: l.actionsTaken?.incite || 0,
                    recruit: (l.actionsTaken?.recruit || 0) + 1
                }
            }
            : l
    );

    // Recalculate economy
    newLocations = calculateEconomyAndFood(state, newLocations, newArmies, state.characters, state.roads);

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

