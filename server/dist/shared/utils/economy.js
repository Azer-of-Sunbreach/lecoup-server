"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateEconomyAndFood = void 0;
const types_1 = require("../types");
const constants_1 = require("../constants");
const calculateEconomyAndFood = (locs, armies, chars, roads) => {
    const windward = locs.find(l => l.id === 'windward');
    const isEmbargoActive = windward ? !windward.isGrainTradeActive : false;
    // Pass 1: Rural Production
    let tempLocs = locs.map(loc => {
        if (loc.type === types_1.LocationType.RURAL) {
            let base = Math.floor(loc.population / 10000);
            let mult = loc.ruralCategory === types_1.RuralCategory.FERTILE ? 3 : loc.ruralCategory === types_1.RuralCategory.ORDINARY ? 2 : 1;
            let bonus = loc.isCoastal ? constants_1.BONUS_FISHING_HUNTING : constants_1.BONUS_HUNTING_ONLY;
            // Saltcraw exception: Fishing only (+4) instead of Fishing/Hunting (+10)
            if (loc.id === 'saltcraw_viscounty')
                bonus = 4;
            let collModUnit = Math.floor(loc.population / 20000);
            let collMap = { 'VERY_LOW': -2, 'LOW': -1, 'NORMAL': 0, 'HIGH': 1, 'VERY_HIGH': 2 };
            let collectionMod = collMap[loc.foodCollectionLevel || 'NORMAL'] * collModUnit;
            // Embargo Effect on Great Plains
            let embargoBonus = 0;
            if (isEmbargoActive && loc.id === 'great_plains') {
                embargoBonus = 60;
            }
            // Burned Fields Deduction
            const burnedFields = loc.burnedFields || 0;
            const foodProd = Math.max(0, (base * mult) + bonus + collectionMod + embargoBonus - burnedFields);
            // Armies consume from foodSourceId
            const armiesDrawingFromHere = armies.filter(a => a.foodSourceId === loc.id);
            const armyConsumption = Math.ceil(armiesDrawingFromHere.reduce((sum, a) => sum + a.strength, 0) / 1000);
            return { ...loc, foodIncome: Math.max(0, foodProd - armyConsumption) };
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
            let embargoConsMod = 0;
            if (isEmbargoActive) {
                embargoConsMod = 10;
            }
            // Consumption from garrison specifically located in the city
            const garrison = armies.filter(a => a.locationId === loc.id && a.locationType === 'LOCATION').reduce((s, a) => s + a.strength, 0);
            const garrisonCons = Math.ceil(garrison / 1000);
            const popCons = Math.ceil(loc.population / 1000);
            const consumption = popCons + garrisonCons + tradeFoodConsMod + embargoConsMod;
            let inflow = 0;
            if (loc.linkedLocationId) {
                const rural = tempLocs.find(l => l.id === loc.linkedLocationId);
                if (rural && rural.faction === loc.faction) {
                    inflow = rural.foodIncome;
                }
            }
            const foodNet = inflow - consumption;
            // Gold Calculation with Specific Trade Tax Logic
            let tradeGold = 0;
            const ruralId = loc.linkedLocationId;
            const rural = tempLocs.find(l => l.id === ruralId);
            if (rural && rural.faction === loc.faction) {
                const neighbors = roads.filter((r) => r.from === rural.id || r.to === rural.id).map((r) => r.from === rural.id ? r.to : r.from).map((id) => tempLocs.find(l => l.id === id));
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
            chars.filter(c => c.locationId === loc.id && c.status !== 'DEAD' && c.faction === loc.faction).forEach(leader => { if (leader.stats.ability.includes('MANAGER') && loc.type === types_1.LocationType.CITY)
                managerBonus += 20; });
            let baseGold = Math.floor(loc.population / 1000);
            const taxMap = { 'VERY_LOW': -1, 'LOW': -0.5, 'NORMAL': 0, 'HIGH': 1, 'VERY_HIGH': 2 };
            let personalTaxMod = taxMap[loc.taxLevel || 'NORMAL'];
            let goldTaxPart = Math.floor(baseGold * personalTaxMod);
            let bonusGold = 0;
            if (['sunbreach', 'port_de_sable', 'mirebridge', 'stormbay'].includes(loc.id)) {
                if (loc.id === 'sunbreach')
                    bonusGold += 20;
                if (loc.id === 'port_de_sable')
                    bonusGold += 35;
                if (loc.id === 'mirebridge')
                    bonusGold += 10;
                if (loc.id === 'stormbay')
                    bonusGold += 10;
            }
            if (loc.id === 'windward') {
                if (loc.isGrainTradeActive)
                    bonusGold += 20;
                else
                    bonusGold -= 20;
            }
            // Gré-au-vent special income
            if (loc.id === 'gre_au_vent')
                bonusGold += 25;
            // Burned Districts Deduction
            const burnedDistricts = loc.burnedDistricts || 0;
            const totalGold = Math.max(0, baseGold + goldTaxPart + tradeGold + bonusGold + managerBonus - burnedDistricts);
            return { ...loc, goldIncome: totalGold, foodIncome: foodNet };
        }
        return loc;
    });
};
exports.calculateEconomyAndFood = calculateEconomyAndFood;
