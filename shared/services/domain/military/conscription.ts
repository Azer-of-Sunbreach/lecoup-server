/**
 * Conscription Service
 * 
 * Handles the CONSCRIPTION ability logic - allows leaders with this ability
 * to recruit regiments at reduced gold cost but with stability penalty.
 * 
 * Rules:
 * - Cost: 15g + 3 stability
 * - Requires CONSCRIPTION leader in location
 * - Each leader can conscript once per turn (tracked by usedConscriptionThisTurn)
 * - Location must have population > 2000
 * - Location must have stability >= 3 (to pay the cost)
 * - Separate from normal recruitment counter
 */

import { GameState, FactionId, Character, CharacterStatus, Army, Location } from '../../../types';
import { RECRUIT_AMOUNT } from '../../../data';
import { calculateEconomyAndFood } from '../../../utils/economy';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Gold cost for conscription */
export const CONSCRIPTION_GOLD_COST = 15;

/** Stability cost for conscription */
export const CONSCRIPTION_STABILITY_COST = 3;

/** Minimum population required for conscription */
export const CONSCRIPTION_MIN_POPULATION = 2000;

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get CONSCRIPTION leaders at a location that haven't used their ability this turn.
 */
export function getAvailableConscriptionLeaders(
    locationId: string,
    faction: FactionId,
    characters: Character[]
): Character[] {
    return characters.filter(c =>
        c.faction === faction &&
        c.locationId === locationId &&
        c.status !== CharacterStatus.DEAD &&
        c.status !== CharacterStatus.MOVING &&
        c.stats?.ability?.includes('CONSCRIPTION') &&
        !c.usedConscriptionThisTurn
    );
}

/**
 * Get the number of conscriptions available at a location.
 * Returns 0 if no CONSCRIPTION leaders present or conditions not met.
 */
export function getConscriptionCount(
    state: GameState,
    locationId: string,
    faction: FactionId
): number {
    const location = state.locations.find(l => l.id === locationId);
    if (!location) return 0;

    // Must be controlled by faction
    if (location.faction !== faction) return 0;

    // Must have sufficient population
    if (location.population < CONSCRIPTION_MIN_POPULATION) return 0;

    // Count available leaders
    const leaders = getAvailableConscriptionLeaders(locationId, faction, state.characters);
    return leaders.length;
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface CanConscriptResult {
    canConscript: boolean;
    reason?: string;
    availableCount: number;
}

/**
 * Check if conscription is possible at a location.
 * For human players - only checks hard constraints.
 */
export function canConscript(
    state: GameState,
    locationId: string,
    faction: FactionId
): CanConscriptResult {
    const location = state.locations.find(l => l.id === locationId);

    if (!location) {
        return { canConscript: false, reason: 'Location not found', availableCount: 0 };
    }

    if (location.faction !== faction) {
        return { canConscript: false, reason: 'Location not controlled by faction', availableCount: 0 };
    }

    if (location.population < CONSCRIPTION_MIN_POPULATION) {
        return { canConscript: false, reason: 'Insufficient population', availableCount: 0 };
    }

    // Check gold
    const gold = state.resources[faction]?.gold ?? 0;
    if (gold < CONSCRIPTION_GOLD_COST) {
        return { canConscript: false, reason: 'Insufficient gold', availableCount: 0 };
    }

    // Check stability - must have at least 3 to pay the cost
    if (location.stability < CONSCRIPTION_STABILITY_COST) {
        return { canConscript: false, reason: 'Insufficient stability', availableCount: 0 };
    }

    // Check available CONSCRIPTION leaders
    const leaders = getAvailableConscriptionLeaders(locationId, faction, state.characters);
    if (leaders.length === 0) {
        return { canConscript: false, reason: 'No available CONSCRIPTION leader', availableCount: 0 };
    }

    return { canConscript: true, availableCount: leaders.length };
}

// ============================================================================
// EXECUTION
// ============================================================================

export interface ConscriptionResult {
    success: boolean;
    newState: Partial<GameState>;
    message: string;
}

/**
 * Execute conscription at a location.
 */
export function executeConscription(
    state: GameState,
    locationId: string,
    faction: FactionId
): ConscriptionResult {
    const check = canConscript(state, locationId, faction);
    if (!check.canConscript) {
        return {
            success: false,
            newState: {},
            message: check.reason || 'Cannot conscript'
        };
    }

    const location = state.locations.find(l => l.id === locationId)!;

    // Find the first available CONSCRIPTION leader to use
    const leaders = getAvailableConscriptionLeaders(locationId, faction, state.characters);
    const usedLeader = leaders[0];

    // Find eligible armies to reinforce
    const eligibleArmies = state.armies.filter(a =>
        a.locationId === locationId &&
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
            locationId: locationId,
            roadId: null,
            stageIndex: 0,
            direction: 'FORWARD',
            originLocationId: locationId,
            destinationId: null,
            turnsUntilArrival: 0,
            strength: RECRUIT_AMOUNT,
            isInsurgent: false,
            isSpent: false,
            isSieging: false,
            foodSourceId: locationId,
            lastSafePosition: { type: 'LOCATION', id: locationId }
        };
        newArmies.push(newArmy);
    }

    // Update location: reduce population and stability
    let newLocations = state.locations.map(l =>
        l.id === locationId
            ? {
                ...l,
                population: l.population - RECRUIT_AMOUNT,
                stability: l.stability - CONSCRIPTION_STABILITY_COST
            }
            : l
    );

    // Mark leader as having used conscription this turn
    const newCharacters = state.characters.map(c =>
        c.id === usedLeader.id
            ? { ...c, usedConscriptionThisTurn: true }
            : c
    );

    // Recalculate economy
    newLocations = calculateEconomyAndFood(state, newLocations, newArmies, newCharacters, state.roads);

    // Deduct gold
    const newResources = {
        ...state.resources,
        [faction]: {
            ...state.resources[faction],
            gold: state.resources[faction].gold - CONSCRIPTION_GOLD_COST
        }
    };

    return {
        success: true,
        newState: {
            locations: newLocations,
            armies: newArmies,
            resources: newResources,
            characters: newCharacters
        },
        message: `Conscripted regiment in ${location.name}.`
    };
}
