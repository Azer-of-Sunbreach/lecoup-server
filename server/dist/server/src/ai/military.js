"use strict";
// AI Military Management - Main orchestrator
// Refactored to use modular components
Object.defineProperty(exports, "__esModule", { value: true });
exports.manageMilitary = void 0;
const gameConstants_1 = require("../../../shared/data/gameConstants");
const mergeRegiments_1 = require("../../../shared/services/domain/military/mergeRegiments");
// Import from new modular structure
const campaign_1 = require("./military/campaign");
const defense_1 = require("./military/defense");
const roadDefense_1 = require("./military/roadDefense");
const idleHandler_1 = require("./military/idleHandler");
const reversalHandler_1 = require("./military/reversalHandler");
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
const manageMilitary = (state, faction, profile) => {
    let newArmies = [...state.armies];
    const missions = state.aiState?.[faction]?.missions || [];
    const assignedArmyIds = new Set();
    if (gameConstants_1.DEBUG_AI) {
        console.log(`[AI MILITARY ${faction}] === STARTING manageMilitary ===`);
        console.log(`[AI MILITARY ${faction}] Total missions: ${missions.length}`);
    }
    // 0. CHECK FOR URGENT REVERSALS (Home base capture)
    // This modifies newArmies in place if reversals occur
    (0, reversalHandler_1.handleEnRouteReversals)(state, faction, newArmies);
    const campaignMissions = missions.filter(m => m.type === 'CAMPAIGN');
    if (gameConstants_1.DEBUG_AI) {
        console.log(`[AI MILITARY ${faction}] Campaign missions: ${campaignMissions.length}`);
        campaignMissions.forEach(m => console.log(`[AI MILITARY ${faction}]   - ${m.id}: status=${m.status}, stage=${m.stage}, target=${m.targetId}`));
    }
    // 1. PROCESS MISSIONS BY PRIORITY - CAMPAIGN > DEFEND > ROAD_DEFENSE
    const typePriority = (type) => {
        if (type === 'CAMPAIGN')
            return 100;
        if (type === 'DEFEND')
            return 50;
        if (type === 'ROAD_DEFENSE')
            return 40;
        return 0;
    };
    const sortedMissions = [...missions].sort((a, b) => {
        const typeOrder = typePriority(b.type) - typePriority(a.type);
        if (typeOrder !== 0)
            return typeOrder;
        return b.priority - a.priority;
    });
    for (const mission of sortedMissions) {
        if (gameConstants_1.DEBUG_AI)
            console.log(`[AI MILITARY ${faction}] Processing mission ${mission.id}: type=${mission.type}, status=${mission.status}`);
        if (mission.status !== 'ACTIVE' && mission.status !== 'PLANNING') {
            if (gameConstants_1.DEBUG_AI)
                console.log(`[AI MILITARY ${faction}] SKIPPED - status is ${mission.status}`);
            continue;
        }
        // Activate PLANNING missions so they progress
        if (mission.status === 'PLANNING') {
            mission.status = 'ACTIVE';
            if (gameConstants_1.DEBUG_AI)
                console.log(`[AI MILITARY ${faction}] Mission ${mission.id}: Activated from PLANNING`);
        }
        switch (mission.type) {
            case 'CAMPAIGN':
                if (gameConstants_1.DEBUG_AI)
                    console.log(`[AI MILITARY ${faction}] Calling handleCampaign for ${mission.id}`);
                (0, campaign_1.handleCampaign)(mission, state, faction, newArmies, assignedArmyIds, profile);
                break;
            case 'DEFEND':
                (0, defense_1.handleDefense)(mission, state, faction, newArmies, assignedArmyIds);
                break;
            case 'ROAD_DEFENSE':
                (0, roadDefense_1.handleRoadDefense)(mission, state, faction, newArmies, assignedArmyIds);
                break;
        }
    }
    if (gameConstants_1.DEBUG_AI)
        console.log(`[AI MILITARY ${faction}] === FINISHED manageMilitary ===`);
    // 2. IDLE ARMIES BEHAVIOR
    (0, idleHandler_1.handleIdleArmies)(state, faction, newArmies, assignedArmyIds);
    // 3. CONSOLIDATE ARMIES (merge when 5+ eligible at same location)
    const consolidatedResult = consolidateArmies(faction, {
        ...state,
        armies: newArmies
    });
    newArmies = consolidatedResult.armies;
    return newArmies;
};
exports.manageMilitary = manageMilitary;
/**
 * Consolidate AI armies at each location.
 * Calls executeMergeRegiments when there are 5 or more eligible armies at the same location.
 * Note: executeMergeRegiments already excludes spent, insurgent, sieging, and action armies.
 */
function consolidateArmies(faction, state) {
    let currentArmies = [...state.armies];
    let currentCharacters = [...state.characters];
    // Count eligible armies per location
    const locationCounts = new Map();
    for (const army of currentArmies) {
        if (army.faction !== faction)
            continue;
        if (army.locationType !== 'LOCATION')
            continue;
        if (!army.locationId)
            continue;
        // Same criteria as executeMergeRegiments
        if (army.isSpent || army.isInsurgent || army.isSieging || army.action)
            continue;
        const locId = army.locationId;
        locationCounts.set(locId, (locationCounts.get(locId) || 0) + 1);
    }
    // Merge at locations with 5+ eligible armies
    for (const [locationId, count] of locationCounts) {
        if (count < 5)
            continue;
        const tempState = {
            ...state,
            armies: currentArmies,
            characters: currentCharacters
        };
        const result = (0, mergeRegiments_1.executeMergeRegiments)(tempState, locationId, faction);
        if (result.success && result.newState.armies) {
            currentArmies = result.newState.armies;
            if (result.newState.characters) {
                currentCharacters = result.newState.characters;
            }
            if (gameConstants_1.DEBUG_AI) {
                console.log(`[AI CONSOLIDATE ${faction}] ${result.message}`);
            }
        }
    }
    return { armies: currentArmies, characters: currentCharacters };
}
