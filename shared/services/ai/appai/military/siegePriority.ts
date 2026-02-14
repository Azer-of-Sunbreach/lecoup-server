/**
 * Siege Priority Module (Application Wrapper)
 * 
 * Re-exports shared siege priority logic for backwards compatibility.
 * 
 * @see shared/services/ai/military/siegePriority.ts - Core logic
 * @module Application/services/ai/military/siegePriority
 */

// Re-export everything from shared - Import directly from source file
export {
    findSiegeOpportunities,
    selectBestSiegeOpportunity,
    findBestSiegeOpportunity,
    reserveSiegeBudget
} from '../../military/siegePriority';

export type { SiegeOpportunity } from '../../military/siegePriority';
