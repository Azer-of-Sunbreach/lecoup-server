/**
 * Territorial Domain Module
 * 
 * Exports all territorial stats calculation functions.
 */

export {
    // Types
    type RevenueStats,
    type RuralFoodStats,
    type CityFoodStats,
    type DefenseStats,
    type LeaderInfo,
    type TerritorialStats,

    // Main calculation function
    calculateTerritorialStats,

    // Individual stats calculators
    calculateRevenueStats,
    calculateRuralFoodStats,
    calculateCityFoodStats,
    calculateDefenseStats,
    getLocationLeaders,

    // Faction-level calculations
    calculateFactionRevenue,

    // UI helper functions
    canChangeTaxLevel,
    canChangeFoodCollection
} from './territorialStats';
