// Fortifications Module - AI fortification building logic

import { GameState, FactionId, Location, Army, Road } from '../../../../shared/types';
import { AIBudget, FactionPersonality } from '../types';
import { FORTIFICATION_LEVELS } from '../../../../shared/constants';

/**
 * Handle fortification building for AI faction.
 * 
 * Builds on locations and road stages according to:
 * - Strategic importance (key cities get priority)
 * - Available garrison (must have troops to hold)
 * - Natural defense check (don't build on naturally defended stages)
 * 
 * @param faction - Faction building
 * @param locations - Locations array (modified in place)
 * @param roads - Roads array (modified in place)
 * @param armies - Armies array (modified in place)
 * @param budget - AI budget  
 * @param profile - Faction personality
 * @param currentGold - Available gold for spending
 * @returns Remaining gold after fortification
 */
export function handleFortifications(
    faction: FactionId,
    locations: Location[],
    roads: Road[],
    armies: Army[],
    budget: AIBudget,
    profile: FactionPersonality,
    currentGold: number
): number {
    if (!profile.useFortifications) return currentGold;

    // Fortify locations
    currentGold = fortifyLocations(faction, locations, armies, budget, currentGold);

    // Fortify road stages
    currentGold = fortifyRoadStages(faction, roads, armies, budget, currentGold);

    return currentGold;
}

function fortifyLocations(
    faction: FactionId,
    locations: Location[],
    armies: Army[],
    budget: AIBudget,
    currentGold: number
): number {
    const fortifiableLocs = locations.filter(l =>
        l.faction === faction && !l.activeConstruction
    );

    for (const loc of fortifiableLocs) {
        const nextLevel = loc.fortificationLevel + 1;
        const data = FORTIFICATION_LEVELS[nextLevel];
        const limit = loc.type === 'CITY'
            ? (loc.id === 'stormbay' ? 4 : 3)
            : 1;

        if (nextLevel <= limit && data && currentGold >= data.cost) {
            const garrison = armies.filter(a =>
                a.locationId === loc.id &&
                a.faction === faction &&
                !a.action
            );
            const totalMen = garrison.reduce((s, a) => s + a.strength, 0);

            // Strategic locations get higher build chance
            let chance = 0.2;
            if (['windward', 'stormbay', 'sunbreach', 'port_de_sable'].includes(loc.id)) {
                chance = 0.6;
            }

            if (totalMen >= data.manpower && Math.random() < chance) {
                currentGold -= data.cost;
                budget.allocations.fortification -= data.cost;

                // Find biggest army to build
                const builder = garrison.sort((a, b) => b.strength - a.strength)[0];
                builder.action = 'FORTIFY';

                loc.activeConstruction = {
                    targetLevel: nextLevel,
                    turnsRemaining: data.time,
                    armyId: builder.id,
                    originalGoldCost: data.cost,
                    name: data.name
                };
            }
        }
    }

    return currentGold;
}

function fortifyRoadStages(
    faction: FactionId,
    roads: Road[],
    armies: Army[],
    budget: AIBudget,
    currentGold: number
): number {
    // Only build on roads if wealthy
    if (currentGold <= 500) return currentGold;

    for (let rIdx = 0; rIdx < roads.length; rIdx++) {
        const road = roads[rIdx];
        let roadUpdated = false;
        const newStages = [...road.stages];

        for (let sIdx = 0; sIdx < newStages.length; sIdx++) {
            const stage = newStages[sIdx];

            if (stage.faction === faction &&
                !stage.activeConstruction &&
                (stage.fortificationLevel || 0) < 1) {

                // User Rule: IMPOSSIBLE to build on Natural Defense
                if ((stage.naturalDefense || 0) > 0) continue;

                const nextLevel = (stage.fortificationLevel || 0) + 1;
                const data = FORTIFICATION_LEVELS[nextLevel];

                if (data && currentGold >= data.cost) {
                    // Check for builder army on this stage
                    const builder = armies.find(a =>
                        a.faction === faction &&
                        !a.action &&
                        a.locationType === 'ROAD' &&
                        a.roadId === road.id &&
                        a.stageIndex === stage.index
                    );

                    // Defenses must be held by at least 500 men
                    if (builder && builder.strength >= 500 && builder.strength >= data.manpower) {
                        currentGold -= data.cost;
                        budget.allocations.fortification -= data.cost;
                        builder.action = 'FORTIFY';

                        newStages[sIdx] = {
                            ...stage,
                            activeConstruction: {
                                targetLevel: nextLevel,
                                turnsRemaining: data.time,
                                armyId: builder.id,
                                originalGoldCost: data.cost,
                                name: data.name
                            }
                        };
                        roadUpdated = true;
                    }
                }
            }
        }

        if (roadUpdated) {
            roads[rIdx] = { ...road, stages: newStages };
        }
    }

    return currentGold;
}
