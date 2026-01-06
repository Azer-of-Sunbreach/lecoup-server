/**
 * Merge Regiments Service
 * Handles merging multiple regiments into one at a location
 * Extracted from useGameEngine.ts handleMergeRegiments()
 */

import { GameState, Army, FactionId } from '../../../types';

export interface MergeResult {
    success: boolean;
    newState: Partial<GameState>;
    message: string;
}

/**
 * Execute regiment merge at a location
 */
export const executeMergeRegiments = (
    state: GameState,
    locationId: string,
    faction: FactionId
): MergeResult => {
    const eligibleArmies = state.armies.filter(a =>
        a.locationId === locationId &&
        a.faction === faction &&
        a.locationType === 'LOCATION' &&
        !a.isSpent &&
        !a.isInsurgent &&
        !a.isSieging &&
        !a.action
    );

    if (eligibleArmies.length < 2) {
        return { success: false, newState: {}, message: 'Need at least 2 eligible regiments' };
    }

    const totalStrength = eligibleArmies.reduce((sum, a) => sum + a.strength, 0);
    const template = eligibleArmies[0];
    const newArmyId = `army_merged_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    // Create new merged army
    const newArmy: Army = {
        ...template,
        id: newArmyId,
        strength: totalStrength,
        isGarrisoned: false,
        isSpent: false,
        action: undefined
    };

    // Handle Leaders: Reassign all attached leaders to the new army
    const oldArmyIds = eligibleArmies.map(a => a.id);
    const updatedCharacters = state.characters.map(c => {
        if (c.armyId && oldArmyIds.includes(c.armyId)) {
            return { ...c, armyId: newArmyId };
        }
        return c;
    });

    // Remove old armies and add the new one
    const remainingArmies = state.armies.filter(a => !oldArmyIds.includes(a.id));
    const locationName = state.locations.find(l => l.id === locationId)?.name || locationId;

    return {
        success: true,
        newState: {
            armies: [...remainingArmies, newArmy],
            characters: updatedCharacters
            // Merge log removed - player action doesn't need logging
        },
        message: `Regiments merged in ${locationName}`
    };
};
