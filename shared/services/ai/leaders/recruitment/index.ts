/**
 * AI Leader Recruitment Module
 * 
 * Exports all recruitment-related services for AI leader management.
 * 
 * @module shared/services/ai/leaders/recruitment
 */

// CONSPIRATORS Recruitment
export {
    calculateRecruitmentBudgetReservation,
    processAIRecruitment,
    processConspiratorRecruitmentTurn,
    type AIRecruitmentResult,
    type RecruitmentBudgetAllocation
} from './AIConspiratorsRecruitment';

export {
    calculateSavingsAmount,
    calculateSavingsForTurn,
    updateRecruitmentFund,
    consumeRecruitmentFund,
    getRecruitmentFund,
    findSeizeGoldTarget,
    RECRUITMENT_TARGET,
    SEIZE_GOLD_MIN_STABILITY,
    ENABLE_RECRUITMENT_LOGS,
    type RecruitmentFundState,
    type SavingsCalculationResult,
    type FundUpdateResult
} from './RecruitmentFundManager';

// NOBLES Recruitment
export {
    processAINoblesRecruitment,
    applyNoblesRecruitmentResults,
    type AINoblesRecruitmentResult
} from './AINoblesRecruitment';

export {
    calculateFoodSurplus,
    selectFiefLocation,
    canAffordRecruitment,
    getFactionRevenues,
    MIN_FOOD_SURPLUS_FOR_RURAL_FIEF,
    CITY_FIEF_GOLD_COST_PER_TURN,
    RURAL_FIEF_FOOD_COST_PER_TURN,
    MIN_LEADER_VALUE_FOR_CITY_FIEF,
    type CityRuralPair,
    type FoodSurplusResult,
    type FiefSelectionResult
} from './NoblesRecruitmentFiefManager';
