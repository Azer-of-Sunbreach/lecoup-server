/**
 * AI Military Module (Shared)
 * 
 * Shared AI military decision-making logic.
 * 
 * @module shared/services/ai/military
 */

export {
    findSiegeOpportunities,
    selectBestSiegeOpportunity,
    findBestSiegeOpportunity,
    reserveSiegeBudget
} from './siegePriority';

export type { SiegeOpportunity } from './siegePriority';

// Siege Execution (executing siege opportunities)
export { executeSiegeFromOpportunity, executeCaptureFromOpportunity } from './siegeExecution';
export type { SiegeExecutionResult } from './siegeExecution';

// Siege Sortie (breaking enemy sieges of our cities)
export {
    processSiegeSorties,
    findSiegedCities,
    evaluateSortieOpportunity
} from './siegeSortie';

export type { SiegeBreakOpportunity, CommanderCandidate, SortieResult } from './siegeSortie';
