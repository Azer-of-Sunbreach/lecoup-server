/**
 * foodProductionConfig.ts - Map-specific food production parameters
 * 
 * Defines per-map overrides for rural food production calculations.
 * Default values match the base game rules (Larion, Valis, etc.).
 * 
 * Used by:
 * - MapRules.calculateEconomy (turn processing)
 * - calculateRuralFoodStats (UI display & governor policy checks)
 */

import { MapId } from '../../maps/types';

// ============================================================================
// TYPES
// ============================================================================

export interface FoodProductionConfig {
    /** Population divisor for base food production (default: 10000 → 1 food per 10k inhabitants) */
    baseDivisor: number;
}

// ============================================================================
// DEFAULT CONFIG (used by all maps unless overridden)
// ============================================================================

const DEFAULT_FOOD_CONFIG: FoodProductionConfig = {
    baseDivisor: 10000,
};

// ============================================================================
// MAP-SPECIFIC OVERRIDES
// ============================================================================

const MAP_FOOD_CONFIG_OVERRIDES: Partial<Record<MapId, Partial<FoodProductionConfig>>> = {
    thyrakat: {
        baseDivisor: 20000,
    },
};

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get the food production config for a given map.
 * Returns default values merged with any map-specific overrides.
 */
export function getFoodProductionConfig(mapId?: string): FoodProductionConfig {
    if (!mapId) return DEFAULT_FOOD_CONFIG;

    const overrides = MAP_FOOD_CONFIG_OVERRIDES[mapId as MapId];
    if (!overrides) return DEFAULT_FOOD_CONFIG;

    return { ...DEFAULT_FOOD_CONFIG, ...overrides };
}
