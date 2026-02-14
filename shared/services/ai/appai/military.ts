// AI Military Management - Main orchestrator
// Refactored to use modular components

import { GameState, FactionId, Army, Character } from '../../../types';
import { FactionPersonality } from './types';
import { DEBUG_AI } from '../../../data/gameConstants';
import { executeMergeRegiments } from '../../domain/military/mergeRegiments';

// Import from new modular structure
import { handleCampaign } from './military/campaign';
import { handleDefense } from './military/defense';
import { handleRoadDefense } from './military/roadDefense';
import { handleIdleArmies } from './military/idleHandler';
import { handleEnRouteReversals } from './military/reversalHandler';

// Siege sortie (breaking enemy sieges of our cities)
import { processSiegeSorties } from '../military';

/**
 * Main military management function for AI factions.
 * 
 * Processes all military missions and handles idle armies.
 * Mission priority: CAMPAIGN > DEFEND > ROAD_DEFENSE > others
 * 
 * @param state - Current game state
 * @param faction - Faction to process
 * @param profile - Faction personality profile
 * @returns Updated armies array
 */
export const manageMilitary = (
    state: GameState,
    faction: FactionId,
    profile: FactionPersonality
): Army[] => {
    let newArmies = [...state.armies];
    const missions = state.aiState?.[faction]?.missions || [];
    const assignedArmyIds = new Set<string>();

    if (DEBUG_AI) {
        console.log(`[AI MILITARY ${faction}] === STARTING manageMilitary ===`);
        console.log(`[AI MILITARY ${faction}] Total missions: ${missions.length}`);
    }

    // 0. CHECK FOR URGENT REVERSALS (Home base capture)
    // This modifies newArmies in place if reversals occur
    handleEnRouteReversals(state, faction, newArmies);

    // 0.5. SIEGE SORTIE - Break enemy sieges of our cities
    // This runs BEFORE missions so that sortie decisions take priority when cities are starving
    const sortieResult = processSiegeSorties(state, faction);
    if (sortieResult.opportunities.length > 0) {
        // Update armies with sortie results
        newArmies = sortieResult.updatedArmies;

        // Mark sortie armies as assigned
        for (const opp of sortieResult.opportunities) {
            if (opp.canBreakSiege) {
                // Find the main army that was ordered to sortie
                const sortieArmy = newArmies.find(a =>
                    a.faction === faction &&
                    a.destinationId === opp.ruralId
                );
                if (sortieArmy) {
                    assignedArmyIds.add(sortieArmy.id);
                }
            }
        }

        for (const log of sortieResult.logs) {
            if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] ${log}`);
        }
    }

    const campaignMissions = missions.filter(m => m.type === 'CAMPAIGN');
    if (DEBUG_AI) {
        console.log(`[AI MILITARY ${faction}] Campaign missions: ${campaignMissions.length}`);
        campaignMissions.forEach(m => console.log(`[AI MILITARY ${faction}]   - ${m.id}: status=${m.status}, stage=${m.stage}, target=${m.targetId}`));
    }

    // 1. PROCESS MISSIONS BY PRIORITY - CAMPAIGN > DEFEND > COUNTER_INSURRECTION > ROAD_DEFENSE
    const typePriority = (type: string) => {
        if (type === 'CAMPAIGN') return 100;
        if (type === 'DEFEND') return 50;
        if (type === 'COUNTER_INSURRECTION') return 45;
        if (type === 'ROAD_DEFENSE') return 40;
        return 0;
    };

    const sortedMissions = [...missions].sort((a, b) => {
        const typeOrder = typePriority(b.type) - typePriority(a.type);
        if (typeOrder !== 0) return typeOrder;
        return b.priority - a.priority;
    });

    for (const mission of sortedMissions) {
        if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] Processing mission ${mission.id}: type=${mission.type}, status=${mission.status}`);

        if (mission.status !== 'ACTIVE' && mission.status !== 'PLANNING') {
            if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] SKIPPED - status is ${mission.status}`);
            continue;
        }

        if (mission.status === 'PLANNING') {
            mission.status = 'ACTIVE';
            if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] Mission ${mission.id}: Activated from PLANNING`);
        }

        switch (mission.type) {
            case 'CAMPAIGN':
                if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] Calling handleCampaign for ${mission.id}`);
                handleCampaign(mission, state, faction, newArmies, assignedArmyIds, profile);
                break;
            case 'DEFEND':
            case 'COUNTER_INSURRECTION':
                handleDefense(mission, state, faction, newArmies, assignedArmyIds);
                break;
            case 'ROAD_DEFENSE':
                handleRoadDefense(mission, state, faction, newArmies, assignedArmyIds);
                break;
        }
    }

    if (DEBUG_AI) console.log(`[AI MILITARY ${faction}] === FINISHED manageMilitary ===`);

    // 2. IDLE ARMIES BEHAVIOR
    handleIdleArmies(state, faction, newArmies, assignedArmyIds);

    // 3. CONSOLIDATE ARMIES (merge when 5+ eligible at same location)
    const consolidatedResult = consolidateArmies(faction, {
        ...state,
        armies: newArmies
    });
    newArmies = consolidatedResult.armies;

    return newArmies;
};

/**
 * Consolidate AI armies at each location.
 * Calls executeMergeRegiments when there are 5 or more eligible armies at the same location.
 * Note: executeMergeRegiments already excludes spent, insurgent, sieging, and action armies.
 */
function consolidateArmies(
    faction: FactionId,
    state: GameState
): { armies: Army[], characters: Character[] } {
    let currentArmies = [...state.armies];
    let currentCharacters = [...state.characters];

    // Count eligible armies per location
    const locationCounts = new Map<string, number>();

    for (const army of currentArmies) {
        if (army.faction !== faction) continue;
        if (army.locationType !== 'LOCATION') continue;
        if (!army.locationId) continue;
        // Same criteria as executeMergeRegiments
        if (army.isSpent || army.isInsurgent || army.isSieging || army.action) continue;

        const locId = army.locationId;
        locationCounts.set(locId, (locationCounts.get(locId) || 0) + 1);
    }

    // Merge at locations with 5+ eligible armies
    for (const [locationId, count] of locationCounts) {
        if (count < 5) continue;

        const tempState: GameState = {
            ...state,
            armies: currentArmies,
            characters: currentCharacters
        };

        const result = executeMergeRegiments(tempState, locationId, faction);

        if (result.success && result.newState.armies) {
            currentArmies = result.newState.armies;
            if (result.newState.characters) {
                currentCharacters = result.newState.characters;
            }

            if (DEBUG_AI) {
                console.log(`[AI CONSOLIDATE ${faction}] ${result.message}`);
            }
        }
    }

    return { armies: currentArmies, characters: currentCharacters };
}
