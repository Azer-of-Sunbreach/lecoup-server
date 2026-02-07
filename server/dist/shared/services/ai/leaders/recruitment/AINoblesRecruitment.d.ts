/**
 * AI Nobles Recruitment Service
 *
 * Orchestrates the full AI recruitment decision for NOBLES faction:
 * 1. Check if recruitment is possible (has territories, has available leaders)
 * 2. Filter leaders based on conditions (territories vs leaders, revenues)
 * 3. Evaluate available leaders and select the best
 * 4. Select fief location (rural if surplus >= 50, city otherwise)
 * 5. Execute recruitment if leader value > fief cost
 *
 * Unlike CONSPIRATORS who pay gold, NOBLES grant fiefdoms (30 food or 30 gold/turn).
 *
 * @module shared/services/ai/leaders/recruitment
 */
import { GameState } from '../../../../types';
export interface AINoblesRecruitmentResult {
    /** Updated game state after recruitment processing */
    updatedState: Partial<GameState>;
    /** Whether a leader was recruited this turn */
    leaderRecruited: boolean;
    /** ID of recruited leader (if any) */
    recruitedLeaderId?: string;
    /** Fief location granted (if any) */
    fiefLocationId?: string;
    /** Gold bonus from recruitment (baron_ystrir, duke_great_plains) */
    goldBonus?: number;
    /** New army created (duke_esmarch) */
    newArmy?: {
        strength: number;
        locationId: string;
    };
    /** Insurrection triggered (georges_cadal, duke_hornvale) */
    triggerInsurrection?: {
        locationId: string;
        budget: number;
    };
    /** Log messages for debugging */
    logs: string[];
}
/**
 * Process AI recruitment for NOBLES faction.
 * Call this during the AI turn phase.
 *
 * Returns updated state and recruitment results.
 */
export declare function processAINoblesRecruitment(state: GameState): AINoblesRecruitmentResult;
/**
 * Apply recruitment results to game state.
 * Handles gold bonuses and army creation.
 */
export declare function applyNoblesRecruitmentResults(state: GameState, result: AINoblesRecruitmentResult): GameState;
