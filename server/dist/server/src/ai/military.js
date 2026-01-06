"use strict";
// AI Military Management - Main orchestrator
// Refactored to use modular components
Object.defineProperty(exports, "__esModule", { value: true });
exports.manageMilitary = void 0;
const gameConstants_1 = require("../../../shared/data/gameConstants");
// Import from new modular structure
const campaign_1 = require("./military/campaign");
const defense_1 = require("./military/defense");
const roadDefense_1 = require("./military/roadDefense");
const idleHandler_1 = require("./military/idleHandler");
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
    return newArmies;
};
exports.manageMilitary = manageMilitary;
