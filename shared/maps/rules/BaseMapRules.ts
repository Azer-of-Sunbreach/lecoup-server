import { MapRules } from '../types';
import { GameState, Location, Army, Character, Road, LocationType } from '../../types';
import {
    calculateRevenueStats,
    calculateRuralFoodStats,
    calculateCityFoodStats
} from '../../services/domain/territorial/territorialStats';

/**
 * BaseMapRules — Default economy calculation for all maps.
 *
 * Delegates to territorialStats.ts pure functions (single source of truth).
 * Writes goldIncome (gross, before governor policy costs) and foodIncome on Location objects.
 * Governor policy gold costs are deducted separately by governorProcessor.ts.
 */
export class BaseMapRules implements MapRules {
    getInitialCharacters(): any[] {
        return [];
    }

    calculateEconomy(state: GameState, locations: Location[], armies: Army[], characters: Character[], roads: Road[]): Location[] {
        const mapId = (state as any).mapId || 'larion_alternate';

        // Pass 1: Rural food production
        let tempLocs = locations.map(loc => {
            if (loc.type === LocationType.RURAL) {
                const ruralStats = calculateRuralFoodStats(loc, locations, armies, characters, mapId);
                const foodIncome = ruralStats ? Math.max(0, ruralStats.netProduction) : 0;
                const governorFoodCost = ruralStats?.governorFoodCost || 0;
                return { ...loc, foodIncome, governorFoodCost };
            }
            return loc;
        });

        // Pass 2: City gold income + food consumption
        return tempLocs.map(loc => {
            if (loc.type === LocationType.CITY) {
                // Gold income (gross, before governor policy costs — those are handled by governorProcessor)
                const revenueStats = calculateRevenueStats(loc, tempLocs, roads, characters);
                const goldIncome = revenueStats?.grossTotal || 0;

                // Food flow
                const cityFoodStats = calculateCityFoodStats(loc, tempLocs, armies, characters, mapId);
                const foodIncome = cityFoodStats?.total || 0;
                const smugglingBonus = cityFoodStats?.smugglingBonus || 0;
                const governorFoodCost = cityFoodStats?.governorActions || 0;

                return { ...loc, goldIncome, foodIncome, smugglingBonus, governorFoodCost };
            }
            return loc;
        });
    }
}
