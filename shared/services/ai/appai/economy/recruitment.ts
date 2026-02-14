/**
 * Recruitment Module - AI troop recruitment logic (Application wrapper)
 * 
 * This file re-exports the shared recruitment logic for Application use.
 * The actual implementation is in shared/services/ai/economy/recruitment.ts.
 * 
 * @see shared/services/ai/economy/recruitment.ts - Shared implementation
 * @module recruitment
 */

import { FactionId, Location, Army, Road, Character } from '../../../../types';
import { AIBudget, FactionPersonality } from '../types';
import { InsurrectionAlert } from '../strategy/insurrectionDefense';
import { handleRecruitment as sharedHandleRecruitment } from '../../economy/recruitment';
import { InsurrectionAlert as SharedInsurrectionAlert } from '../../economy/types';

// Re-export types for backwards compatibility
export type { InsurrectionAlert } from '../strategy/insurrectionDefense';

/**
 * Handle troop recruitment for AI faction.
 * 
 * Wrapper around shared implementation for backwards compatibility.
 * Adapts Application-specific types to shared interface.
 * 
 * @param faction - Faction recruiting
 * @param locations - Locations array (modified in place)
 * @param armies - Armies array (modified in place)
 * @param roads - Roads array (for immediate dispatch)
 * @param budget - AI budget
 * @param profile - Faction personality
 * @param turn - Current game turn
 * @param currentGold - Available gold for spending
 * @param insurrectionAlerts - Optional alerts from insurrection defense module
 * @param characters - Optional leaders array for CONSCRIPTION discount check
 * @returns Remaining gold after recruitment
 */
export function handleRecruitment(
    faction: FactionId,
    locations: Location[],
    armies: Army[],
    roads: Road[],
    budget: AIBudget,
    profile: FactionPersonality,
    turn: number,
    currentGold: number,
    insurrectionAlerts: InsurrectionAlert[] = [],
    characters: Character[] = []
): { remainingGold: number, updatedCharacters: Character[] } {
    // Convert Application InsurrectionAlert to shared type (they're compatible)
    const sharedAlerts: SharedInsurrectionAlert[] = insurrectionAlerts;
    
    // Call shared implementation with minimal interface adapters
    const result = sharedHandleRecruitment(
        faction,
        locations,
        armies,
        roads,
        { total: budget.total },           // RecruitmentBudgetInfo
        { aggressiveness: profile.aggressiveness },  // RecruitmentPersonalityInfo
        turn,
        currentGold,
        sharedAlerts,
        characters
    );
    
    // Return backwards-compatible result
    return {
        remainingGold: result.remainingGold,
        updatedCharacters: result.updatedCharacters
    };
}
