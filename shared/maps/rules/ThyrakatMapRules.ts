import { BaseMapRules } from './BaseMapRules';

/**
 * ThyrakatMapRules - Rules for the Thyrakat map
 * 
 * Map-specific overrides:
 * - Food production uses baseDivisor of 20,000 (configured in foodProductionConfig.ts)
 *   instead of the default 10,000 for other maps.
 * - Economy calculation is inherited from BaseMapRules (delegates to territorialStats.ts).
 */
export class ThyrakatMapRules extends BaseMapRules {
    // Food production divisor is configured in shared/data/maps/foodProductionConfig.ts
    // No override needed — BaseMapRules.calculateEconomy passes mapId to territorialStats.ts
}

