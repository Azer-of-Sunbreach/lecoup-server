"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseMapRules = void 0;
const types_1 = require("../../types");
const territorialStats_1 = require("../../services/domain/territorial/territorialStats");
const constants_1 = require("../../constants");
class BaseMapRules {
    getInitialCharacters() {
        return [];
    }
    calculateEconomy(state, locations, armies, characters, roads) {
        // Pass 1: Rural Production
        let tempLocs = locations.map(loc => {
            if (loc.type === types_1.LocationType.RURAL) {
                let base = Math.floor(loc.population / 10000);
                let mult = loc.ruralCategory === types_1.RuralCategory.FERTILE ? 3 : loc.ruralCategory === types_1.RuralCategory.ORDINARY ? 2 : 1;
                let bonus = loc.isCoastal ? constants_1.BONUS_FISHING_HUNTING : constants_1.BONUS_HUNTING_ONLY;
                let collModUnit = Math.floor(loc.population / 20000);
                let collMap = { 'VERY_LOW': -2, 'LOW': -1, 'NORMAL': 0, 'HIGH': 1, 'VERY_HIGH': 2 };
                let collectionMod = collMap[loc.foodCollectionLevel || 'NORMAL'] * collModUnit;
                // Burned Fields Deduction
                const burnedFields = loc.burnedFields || 0;
                const foodProd = Math.max(0, (base * mult) + bonus + collectionMod - burnedFields);
                // Armies consume from foodSourceId
                const armiesDrawingFromHere = armies.filter(a => a.foodSourceId === loc.id);
                const armyConsumption = Math.ceil(armiesDrawingFromHere.reduce((sum, a) => sum + a.strength, 0) / 1000);
                // Governor Policy: Appease the Minds
                // Cost is subtracted from net production (before it's sent to city or stored)
                const governorFoodCost = (loc.governorPolicies?.[types_1.GovernorPolicy.APPEASE_MINDS])
                    ? (0, territorialStats_1.getAppeaseFoodCost)(loc.population)
                    : 0;
                return { ...loc, foodIncome: Math.max(0, foodProd - armyConsumption - governorFoodCost), governorFoodCost };
            }
            return loc;
        });
        // Pass 2: City Consumption & Gold
        return tempLocs.map(loc => {
            if (loc.type === types_1.LocationType.CITY) {
                // Food Consumption Modifier based on Trade Tax Level
                let tradeFoodConsMod = 0;
                if (loc.tradeTaxLevel === 'HIGH')
                    tradeFoodConsMod = 2;
                else if (loc.tradeTaxLevel === 'VERY_HIGH')
                    tradeFoodConsMod = 4;
                else if (loc.tradeTaxLevel === 'LOW')
                    tradeFoodConsMod = -2;
                else if (loc.tradeTaxLevel === 'VERY_LOW')
                    tradeFoodConsMod = -4;
                // Consumption from garrison specifically located in the city
                const garrison = armies.filter(a => a.locationId === loc.id && a.locationType === 'LOCATION').reduce((s, a) => s + a.strength, 0);
                const garrisonCons = Math.ceil(garrison / 1000);
                const popCons = Math.ceil(loc.population / 1000);
                // Governor Policy: Appease the Minds
                const governorFoodCost = (loc.governorPolicies?.[types_1.GovernorPolicy.APPEASE_MINDS])
                    ? (0, territorialStats_1.getAppeaseFoodCost)(loc.population)
                    : 0;
                const consumption = popCons + garrisonCons + tradeFoodConsMod + governorFoodCost;
                let inflow = 0;
                let rural;
                if (loc.linkedLocationId) {
                    rural = tempLocs.find(l => l.id === loc.linkedLocationId);
                    if (rural && rural.faction === loc.faction) {
                        inflow = rural.foodIncome;
                    }
                }
                let smugglingBonus = 0;
                // Smuggler Ability:
                // If leader with SMUGGLER ability is in city AND linked rural area is controlled by ANOTHER faction
                // Generate max(5, min(15, ruralFoodProd))
                if (rural && rural.faction !== loc.faction) {
                    // Leaders with MOVING status don't count - they're in transit
                    const smugglerLeader = characters.find(c => c.locationId === loc.id && c.faction === loc.faction && c.status !== types_1.CharacterStatus.MOVING && c.stats.ability.includes('SMUGGLER'));
                    if (smugglerLeader) {
                        // We need rural base production for calculation. 
                        // Rural object has 'foodIncome' which is net production from Pass 1.
                        // Use rural.foodIncome as base for "ruralFoodProd".
                        smugglingBonus = Math.max(5, Math.min(15, rural.foodIncome));
                    }
                }
                const foodNet = inflow - consumption + smugglingBonus;
                // Gold Calculation with Specific Trade Tax Logic
                let tradeGold = 0;
                // Reuse 'rural' (linkedLocation) logic, ensuring we recalculate neighbors carefully
                if (rural && rural.faction === loc.faction) {
                    const neighbors = roads
                        .filter((r) => r.from === rural.id || r.to === rural.id)
                        .map((r) => r.from === rural.id ? r.to : r.from)
                        .map((id) => tempLocs.find(l => l.id === id));
                    neighbors.forEach(n => {
                        if (n && n.type === types_1.LocationType.RURAL) {
                            let baseTrade = (n.faction === loc.faction) ? 8 : 3;
                            let modifiedTrade = baseTrade;
                            if (loc.tradeTaxLevel === 'VERY_LOW') {
                                modifiedTrade = (n.faction === loc.faction) ? 4 : 1;
                            }
                            else if (loc.tradeTaxLevel === 'LOW') {
                                modifiedTrade = (n.faction === loc.faction) ? 6 : 2;
                            }
                            else if (loc.tradeTaxLevel === 'HIGH') {
                                modifiedTrade = (n.faction === loc.faction) ? 10 : 4;
                            }
                            else if (loc.tradeTaxLevel === 'VERY_HIGH') {
                                modifiedTrade = (n.faction === loc.faction) ? 12 : 5;
                            }
                            tradeGold += modifiedTrade;
                        }
                    });
                }
                let managerBonus = 0;
                // Leaders with MOVING status don't count - they're in transit
                characters.filter(c => c.locationId === loc.id && c.status !== 'DEAD' && c.status !== types_1.CharacterStatus.MOVING && c.faction === loc.faction).forEach(leader => { if (leader.stats.ability.includes('MANAGER') && loc.type === types_1.LocationType.CITY)
                    managerBonus += 20; });
                let baseGold = Math.floor(loc.population / 1000);
                const taxMap = { 'VERY_LOW': -1, 'LOW': -0.5, 'NORMAL': 0, 'HIGH': 1, 'VERY_HIGH': 2 };
                let personalTaxMod = taxMap[loc.taxLevel || 'NORMAL'];
                let goldTaxPart = Math.floor(baseGold * personalTaxMod);
                // Burned Districts Deduction
                const burnedDistricts = loc.burnedDistricts || 0;
                const totalGold = Math.max(0, baseGold + goldTaxPart + tradeGold + managerBonus - burnedDistricts);
                return { ...loc, goldIncome: totalGold, foodIncome: foodNet, governorFoodCost, smugglingBonus };
            }
            return loc;
        });
    }
}
exports.BaseMapRules = BaseMapRules;
