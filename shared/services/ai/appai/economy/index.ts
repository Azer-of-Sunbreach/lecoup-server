// AI Economy Module Index - Public exports

export * from './types';

// Budget allocation
export {
    applyRepublicanEarlyGameOverride,
    applyWeakArmyOverride,
    applyBalancedRecruitmentOverride,
    allocateSiegeBudget,
    calculateAvailableGold
} from './budget';

// Tax optimization
export { optimizeCityTaxes, optimizeRuralCollection } from './taxes';

// Grain embargo
export { handleGrainEmbargo } from './embargo';

// Logistics
export { manageLogistics } from './logistics';

// Recruitment
export { handleRecruitment } from './recruitment';

// Fortifications
export { handleFortifications } from './fortifications';

// Emergency seize actions
export { handleSeizeActions } from './seize';

// Stability management (VERY_HIGH enforcement, faction thresholds) - Re-exported from shared
export {
    enforceHighTaxLimits,
    getMinimumStabilityThreshold,
    detectEmergency,
    STABILITY_THRESHOLDS
} from '../../economy/stabilityManagement';

// Stability prediction (impact calculation before actions)
export {
    canAffordTaxIncrease,
    getMaxAllowedTaxLevel,
    calculateRecoveryRate,
    estimateRecoveryTurns
} from './stabilityPredictor';
