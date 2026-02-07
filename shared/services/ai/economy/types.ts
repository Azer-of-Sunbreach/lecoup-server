/**
 * AI Economy Types
 * 
 * Shared types for AI economic decision-making.
 * 
 * @module shared/services/ai/economy
 */

// ============================================================================
// INSURRECTION ALERTS (for recruitment prioritization)
// ============================================================================

/**
 * Alert for insurrection threats, used by recruitment module.
 * Simplified from InsurrectionThreat for cross-module use.
 */
export interface InsurrectionAlert {
    locationId: string;
    turnsUntilThreat: number;
    estimatedInsurgents: number;
    requiredGarrison: number;
    priority: number; // Higher = more urgent
}

// ============================================================================
// RECRUITMENT TYPES
// ============================================================================

export type RecruitmentReason = 
    | 'INSURRECTION_ADJACENT'  // Adjacent to threatened zone
    | 'INSURRECTION_DIRECT'    // Direct recruitment in threatened zone (fallback)
    | 'MASSING'                // Existing army to reinforce
    | 'THREAT'                 // Low stability zone
    | 'INCOME';                // High income location

export interface RecruitmentTarget {
    locationId: string;
    locationName: string;
    priority: number;
    reason: RecruitmentReason;
    linkedThreatenedLocationId?: string;
    isConscription: boolean;
    conscriptionLeaderId?: string;
}

export interface RecruitmentResult {
    remainingGold: number;
    updatedCharacters: import('../../../types').Character[];
    recruitmentsPerformed: number;
    conscriptionsPerformed: number;
}

// ============================================================================
// AI BUDGET & PERSONALITY (minimal interface for recruitment)
// ============================================================================

/**
 * Minimal budget interface for recruitment.
 * Compatible with both Application and Server AIBudget types.
 */
export interface RecruitmentBudgetInfo {
    total: number;
}

/**
 * Minimal personality interface for recruitment.
 * Compatible with both Application and Server FactionPersonality types.
 */
export interface RecruitmentPersonalityInfo {
    aggressiveness: number;  // 0-1
}
