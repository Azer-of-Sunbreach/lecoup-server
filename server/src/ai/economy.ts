// AI Economy Module - Server exports (direct imports to avoid re-export chain issues)

export * from '../../../shared/services/ai/appai/economy/types';

// Budget allocation
export {
    applyRepublicanEarlyGameOverride,
    applyWeakArmyOverride,
    applyBalancedRecruitmentOverride,
    allocateSiegeBudget,
    calculateAvailableGold
} from '../../../shared/services/ai/appai/economy/budget';

// Tax optimization
export { optimizeCityTaxes, optimizeRuralCollection } from '../../../shared/services/ai/appai/economy/taxes';

// Grain embargo
export { handleGrainEmbargo } from '../../../shared/services/ai/appai/economy/embargo';

// Logistics
export { manageLogistics } from '../../../shared/services/ai/appai/economy/logistics';

// Recruitment - Import from shared source
export { handleRecruitment } from '../../../shared/services/ai/economy/recruitment';

// Fortifications
export { handleFortifications } from '../../../shared/services/ai/appai/economy/fortifications';

// Emergency seize actions
export { handleSeizeActions } from '../../../shared/services/ai/appai/economy/seize';

// Stability management - Import directly from shared source
export {
    enforceHighTaxLimits,
    getMinimumStabilityThreshold,
    detectEmergency,
    STABILITY_THRESHOLDS
} from '../../../shared/services/ai/economy/stabilityManagement';

// Stability prediction
export {
    canAffordTaxIncrease,
    getMaxAllowedTaxLevel,
    calculateRecoveryRate,
    estimateRecoveryTurns
} from '../../../shared/services/ai/appai/economy/stabilityPredictor';

// Main economy manager
export { manageEconomy } from '../../../shared/services/ai/appai/economy';
