"use strict";
// AI Strategy Management - Main orchestrator
// Refactored to use modular components
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateGoals = exports.updateMissions = exports.analyzeTheaters = void 0;
// Import from new modular structure
const index_1 = require("./strategy/index");
/**
 * Analyze the game map to identify theaters of operation.
 * Re-exported from theaters module for backward compatibility.
 */
exports.analyzeTheaters = index_1.analyzeTheaters;
/**
 * Update and generate AI missions based on theaters and faction personality.
 *
 * Mission types:
 * - DEFEND: Protect owned territories
 * - CAMPAIGN: Offensive operations against enemies
 * - ROAD_DEFENSE: Control strategic road stages
 * - INSURRECTION: Destabilize enemy territories
 * - NEGOTIATE: Rally neutral territories
 * - STABILIZE: Improve stability in owned territories
 *
 * @param state - Current game state
 * @param faction - Faction to generate for
 * @param theaters - Analyzed theaters
 * @param profile - Faction personality
 * @returns Sorted list of missions by priority
 */
const updateMissions = (state, faction, theaters, profile) => {
    // 1. Retrieve existing missions
    let activeMissions = state.aiState?.[faction]?.missions || [];
    // 2. CLEANUP: Remove completed, failed, or invalid missions
    activeMissions = cleanupMissions(state, faction, activeMissions);
    // 3. GENERATE NEW MISSIONS
    // A. Defense missions (highest priority)
    (0, index_1.generateDefendMissions)(state, faction, theaters, profile, activeMissions);
    // B. Road defense missions (strategic road stage control)
    (0, index_1.generateRoadDefenseMissions)(state, faction, state.turn, activeMissions);
    // C. Campaign missions (offense)
    (0, index_1.generateCampaignMissions)(state, faction, theaters, profile, activeMissions);
    // D. Diplomacy missions (insurrection, negotiate, stabilize)
    (0, index_1.generateDiplomacyMissions)(state, faction, theaters, profile, activeMissions);
    // 4. SORT & RETURN by priority
    return activeMissions.sort((a, b) => b.priority - a.priority);
};
exports.updateMissions = updateMissions;
/**
 * Clean up invalid or completed missions.
 */
function cleanupMissions(state, faction, missions) {
    return missions.filter(m => {
        // Remove completed or failed
        if (m.status === 'COMPLETED' || m.status === 'FAILED')
            return false;
        // Check target still exists
        const target = state.locations.find(l => l.id === m.targetId);
        if (!target)
            return false;
        // Ownership validity
        if (m.type === 'STABILIZE' || m.type === 'DEFEND') {
            if (target.faction !== faction)
                return false; // Lost it
        }
        // Insurrection validity
        if (m.type === 'INSURRECTION') {
            if (target.faction === faction)
                return false; // We own it now
        }
        return true;
    });
}
/**
 * Compatibility wrapper - returns empty array.
 * @deprecated Use updateMissions instead
 */
const generateGoals = (state, faction, theaters, profile) => {
    return [];
};
exports.generateGoals = generateGoals;
