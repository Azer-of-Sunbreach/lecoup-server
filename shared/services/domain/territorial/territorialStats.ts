/**
 * Territorial Stats Domain Service
 * 
 * Centralized calculation logic for the Territorial Menu.
 * This file follows Clean Hexagonal Architecture principles:
 * - Pure functions, no side effects
 * - No React/UI dependencies
 * - All formulas extracted from specifications
 */

import { Location, Army, Character, Road, LocationType, RuralCategory, FactionId, ManagementLevel, Convoy, NavalConvoy, GovernorPolicy, GOVERNOR_POLICY_COSTS } from '../../../types';
import { FORTIFICATION_LEVELS, BONUS_HUNTING_ONLY, BONUS_FISHING_HUNTING, PORT_SEQUENCE, getAppeaseFoodCost } from '../../../data';


// ============================================================================
// TYPES
// ============================================================================

/**
 * Revenue breakdown for cities
 */
export interface RevenueStats {
    personalTaxBase: number;      // Base from population
    personalTaxMod: number;       // Modifier from tax level
    tradeGold: number;            // From neighboring regions
    managerBonus: number;         // From MANAGER leaders
    specialIncome: number;        // City-specific bonuses
    embargoImpact: number;        // Windward embargo effect
    burnedDistricts: number;      // Sabotaged by clandestine ops
    improvedEconomyBonus: number; // From governor's Improve Economy policy (2 * statesmanship)
    governorActionsCost: number;  // Gold cost of active governor policies
    total: number;
}

/**
 * Food production breakdown for rural areas
 */
export interface RuralFoodStats {
    productionBase: number;       // Pop/10000
    fertilityEffect: number;      // Multiplier based on rural category
    collectionOrders: number;     // From slider
    huntingBonus: number;         // Hunting or Fishing+Hunting
    fishingBonus: number;         // Saltcraw only
    armyConsumption: number;      // Armies drawing from here
    embargoBonus: number;         // Great Plains if embargo
    burnedFields: number;         // Sabotaged by clandestine ops
    improvedEconomyBonus: number; // From governor's Improve Economy policy (2 * statesmanship)
    netProduction: number;        // Final production after consumption
    linkedCityConsumption: number; // For display in rural menu
    linkedCityStocks: number;     // For display in rural menu
}

/**
 * Food consumption breakdown for cities
 */
export interface CityFoodStats {
    populationConsumption: number;
    armyConsumption: number;
    governorActions: number;      // Food cost from governor policies (Appease the Minds)
    rationingBonus: number;       // Food saved by Rationing policy
    foodImports: number;          // From trade tax level
    embargoMalus: number;         // If grain embargo active
    ruralSupply: number;          // From linked rural area
    total: number;                // Net flow
    currentStocks: number;
    stockStatus: 'HEALTHY' | 'WARNING' | 'DANGER' | 'CRITICAL';
}

/**
 * Defense stats for locations
 */
export interface DefenseStats {
    level: number;
    name: string;
    legend: string;
    bonus: number;
    garrisonTotal: number;
    isEffective: boolean;         // >= 500 men manning fortifications
    canBuild: boolean;
    hasResources: boolean;
    activeConstruction?: {
        name: string;
        turnsRemaining: number;
    };
    nextLevel?: {
        name: string;
        legend: string;
        bonus: number;
        cost: number;
        manpower: number;
        time: number;
    };
}

/**
 * Leaders present in a location (for display)
 */
export interface LeaderInfo {
    id: string;
    name: string;
    commandBonus: number;
    stabilityEffect: number;
    abilities: string[];
    // New fields from leader system refactoring
    traits: string[];
    clandestineOps?: number;   // 1-5 scale
    discretion?: number;       // 1-5 scale
    statesmanship?: number;    // 1-5 scale
    faction: FactionId;
}

/**
 * Complete territorial stats for a location
 */
export interface TerritorialStats {
    locationId: string;
    locationName: string;
    locationType: 'CITY' | 'RURAL';
    faction: FactionId;
    population: number;
    stability: number;

    // Revenue (cities only)
    revenue?: RevenueStats;

    // Granary & Supply
    ruralFood?: RuralFoodStats;
    cityFood?: CityFoodStats;

    // Defense
    defense: DefenseStats;

    // Leaders in the location
    leaders: LeaderInfo[];

