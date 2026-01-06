import { GameState, FactionId, Army } from '../../../../shared/types';
import { AIBudget } from '../types';
/**
 * Apply Republican early game override (Turn 1-4).
 * Shifts budget heavily toward recruitment.
 */
export declare function applyRepublicanEarlyGameOverride(faction: FactionId, turn: number, budget: AIBudget): void;
/**
 * Apply weak army override - prioritize recruitment when forces are low.
 */
export declare function applyWeakArmyOverride(faction: FactionId, armies: Army[], budget: AIBudget): void;
/**
 * Apply balanced recruitment override - ensures recruitment doesn't consume insurrection budget.
 * Balances between recruitment needs and pending insurrection missions.
 */
export declare function applyBalancedRecruitmentOverride(faction: FactionId, state: GameState, budget: AIBudget, armies: Army[]): void;
/**
 * Allocate siege budget for active campaigns.
 * Takes from diplomacy and reserve to fund siege operations.
 * Note: All factions except NEUTRAL can siege (Nobles CAN siege, they just can't negotiate with neutrals).
 */
export declare function allocateSiegeBudget(faction: FactionId, state: GameState, budget: AIBudget): void;
/**
 * Calculate current gold available for spending.
 * Excludes siege money to protect it.
 */
export declare function calculateAvailableGold(budget: AIBudget): number;
