/**
 * Fortification Service
 * Handles construction of fortifications at locations and road stages
 * Extracted from useGameEngine.ts handleFortify()
 */

import { GameState, Army, FactionId } from '../../../types';
import { FORTIFICATION_LEVELS } from '../../../data';

export interface FortifyResult {
    success: boolean;
    newState: Partial<GameState>;
    message: string;
}

/**
 * Execute fortification construction
 */
export const executeFortify = (
    state: GameState,
    type: 'LOCATION' | 'ROAD_STAGE',
    id: string,
    faction: FactionId,
    stageIndex?: number
): FortifyResult => {
    let currentLevel = 0;
    let activeConstruction = undefined;

    if (type === 'LOCATION') {
        const loc = state.locations.find(l => l.id === id);
        currentLevel = loc?.fortificationLevel || 0;
        activeConstruction = loc?.activeConstruction;
    } else {
        const stage = state.roads.find(r => r.id === id)?.stages[stageIndex!];
        currentLevel = stage?.fortificationLevel || 0;
        activeConstruction = stage?.activeConstruction;
    }

    if (activeConstruction) {
        console.log(`[FORTIFY] Failed: Construction in progress at ${id} (idx: ${stageIndex})`);
        return { success: false, newState: {}, message: 'Construction already in progress' };
    }

    const nextLevel = currentLevel + 1;
    const fortData = FORTIFICATION_LEVELS[nextLevel];

    if (!fortData) {
        console.log(`[FORTIFY] Failed: Max level reached at ${id}`);
        return { success: false, newState: {}, message: 'Maximum fortification level reached' };
    }

    if (state.resources[faction].gold < fortData.cost) {
        console.log(`[FORTIFY] Failed: Insufficient gold (${state.resources[faction].gold} < ${fortData.cost})`);
        return { success: false, newState: {}, message: 'Insufficient gold' };
    }

    // Filter eligible armies
    const eligibleArmies = state.armies.filter(a =>
        a.faction === faction &&
        !a.isSpent &&
        !a.isInsurgent &&
        !a.isSieging &&
        !a.action &&
        (type === 'LOCATION'
            ? (a.locationType === 'LOCATION' && a.locationId === id)
            : (a.locationType === 'ROAD' && a.roadId === id && a.stageIndex === stageIndex))
    );

    const totalAvailable = eligibleArmies.reduce((sum, a) => sum + a.strength, 0);

    if (totalAvailable < fortData.manpower) {
        console.log(`[FORTIFY] Failed: Low manpower at ${id}. Need ${fortData.manpower}, have ${totalAvailable}. Eligible armies: ${eligibleArmies.length}`);
        return { success: false, newState: {}, message: `Need ${fortData.manpower} troops, have ${totalAvailable}` };
    }

    // Prepare Merge & Split
    eligibleArmies.sort((a, b) => b.strength - a.strength);
    const templateArmy = eligibleArmies[0];

    const consumedArmyIds = eligibleArmies.map(a => a.id);
    const otherArmies = state.armies.filter(a => !consumedArmyIds.includes(a.id));

    // Generate IDs
    const builderId = `fort_builder_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const remainderId = `fort_main_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    // Create Builder Army
    const builderArmy: Army = {
        ...templateArmy,
        id: builderId,
        strength: fortData.manpower,
        action: 'FORTIFY',
        isGarrisoned: true,
    };

    // Create Remainder Army
    let remainderArmy: Army | null = null;
    const remainderStrength = totalAvailable - fortData.manpower;

    if (remainderStrength > 0) {
        remainderArmy = {
            ...templateArmy,
            id: remainderId,
            strength: remainderStrength,
            action: undefined,
            justMoved: false,
            isGarrisoned: true,
        };
    }

    // Handle Leaders
    const attachedLeaders = state.characters.filter(c => c.armyId && consumedArmyIds.includes(c.armyId));
    const attachedLeaderIds = attachedLeaders.map(c => c.id);
    const newLeaderArmyId = remainderArmy ? remainderId : builderId;

    const updatedCharacters = state.characters.map(c => {
        if (attachedLeaderIds.includes(c.id)) {
            return { ...c, armyId: newLeaderArmyId };
        }
        return c;
    });

    // Construct Final Army List
    const finalArmies = [...otherArmies, builderArmy];
    if (remainderArmy) finalArmies.push(remainderArmy);

    const constructionProject = {
        targetLevel: nextLevel,
        turnsRemaining: fortData.time,
        armyId: builderId,
        originalGoldCost: fortData.cost,
        name: fortData.name
    };

    let newLocations = [...state.locations];
    let newRoads = [...state.roads];

    if (type === 'LOCATION') {
        newLocations = newLocations.map(l => l.id === id ? { ...l, activeConstruction: constructionProject } : l);
    } else {
        newRoads = newRoads.map(r => r.id === id ? { ...r, stages: r.stages.map(s => s.index === stageIndex ? { ...s, activeConstruction: constructionProject } : s) } : r);
    }

    return {
        success: true,
        newState: {
            locations: newLocations,
            roads: newRoads,
            armies: finalArmies,
            characters: updatedCharacters,
            resources: {
                ...state.resources,
                [faction]: {
                    ...state.resources[faction],
                    gold: state.resources[faction].gold - fortData.cost
                }
            }
            // Construction log removed - player action doesn't need logging
        },
        message: `Construction of ${fortData.name} started`
    };
};
