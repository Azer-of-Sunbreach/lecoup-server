/**
 * Faction Strategy Interface and Implementations
 *
 * Defines strategy configuration for each faction, including:
 * - Risk tolerance thresholds
 * - Priority settings
 * - Governor preferences
 * - Special behaviors
 *
 * @module shared/services/ai/leaders/strategies
 */
import { FactionId } from '../../../../types';
import { FactionStrategy } from '../types';
/**
 * Get the strategy configuration for a faction.
 */
export declare function getStrategyForFaction(faction: FactionId): FactionStrategy;
/**
 * Check if an agent should GO_DARK (reduce activity) at current risk.
 */
export declare function shouldGoDark(currentRisk: number, strategy: FactionStrategy, isPreparingGrandInsurrection: boolean): boolean;
/**
 * Check if an agent should EXFILTRATE (abandon mission) at current risk.
 */
export declare function shouldExfiltrate(currentRisk: number, strategy: FactionStrategy, budget: number, isPreparingGrandInsurrection: boolean): boolean;
/**
 * Check if a VIP leader can be used for clandestine operations.
 * Only in exceptional circumstances.
 */
export declare function canUseVIPForClandestine(strategy: FactionStrategy, opportunityScore: number, otherAgentsAvailable: number): boolean;
