/**
 * Shared Recruitment Module - AI troop recruitment logic
 *
 * Handles strategic recruitment based on threats, massing points, and income.
 * Integrates with insurrection defense to prioritize threatened zones.
 * Supports CONSCRIPTION ability for discounted recruitment.
 *
 * Used by both Application (solo) and Server (multiplayer).
 *
 * @module shared/services/ai/economy/recruitment
 */
import { FactionId, Location, Army, Road, Character } from '../../../types';
import { InsurrectionAlert, RecruitmentResult, RecruitmentBudgetInfo, RecruitmentPersonalityInfo } from './types';
/**
 * Handle troop recruitment for AI faction.
 *
 * Priority: Insurrection defense > Massing points > Low stability zones > High income
 * Supports CONSCRIPTION ability for discounted recruitment (15g instead of 50g).
 *
 * @param faction - Faction recruiting
 * @param locations - Locations array (modified in place)
 * @param armies - Armies array (modified in place)
 * @param roads - Roads array (for immediate dispatch)
 * @param budget - AI budget (minimal interface)
 * @param profile - Faction personality (minimal interface)
 * @param turn - Current game turn
 * @param currentGold - Available gold for spending
 * @param insurrectionAlerts - Optional alerts from insurrection defense module
 * @param characters - Leaders array for CONSCRIPTION discount check
 * @returns Recruitment result with remaining gold and updated characters
 */
export declare function handleRecruitment(faction: FactionId, locations: Location[], armies: Army[], roads: Road[], budget: RecruitmentBudgetInfo, profile: RecruitmentPersonalityInfo, turn: number, currentGold: number, insurrectionAlerts?: InsurrectionAlert[], characters?: Character[]): RecruitmentResult;
