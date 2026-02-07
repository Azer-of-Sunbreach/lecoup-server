/**
 * Internal Factions Domain Module
 * 
 * Exports domain logic for the Internal Factions recruitment system.
 */

export {
    // Knightly Coup
    executeKnightlyCoupChoice,
    KNIGHTLY_COUP_GOLD_COST,
    type KnightlyCoupResult,
    // Victory of the Rabble
    executeRabbleVictoryChoice,
    RABBLE_MISSION_BUDGET,
    type RabbleVictoryResult,
    // Merchant Domination
    executeMerchantDominationChoice,
    MERCHANT_DOMINATION_GOLD_COST,
    type MerchantDominationResult,
    // Helper functions
    hasActiveAbility,
    getActiveAbilities,
    getEffectiveStabilityModifier
} from './internalFactions';