    // Convoy limits
    activeConvoys: number;
    activeNavalConvoys: number;
    canSendConvoy: boolean;
    canSendNavalConvoy: boolean;
    isPort: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TAX_MODIFIERS: Record<ManagementLevel, number> = {
    'VERY_LOW': -0.5,
    'LOW': -0.5,
    'NORMAL': 0,
    'HIGH': 0.5,  // Fixed: was 1, should be 0.5 as per spec
    'VERY_HIGH': 1 // Fixed: was 2, should be 1 (0.5 * 2)
};

const TRADE_TAX_FOOD_IMPACT: Record<ManagementLevel, number> = {
    'VERY_LOW': -4,   // Negative = imports more = reduces consumption
    'LOW': -2,
    'NORMAL': 0,
    'HIGH': 2,        // Positive = exports more = increases consumption
    'VERY_HIGH': 4
};

const COLLECTION_MODIFIERS: Record<ManagementLevel, number> = {
    'VERY_LOW': -2,
    'LOW': -1,
    'NORMAL': 0,
    'HIGH': 1,
    'VERY_HIGH': 2
};

const MAX_CONVOYS_PER_CITY = 3;
const MAX_NAVAL_CONVOYS_PER_CITY = 3;

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate revenue stats for a city
 */
export function calculateRevenueStats(
    location: Location,
    allLocations: Location[],
    roads: Road[],
    characters: Character[]
): RevenueStats | undefined {
    if (location.type !== LocationType.CITY) return undefined;

    // Personal tax base: 1 gold per 1000 inhabitants
    const personalTaxBase = Math.floor(location.population / 1000);

    // Personal tax modifier: FIXED to 0.5 gold per 1000 per level
    const taxLevel = location.taxLevel || 'NORMAL';
    const personalTaxMod = Math.floor(personalTaxBase * TAX_MODIFIERS[taxLevel]);

    // Trade gold calculation
    let tradeGold = 0;
    const linkedRural = allLocations.find(l => l.id === location.linkedLocationId);

    if (linkedRural && linkedRural.faction === location.faction) {
        const neighboringRuralIds = roads
            .filter(r => r.from === linkedRural.id || r.to === linkedRural.id)
            .map(r => r.from === linkedRural.id ? r.to : r.from);

        const tradeTaxLevel = location.tradeTaxLevel || 'NORMAL';

        neighboringRuralIds.forEach(neighborId => {
            const neighbor = allLocations.find(l => l.id === neighborId);
            if (neighbor && neighbor.type === LocationType.RURAL) {
                // Base trade: 8 from same faction, 3 from different
                let baseTrade = neighbor.faction === location.faction ? 8 : 3;

                // Modified by trade tax level
                if (tradeTaxLevel === 'VERY_LOW') {
                    baseTrade = neighbor.faction === location.faction ? 4 : 1;
                } else if (tradeTaxLevel === 'LOW') {
                    baseTrade = neighbor.faction === location.faction ? 6 : 2;
                } else if (tradeTaxLevel === 'HIGH') {
                    baseTrade = neighbor.faction === location.faction ? 10 : 4;
                } else if (tradeTaxLevel === 'VERY_HIGH') {
                    baseTrade = neighbor.faction === location.faction ? 12 : 5;
                }

                tradeGold += baseTrade;
            }
        });
    }

    // Manager bonus: +20 gold per MANAGER leader in the city
    const managerBonus = characters
        .filter(c =>
            c.locationId === location.id &&
            c.status !== 'DEAD' &&
            c.faction === location.faction &&
            c.stats.ability.includes('MANAGER')
        )
        .length * 20;

    // Special city income
    let specialIncome = 0;
    if (location.id === 'sunbreach') specialIncome = 20;
    else if (location.id === 'port_de_sable') specialIncome = 35;
    else if (location.id === 'mirebridge') specialIncome = 10;
    else if (location.id === 'stormbay') specialIncome = 10;
    else if (location.id === 'gre_au_vent') specialIncome = 25;

    // Embargo impact on Windward
    let embargoImpact = 0;
    if (location.id === 'windward') {
        embargoImpact = location.isGrainTradeActive ? 20 : -20;
    }

    // Burned Districts deduction
    const burnedDistricts = location.burnedDistricts || 0;

    // Improved Economy bonus from governor (cities: +2 * statesmanship gold)
    let improvedEconomyBonus = 0;
    const governor = characters.find(c =>
        c.status === 'GOVERNING' &&
        c.locationId === location.id &&
        c.faction === location.faction
    );
    if (location.governorPolicies?.[GovernorPolicy.IMPROVE_ECONOMY] && governor) {
        const statesmanship = governor.stats.statesmanship || 1;
        improvedEconomyBonus = 2 * statesmanship;
    }

    // Governor actions cost (gold costs from active policies)
    let governorActionsCost = 0;
    if (location.governorPolicies) {
        const hasManOfChurch = governor?.stats.ability.includes('MAN_OF_CHURCH');
        if (location.governorPolicies[GovernorPolicy.STABILIZE_REGION]) {
            governorActionsCost += hasManOfChurch ? 0 : (GOVERNOR_POLICY_COSTS[GovernorPolicy.STABILIZE_REGION] || 0);
        }
        if (location.governorPolicies[GovernorPolicy.DENOUNCE_ENEMIES]) {
            governorActionsCost += hasManOfChurch ? 0 : (GOVERNOR_POLICY_COSTS[GovernorPolicy.DENOUNCE_ENEMIES] || 0);
        }
        if (location.governorPolicies[GovernorPolicy.HUNT_NETWORKS]) {
            governorActionsCost += GOVERNOR_POLICY_COSTS[GovernorPolicy.HUNT_NETWORKS] || 0;
        }
        if (location.governorPolicies[GovernorPolicy.REBUILD_REGION]) {
            governorActionsCost += GOVERNOR_POLICY_COSTS[GovernorPolicy.REBUILD_REGION] || 0;
        }
    }

    const total = Math.max(0, personalTaxBase + personalTaxMod + tradeGold + managerBonus + specialIncome + embargoImpact - burnedDistricts + improvedEconomyBonus - governorActionsCost);

    return {
        personalTaxBase,
        personalTaxMod,
        tradeGold,
        managerBonus,
        specialIncome,
        embargoImpact,
        burnedDistricts,
        improvedEconomyBonus,
        governorActionsCost,
        total
    };
}

/**
 * Calculate food production stats for a rural area
 */
export function calculateRuralFoodStats(
    location: Location,
    allLocations: Location[],
    armies: Army[],
    characters: Character[] = [] // Optional, needed for Improve Economy bonus
): RuralFoodStats | undefined {
    if (location.type !== LocationType.RURAL) return undefined;

    // Base production: 1 per 10000 inhabitants
    const productionBase = Math.floor(location.population / 10000);

    // Fertility effect
    let fertilityEffect = 0;
    if (location.ruralCategory === RuralCategory.FERTILE) {
        fertilityEffect = productionBase * 2;
    } else if (location.ruralCategory === RuralCategory.ORDINARY) {
        fertilityEffect = productionBase;
    }
    // INHOSPITABLE: no bonus

    // Collection orders
    const collectionLevel = location.foodCollectionLevel || 'NORMAL';
    const collModUnit = Math.floor(location.population / 20000);
    const collectionOrders = COLLECTION_MODIFIERS[collectionLevel] * collModUnit;

    // Hunting/Fishing bonus
    let huntingBonus = 0;
    let fishingBonus = 0;

    if (location.id === 'saltcraw_viscounty') {
        fishingBonus = 4;
    } else if (location.isCoastal) {
        huntingBonus = BONUS_FISHING_HUNTING; // 10
    } else {
        huntingBonus = BONUS_HUNTING_ONLY; // 6
    }

    // Embargo bonus for Great Plains
    let embargoBonus = 0;
    const windward = allLocations.find(l => l.id === 'windward');
    if (location.id === 'great_plains' && windward && !windward.isGrainTradeActive) {
        embargoBonus = 60;
    }

    // Army consumption: armies using this as food source
    const armiesDrawingFromHere = armies.filter(a => a.foodSourceId === location.id);
    const totalArmyStrength = armiesDrawingFromHere.reduce((sum, a) => sum + a.strength, 0);
    // 1 food per 1000 soldiers
    const armyConsumption = Math.ceil(totalArmyStrength / 1000);

    // Burned Fields deduction
    const burnedFields = location.burnedFields || 0;

    // Improve Economy bonus from governor (rural: +2*statesmanship food, same as gold)
    let improvedEconomyBonus = 0;
    const governor = characters.find(c =>
        c.status === 'GOVERNING' &&
        c.locationId === location.id &&
        c.faction === location.faction
    );
    if (location.governorPolicies?.[GovernorPolicy.IMPROVE_ECONOMY] && governor) {
        const statesmanship = governor.stats.statesmanship || 1;
        improvedEconomyBonus = 2 * statesmanship;
    }

    // Net production
    const netProduction = productionBase + fertilityEffect + collectionOrders + huntingBonus + fishingBonus + embargoBonus - armyConsumption - burnedFields + improvedEconomyBonus;

    // Linked city info (consumption and stocks)
    // We display this to help the player know if the city is starving
    let linkedCityConsumption = 0;
    let linkedCityStocks = 0;
    const linkedCity = allLocations.find(l => l.id === location.linkedLocationId);
    if (linkedCity) {
        // Estimate city consumption (pop + army)
        // Note: this is a simplified view, doesn't account for city's own governors or modifiers completely if we don't call calculateCityFoodStats
        // But preventing circular dependency is good. Let's do basic calculation.
        const cityPopCons = Math.ceil(linkedCity.population / 1000);
        const cityArmiesStrength = armies
            .filter(a => a.locationId === linkedCity.id && a.locationType === 'LOCATION')
            .reduce((sum, a) => sum + a.strength, 0);
        const cityArmyCons = Math.ceil(cityArmiesStrength / 1000);
        linkedCityConsumption = cityPopCons + cityArmyCons;
        linkedCityStocks = linkedCity.foodStock;
    }

    return {
        productionBase,
        fertilityEffect,
        collectionOrders,
        huntingBonus,
        fishingBonus,
        armyConsumption,
        embargoBonus,
        burnedFields,
        improvedEconomyBonus,
        netProduction,
        linkedCityConsumption,
        linkedCityStocks
    };
}

/**
 * Calculate food consumption metrics for a city
 */
export function calculateCityFoodStats(
    location: Location,
    allLocations: Location[],
    armies: Army[],
    characters: Character[] = []
): CityFoodStats | undefined {
    if (location.type !== LocationType.CITY) return undefined;

    // Population consumption: 1 per 1000
    const populationConsumption = Math.ceil(location.population / 1000);

    // Army consumption: 1 per 1000 soldiers in the city
    const stationedArmies = armies.filter(a =>
        a.locationId === location.id &&
        a.locationType === 'LOCATION'
    );
    const totalArmyStrength = stationedArmies.reduce((sum, a) => sum + a.strength, 0);
    const armyConsumption = Math.ceil(totalArmyStrength / 1000);

    // Food Imports (from trade taxes)
    const tradeTaxLevel = location.tradeTaxLevel || 'NORMAL';
    const foodImports = -(TRADE_TAX_FOOD_IMPACT[tradeTaxLevel]); // Negative value in constant means imports (add food)

    // Embargo Malus (applies to ALL cities when Windward embargo is active)
    let embargoMalus = 0;
    const windward = allLocations.find(l => l.id === 'windward');
    if (windward && !windward.isGrainTradeActive) {
        embargoMalus = 10;
    }

    // Rural Supply
    let ruralSupply = 0;
    const linkedRural = allLocations.find(l => l.id === location.linkedLocationId);
    if (linkedRural && linkedRural.faction === location.faction) {
        // Calculate rural net production including governor bonuses
        const ruralStats = calculateRuralFoodStats(linkedRural, allLocations, armies, characters);
        if (ruralStats) {
            ruralSupply = Math.max(0, ruralStats.netProduction);
        }
    }

    // Governor actions food cost (from APPEASE_MINDS policy - calculated instantly)
    let governorActions = 0;
    if (location.governorPolicies?.[GovernorPolicy.APPEASE_MINDS]) {
        governorActions = getAppeaseFoodCost(location.population);
    }

    // Rationing: Reduces civilian consumption
    let rationingBonus = 0;
    if (location.governorPolicies?.[GovernorPolicy.RATIONING]) {
        rationingBonus = Math.floor(location.population / 2000);
    }

    // Total flow (governor actions is purely cost now)
    const totalConsumption = populationConsumption + armyConsumption + governorActions + embargoMalus - foodImports;
    const total = ruralSupply - totalConsumption + rationingBonus;

    // Stock status thresholds
    const currentStocks = location.foodStock;
    let stockStatus: 'HEALTHY' | 'WARNING' | 'DANGER' | 'CRITICAL';

    if (currentStocks === 0) {
        stockStatus = 'CRITICAL';
    } else if (currentStocks <= totalConsumption) {
        stockStatus = 'DANGER';
    } else if (currentStocks < totalConsumption * 2) {
        stockStatus = 'WARNING';
    } else {
        stockStatus = 'HEALTHY';
    }

    return {
        populationConsumption,
        armyConsumption,
        governorActions,
        rationingBonus,
        foodImports,
        embargoMalus,
        ruralSupply,
        total,
        currentStocks,
        stockStatus
    };
}

/**
 * Calculate defense stats for a location
 */
export function calculateDefenseStats(
    location: Location,
    armies: Army[],
    playerGold: number
): DefenseStats {
    const level = location.fortificationLevel || 0;
    const fortData = FORTIFICATION_LEVELS[level];
    const nextFortData = FORTIFICATION_LEVELS[level + 1];

    // Garrison total
    const stationedArmies = armies.filter(a =>
        a.locationId === location.id &&
        a.locationType === 'LOCATION'
    );
    const garrisonTotal = stationedArmies.reduce((sum, a) => sum + a.strength, 0);

    // Fortifications effective if >= 500 men
    const isEffective = garrisonTotal >= 500;

    // Max fortification level per location type:
    // - Rural areas: level 1
    // - Road stages: level 2 (handled elsewhere, not in this function)
    // - Cities: level 3
    // - Stormbay: level 4
    let maxLevel: number;
    if (location.type === LocationType.RURAL) {
        maxLevel = 1;
    } else if (location.id === 'stormbay') {
        maxLevel = 4;
    } else {
        // Regular cities
        maxLevel = 3;
    }

    // Can build next level if not at max and no active construction
    const canBuild = level < maxLevel && !location.activeConstruction && !!nextFortData;
    const hasResources = nextFortData ? playerGold >= nextFortData.cost && garrisonTotal >= nextFortData.manpower : false;

    return {
        level,
        name: fortData.name,
        legend: fortData.legend,
        bonus: fortData.bonus,
        garrisonTotal,
        isEffective,
        canBuild,
        hasResources,
        activeConstruction: location.activeConstruction ? {
            name: location.activeConstruction.name,
            turnsRemaining: location.activeConstruction.turnsRemaining
        } : undefined,
        nextLevel: nextFortData ? {
            name: nextFortData.name,
            legend: nextFortData.legend,
            bonus: nextFortData.bonus,
            cost: nextFortData.cost,
            manpower: nextFortData.manpower,
            time: nextFortData.time
        } : undefined
    };
}

/**
 * Get leaders present in a location
 */
export function getLocationLeaders(
    location: Location,
    characters: Character[]
): LeaderInfo[] {
    return characters
        .filter(c =>
            c.locationId === location.id &&
            c.status !== 'DEAD' &&
            c.faction === location.faction
        )
        .map(c => ({
            id: c.id,
            name: c.name,
            faction: c.faction,
            commandBonus: c.stats.commandBonus,
            stabilityEffect: c.stats.stabilityPerTurn,
            abilities: c.stats.ability.filter(a => a !== 'NONE'),
            // New fields from leader system refactoring
            traits: (c.stats as any).traits || [],
            clandestineOps: (c.stats as any).clandestineOps,
            discretion: (c.stats as any).discretion,
            statesmanship: (c.stats as any).statesmanship
        }));
}

/**
 * Calculate complete territorial stats for a location
 */
export function calculateTerritorialStats(
    location: Location,
    allLocations: Location[],
    armies: Army[],
    characters: Character[],
    roads: Road[],
    convoys: Convoy[],
    navalConvoys: NavalConvoy[],
    playerGold: number
): TerritorialStats {
    const isCity = location.type === LocationType.CITY;

    // Count active convoys from this location
    const activeConvoys = convoys.filter(c =>
        c.sourceCityId === location.id &&
        c.faction === location.faction
    ).length;

    const activeNavalConvoys = navalConvoys.filter(c =>
        c.sourceCityId === location.id &&
        c.faction === location.faction
    ).length;

    const isPort = PORT_SEQUENCE.includes(location.id);

    return {
        locationId: location.id,
        locationName: location.name,
        locationType: location.type,
        faction: location.faction,
        population: location.population,
        stability: location.stability,

        revenue: isCity ? calculateRevenueStats(location, allLocations, roads, characters) : undefined,
        ruralFood: !isCity ? calculateRuralFoodStats(location, allLocations, armies, characters) : undefined,
        cityFood: isCity ? calculateCityFoodStats(location, allLocations, armies, characters) : undefined,

        defense: calculateDefenseStats(location, armies, playerGold),
        leaders: getLocationLeaders(location, characters),

        activeConvoys,
        activeNavalConvoys,
        canSendConvoy: isCity && activeConvoys < MAX_CONVOYS_PER_CITY,
        canSendNavalConvoy: isCity && isPort && activeNavalConvoys < MAX_NAVAL_CONVOYS_PER_CITY,
        isPort
    };
}

// ============================================================================
// UI HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate faction total revenue for display
 * Includes:
 * - City revenue (from calculateRevenueStats, includes Improve Economy bonus and governor policy costs)
 * - Minus: Active governor policy costs on RURAL territories (not included in city revenue)
 */
export function calculateFactionRevenue(
    factionId: FactionId,
    locations: Location[],
    roads: Road[],
    characters: Character[]
): number {
    // Calculate net revenue from all cities (includes policy costs for those cities)
    const cityRevenue = locations
        .filter(l => l.type === LocationType.CITY && l.faction === factionId)
        .reduce((total, city) => {
            const revenue = calculateRevenueStats(city, locations, roads, characters);
            return total + (revenue?.total || 0);
        }, 0);

    // Calculate policy costs for RURAL areas only (cities already include their own costs)
    let ruralPolicyCosts = 0;
    const ruralLocations = locations.filter(l => l.type === LocationType.RURAL && l.faction === factionId);

    ruralLocations.forEach(location => {
        if (location.governorPolicies) {
            // Find governor for Man of Church check
            const governor = characters.find(c =>
                c.status === 'GOVERNING' &&
                c.locationId === location.id &&
                c.faction === location.faction
            );
            const hasManOfChurch = governor?.stats.ability.includes('MAN_OF_CHURCH');

            if (location.governorPolicies[GovernorPolicy.STABILIZE_REGION]) {
                ruralPolicyCosts += hasManOfChurch ? 0 : (GOVERNOR_POLICY_COSTS[GovernorPolicy.STABILIZE_REGION] || 0);
            }
            if (location.governorPolicies[GovernorPolicy.DENOUNCE_ENEMIES]) {
                ruralPolicyCosts += hasManOfChurch ? 0 : (GOVERNOR_POLICY_COSTS[GovernorPolicy.DENOUNCE_ENEMIES] || 0);
            }
            if (location.governorPolicies[GovernorPolicy.HUNT_NETWORKS]) {
                ruralPolicyCosts += GOVERNOR_POLICY_COSTS[GovernorPolicy.HUNT_NETWORKS] || 0;
            }
            if (location.governorPolicies[GovernorPolicy.REBUILD_REGION]) {
                ruralPolicyCosts += GOVERNOR_POLICY_COSTS[GovernorPolicy.REBUILD_REGION] || 0;
            }
        }
    });

    return Math.max(0, cityRevenue - ruralPolicyCosts);
}

/**
 * Check if tax level can be changed
 */
export function canChangeTaxLevel(
    location: Location,
    taxType: 'PERSONAL' | 'TRADE',
    direction: 'UP' | 'DOWN'
): boolean {
    const LEVELS: ManagementLevel[] = ['VERY_LOW', 'LOW', 'NORMAL', 'HIGH', 'VERY_HIGH'];
    const currentLevel = taxType === 'PERSONAL' ? location.taxLevel : location.tradeTaxLevel;
    const idx = LEVELS.indexOf(currentLevel || 'NORMAL');

    // Boundary checks
    if (direction === 'UP' && idx >= 4) return false;
    if (direction === 'DOWN' && idx <= 0) return false;

    // Stability checks (from spec)
    if (taxType === 'PERSONAL') {
        if (direction === 'DOWN' && location.stability > 70) return false;
        if (direction === 'UP' && location.stability < 30) return false;
    }
    if (taxType === 'TRADE') {
        if (direction === 'DOWN' && location.stability > 95) return false;
        if (direction === 'UP' && location.stability < 5) return false;
    }

    return true;
}

/**
 * Check if food collection level can be changed
 */
export function canChangeFoodCollection(
    location: Location,
    direction: 'UP' | 'DOWN'
): boolean {
    const LEVELS: ManagementLevel[] = ['VERY_LOW', 'LOW', 'NORMAL', 'HIGH', 'VERY_HIGH'];
    const currentLevel = location.foodCollectionLevel || 'NORMAL';
    const idx = LEVELS.indexOf(currentLevel);

    if (direction === 'UP' && idx >= 4) return false;
    if (direction === 'DOWN' && idx <= 0) return false;

    // Stability checks
    if (direction === 'DOWN' && location.stability > 80) return false;
    if (direction === 'UP' && location.stability < 20) return false;

    return true;
}
