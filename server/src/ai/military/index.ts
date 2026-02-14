export * from '../../../../shared/services/ai/appai/military/index';
// Re-export siege priority functions from shared military module
export { findBestSiegeOpportunity, reserveSiegeBudget, findSiegeOpportunities, selectBestSiegeOpportunity } from '../../../../shared/services/ai/military';
export type { SiegeOpportunity } from '../../../../shared/services/ai/military';
