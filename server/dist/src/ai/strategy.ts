// AI Strategy Management - Main orchestrator
// Refactored to use modular components

import { GameState, FactionId, AIMission } from '../../../shared/types';
import { AITheater, AIGoal, FactionPersonality } from './types';

// Import from new modular structure
import {
    analyzeTheaters as analyzeTheatersImpl,
    generateDefendMissions,
    generateCampaignMissions,
    generateDiplomacyMissions,
    generateRoadDefenseMissions
} from './strategy/index';

/**
 * Analyze the game map to identify theaters of operation.
 * Re-exported from theaters module for backward compatibility.
 */
export const analyzeTheaters = analyzeTheatersImpl;

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
export const updateMissions = (
    state: GameState,
    faction: FactionId,
    theaters: AITheater[],
    profile: FactionPersonality
): AIMission[] => {
    // 1. Retrieve existing missions
    let activeMissions = state.aiState?.[faction]?.missions || [];

    // 2. CLEANUP: Remove completed, failed, or invalid missions
    activeMissions = cleanupMissions(state, faction, activeMissions);

    // 3. GENERATE NEW MISSIONS

    // A. Defense missions (highest priority)
    generateDefendMissions(state, faction, theaters, profile, activeMissions);

    // B. Road defense missions (strategic road stage control)
    generateRoadDefenseMissions(state, faction, state.turn, activeMissions);

    // C. Campaign missions (offense)
    generateCampaignMissions(state, faction, theaters, profile, activeMissions);

    // D. Diplomacy missions (insurrection, negotiate, stabilize)
    generateDiplomacyMissions(state, faction, theaters, profile, activeMissions);

    // 4. SORT & RETURN by priority
    return activeMissions.sort((a, b) => b.priority - a.priority);
};

/**
 * Clean up invalid or completed missions.
 */
function cleanupMissions(
    state: GameState,
    faction: FactionId,
    missions: AIMission[]
): AIMission[] {
    return missions.filter(m => {
        // Remove completed or failed
        if (m.status === 'COMPLETED' || m.status === 'FAILED') return false;

        // Check target still exists
        const target = state.locations.find(l => l.id === m.targetId);
        if (!target) return false;

        // Ownership validity
        if (m.type === 'STABILIZE' || m.type === 'DEFEND') {
            if (target.faction !== faction) return false; // Lost it
        }

        // Insurrection validity
        if (m.type === 'INSURRECTION') {
            if (target.faction === faction) return false; // We own it now
        }

        return true;
    });
}

/**
 * Compatibility wrapper - returns empty array.
 * @deprecated Use updateMissions instead
 */
export const generateGoals = (
    state: GameState,
    faction: FactionId,
    theaters: AITheater[],
    profile: FactionPersonality
): AIGoal[] => {
    return [];
};
