import { BaseMapRules } from './BaseMapRules';
import { GameState, Location, Army, Character, Road, LocationType, RuralCategory, GovernorPolicy, CharacterStatus } from '../../types';
import { CHARACTERS_NEW } from '../../data/characters';
import { BONUS_HUNTING_ONLY, BONUS_FISHING_HUNTING } from '../../data';

export class LarionMapRules extends BaseMapRules {
    getInitialCharacters(): any[] {
        return CHARACTERS_NEW;
    }

    calculateEconomy(state: GameState, locations: Location[], armies: Army[], characters: Character[], roads: Road[]): Location[] {
        const windward = locations.find(l => l.id === 'windward');
        const isEmbargoActive = windward ? !windward.isGrainTradeActive : false;

        // Pass 1: Rural Production
        let tempLocs = locations.map(loc => {
            if (loc.type === LocationType.RURAL) {
                let base = Math.floor(loc.population / 10000);
                let mult = loc.ruralCategory === RuralCategory.FERTILE ? 3 : loc.ruralCategory === RuralCategory.ORDINARY ? 2 : 1;
                let bonus = loc.isCoastal ? BONUS_FISHING_HUNTING : BONUS_HUNTING_ONLY;

                // Saltcraw exception: Fishing only (+4) instead of Fishing/Hunting (+10)
                if (loc.id === 'saltcraw_viscounty') bonus = 4;

                let collModUnit = Math.floor(loc.population / 20000);
                let collMap: Record<string, number> = { 'VERY_LOW': -2, 'LOW': -1, 'NORMAL': 0, 'HIGH': 1, 'VERY_HIGH': 2 };
                let collectionMod = collMap[loc.foodCollectionLevel || 'NORMAL'] * collModUnit;

                // Embargo Effect on Great Plains
                let embargoBonus = 0;
                if (isEmbargoActive && loc.id === 'great_plains') {
                    embargoBonus = 60;
                }

                // Burned Fields Deduction
                const burnedFields = loc.burnedFields || 0;

                const governorFoodCost = 0; // Handled in BaseMapRules now

                const foodProd = Math.max(0, (base * mult) + bonus + collectionMod + embargoBonus - burnedFields - governorFoodCost);

                // Armies consume from foodSourceId
                const armiesDrawingFromHere = armies.filter(a => a.foodSourceId === loc.id);
                const armyConsumption = Math.ceil(armiesDrawingFromHere.reduce((sum, a) => sum + a.strength, 0) / 1000);

                return { ...loc, foodIncome: Math.max(0, foodProd - armyConsumption) };
            }
            return loc;
        });

        // Pass 2: City Consumption & Gold
        return tempLocs.map(loc => {
            if (loc.type === LocationType.CITY) {
                // Food Consumption Modifier based on Trade Tax Level
                let tradeFoodConsMod = 0;
                if (loc.tradeTaxLevel === 'HIGH') tradeFoodConsMod = 2;
                else if (loc.tradeTaxLevel === 'VERY_HIGH') tradeFoodConsMod = 4;
                else if (loc.tradeTaxLevel === 'LOW') tradeFoodConsMod = -2;
                else if (loc.tradeTaxLevel === 'VERY_LOW') tradeFoodConsMod = -4;

                let embargoConsMod = 0;
                if (isEmbargoActive) {
                    embargoConsMod = 10;
                }

                // Consumption from garrison specifically located in the city
                const garrison = armies.filter(a => a.locationId === loc.id && a.locationType === 'LOCATION').reduce((s, a) => s + a.strength, 0);
                const garrisonCons = Math.ceil(garrison / 1000);
                const popCons = Math.ceil(loc.population / 1000);

                const governorFoodCost = 0; // Handled in BaseMapRules now

                const consumption = popCons + garrisonCons + tradeFoodConsMod + embargoConsMod + governorFoodCost;

                let inflow = 0;
                let rural: Location | undefined;
                if (loc.linkedLocationId) {
                    rural = tempLocs.find(l => l.id === loc.linkedLocationId);
                    if (rural && rural.faction === loc.faction) {
                        inflow = rural.foodIncome;
                    }
                }

                // Smuggler Ability: If leader with SMUGGLER ability is in city AND linked rural area is controlled by ANOTHER faction
                let smugglingBonus = 0;
                if (rural && rural.faction !== loc.faction) {
                    const smugglerLeader = characters.find(c => c.locationId === loc.id && c.faction === loc.faction && c.status !== CharacterStatus.MOVING && c.stats.ability.includes('SMUGGLER'));
                    if (smugglerLeader) {
                        smugglingBonus = Math.max(5, Math.min(15, rural.foodIncome));
                    }
                }

                // Rationing Bonus: Reduces civilian consumption by 50%
                let rationingBonus = 0;
                if (loc.governorPolicies?.[GovernorPolicy.RATIONING]) {
                    rationingBonus = Math.floor(loc.population / 2000);
                }

                const foodNet = inflow - consumption + smugglingBonus + rationingBonus;

                // Gold Calculation with Specific Trade Tax Logic
                let tradeGold = 0;
                // rural is already defined above, just reuse it
                if (!rural && loc.linkedLocationId) {
                    rural = tempLocs.find(l => l.id === loc.linkedLocationId);
                }

                if (rural && rural.faction === loc.faction) {
                    const neighbors = roads.filter((r: any) => r.from === rural.id || r.to === rural.id).map((r: any) => r.from === rural.id ? r.to : r.from).map((id: string) => tempLocs.find(l => l.id === id));

                    neighbors.forEach(n => {
                        if (n && n.type === LocationType.RURAL) {
                            let baseTrade = (n.faction === loc.faction) ? 8 : 3;
                            let modifiedTrade = baseTrade;

                            if (loc.tradeTaxLevel === 'VERY_LOW') {
                                modifiedTrade = (n.faction === loc.faction) ? 4 : 1;
                            } else if (loc.tradeTaxLevel === 'LOW') {
                                modifiedTrade = (n.faction === loc.faction) ? 6 : 2;
                            } else if (loc.tradeTaxLevel === 'HIGH') {
                                modifiedTrade = (n.faction === loc.faction) ? 10 : 4;
                            } else if (loc.tradeTaxLevel === 'VERY_HIGH') {
                                modifiedTrade = (n.faction === loc.faction) ? 12 : 5;
                            }
                            tradeGold += modifiedTrade;
                        }
                    });
                }

                let managerBonus = 0;
                // Leaders with MOVING status don't count - they're in transit
                characters.filter(c => c.locationId === loc.id && c.status !== 'DEAD' && c.status !== CharacterStatus.MOVING && c.faction === loc.faction).forEach(leader => { if (leader.stats.ability.includes('MANAGER') && loc.type === LocationType.CITY) managerBonus += 20; });

                let baseGold = Math.floor(loc.population / 1000);
                const taxMap: Record<string, number> = { 'VERY_LOW': -1, 'LOW': -0.5, 'NORMAL': 0, 'HIGH': 1, 'VERY_HIGH': 2 };
                let personalTaxMod = taxMap[loc.taxLevel || 'NORMAL'];
                let goldTaxPart = Math.floor(baseGold * personalTaxMod);

                let bonusGold = 0;
                if (['sunbreach', 'port_de_sable', 'mirebridge', 'stormbay'].includes(loc.id)) {
                    if (loc.id === 'sunbreach') bonusGold += 20;
                    if (loc.id === 'port_de_sable') bonusGold += 35;
                    if (loc.id === 'mirebridge') bonusGold += 10;
                    if (loc.id === 'stormbay') bonusGold += 10;
                }
                if (loc.id === 'windward') {
                    if (loc.isGrainTradeActive) bonusGold += 20;
                    else bonusGold -= 20;
                }
                // Gré-au-vent special income
                if (loc.id === 'gre_au_vent') bonusGold += 25;

                // Burned Districts Deduction
                const burnedDistricts = loc.burnedDistricts || 0;

                const totalGold = Math.max(0, baseGold + goldTaxPart + tradeGold + bonusGold + managerBonus - burnedDistricts);

                return { ...loc, goldIncome: totalGold, foodIncome: foodNet };
            }
            return loc;
        });
    }
}
