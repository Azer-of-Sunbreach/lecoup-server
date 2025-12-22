/**
 * Requisition Service
 * Handles seizing gold or food from controlled locations
 * Extracted from App.tsx handleRequisition()
 */

import { GameState, FactionId, LocationType } from '../../../types';
import { REQUISITION_AMOUNT, REQUISITION_STABILITY_PENALTY } from '../../../data';

export interface RequisitionResult {
    success: boolean;
    newState: Partial<GameState>;
    message: string;
}

/**
 * Execute requisition of gold or food from a location
 */
export const executeRequisition = (
    state: GameState,
    locId: string,
    type: 'GOLD' | 'FOOD',
    faction: FactionId
): RequisitionResult => {
    const loc = state.locations.find(l => l.id === locId);
    if (!loc) {
        return { success: false, newState: {}, message: 'Location not found' };
    }

    // Check if already requisitioned this turn
    if (type === 'GOLD' && loc.actionsTaken?.seizeGold) {
        return { success: false, newState: {}, message: 'Already seized gold this turn' };
    }
    if (type === 'FOOD' && loc.actionsTaken?.seizeFood) {
        return { success: false, newState: {}, message: 'Already seized food this turn' };
    }

    // Stability Safety Check (User Request)
    if (loc.stability < 15) {
        return { success: false, newState: {}, message: 'Stability too low to requisition' };
    }

    let targetLocId = locId;
    if (type === 'FOOD' && loc.type === LocationType.RURAL) {
        const linkedCity = state.locations.find(l => l.id === loc.linkedLocationId);
        if (!linkedCity || linkedCity.faction !== faction) {
            return { success: false, newState: {}, message: 'No valid linked city' };
        }
        targetLocId = linkedCity.id;
    }

    let newLocations = [...state.locations];
    let newResources = { ...state.resources };

    if (type === 'GOLD') {
        const goldBefore = newResources[faction].gold;
        console.log(`[SEIZE_GOLD] Faction: ${faction}, Location: ${loc.name}`);
        console.log(`[SEIZE_GOLD] Gold BEFORE: ${goldBefore}`);
        console.log(`[SEIZE_GOLD] REQUISITION_AMOUNT constant: ${REQUISITION_AMOUNT}`);

        newResources[faction].gold += REQUISITION_AMOUNT;

        console.log(`[SEIZE_GOLD] Gold AFTER: ${newResources[faction].gold}`);
        console.log(`[SEIZE_GOLD] Difference: ${newResources[faction].gold - goldBefore}`);

        newLocations = newLocations.map(l => l.id === locId ? {
            ...l,
            stability: Math.max(0, l.stability - REQUISITION_STABILITY_PENALTY),
            actionsTaken: {
                seizeFood: l.actionsTaken?.seizeFood || 0,
                incite: l.actionsTaken?.incite || 0,
                recruit: l.actionsTaken?.recruit || 0,
                seizeGold: (l.actionsTaken?.seizeGold || 0) + 1
            }
        } : l);
    } else {
        // Food Requisition
        newLocations = newLocations.map(l => {
            let updatedLoc = { ...l };

            // Add food stock to target city
            if (l.id === targetLocId) {
                updatedLoc.foodStock = (updatedLoc.foodStock || 0) + REQUISITION_AMOUNT;
            }

            // Apply penalty to source
            if (l.id === locId) {
                updatedLoc.stability = Math.max(0, updatedLoc.stability - REQUISITION_STABILITY_PENALTY);
                updatedLoc.actionsTaken = {
                    seizeGold: updatedLoc.actionsTaken?.seizeGold || 0,
                    incite: updatedLoc.actionsTaken?.incite || 0,
                    recruit: updatedLoc.actionsTaken?.recruit || 0,
                    seizeFood: (updatedLoc.actionsTaken?.seizeFood || 0) + 1
                };
            }
            return updatedLoc;
        });
    }

    return {
        success: true,
        newState: {
            locations: newLocations,
            resources: newResources
            // Requisition log removed - player action doesn't need logging
        },
        message: `Seized ${type} from ${loc.name}`
    };
};
