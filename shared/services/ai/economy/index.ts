/**
 * AI Economy Module
 * 
 * Shared AI economic decision-making logic.
 * 
 * @module shared/services/ai/economy
 */

export * from './types';
export { handleRecruitment } from './recruitment';

// Stability Management
export {
    STABILITY_THRESHOLDS,
    hasVeryHighWithoutLeader,
    reduceVeryHighToHigh,
    enforceHighTaxLimits,
    getMinimumStabilityThreshold,
    isBelowStabilityThreshold,
    detectEmergency,
    evaluateStabilizationValue,
    calculatePotentialStabilityGain
} from './stabilityManagement';
