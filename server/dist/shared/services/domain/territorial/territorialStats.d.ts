/**
 * Territorial Stats Domain Service
 *
 * Centralized calculation logic for the Territorial Menu.
 * This file follows Clean Hexagonal Architecture principles:
 * - Pure functions, no side effects
 * - No React/UI dependencies
 * - All formulas extracted from specifications
 */
import { Location, Army, Character, Road, FactionId, Convoy, NavalConvoy } from '../../../types';
/**
 * Revenue breakdown for cities
 */
export interface RevenueStats {
    personalTaxBase: number;
    personalTaxMod: number;
    tradeGold: number;
    managerBonus: number;
    specialIncome: number;
    embargoImpact: number;
    burnedDistricts: number;
    improvedEconomyBonus: number;
    governorActionsCost: number;
    total: number;
}
/**
 * Food production breakdown for rural areas
 */
export interface RuralFoodStats {
    productionBase: number;
    fertilityEffect: number;
    collectionOrders: number;
    huntingBonus: number;
    fishingBonus: number;
    armyConsumption: number;
    embargoBonus: number;
    burnedFields: number;
    improvedEconomyBonus: number;
    netProduction: number;
    linkedCityConsumption: number;
    linkedCityStocks: number;
}
/**
 * Food consumption breakdown for cities
 */
export interface CityFoodStats {
    populationConsumption: number;
    armyConsumption: number;
    governorActions: number;
    rationingBonus: number;
    foodImports: number;
    embargoMalus: number;
    ruralSupply: number;
    total: number;
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
    isEffective: boolean;
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
    traits: string[];
    clandestineOps?: number;
    discretion?: number;
    statesmanship?: number;
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
    revenue?: RevenueStats;
    ruralFood?: RuralFoodStats;
    cityFood?: CityFoodStats;
    defense: DefenseStats;
    leaders: LeaderInfo[];
    activeConvoys: number;
    activeNavalConvoys: number;
    canSendConvoy: boolean;
    canSendNavalConvoy: boolean;
    isPort: boolean;
}
/**
 * Calculate revenue stats for a city
 */
export declare function calculateRevenueStats(location: Location, allLocations: Location[], roads: Road[], characters: Character[]): RevenueStats | undefined;
/**
 * Calculate food production stats for a rural area
 */
export declare function calculateRuralFoodStats(location: Location, allLocations: Location[], armies: Army[], characters?: Character[]): RuralFoodStats | undefined;
/**
 * Calculate food consumption metrics for a city
 */
export declare function calculateCityFoodStats(location: Location, allLocations: Location[], armies: Army[], characters?: Character[]): CityFoodStats | undefined;
/**
 * Calculate defense stats for a location
 */
export declare function calculateDefenseStats(location: Location, armies: Army[], playerGold: number): DefenseStats;
/**
 * Get leaders present in a location
 */
export declare function getLocationLeaders(location: Location, characters: Character[]): LeaderInfo[];
/**
 * Calculate complete territorial stats for a location
 */
export declare function calculateTerritorialStats(location: Location, allLocations: Location[], armies: Army[], characters: Character[], roads: Road[], convoys: Convoy[], navalConvoys: NavalConvoy[], playerGold: number): TerritorialStats;
/**
 * Calculate faction total revenue for display
 * Includes:
 * - City revenue (from calculateRevenueStats, includes Improve Economy bonus and governor policy costs)
 * - Minus: Active governor policy costs on RURAL territories (not included in city revenue)
 */
export declare function calculateFactionRevenue(factionId: FactionId, locations: Location[], roads: Road[], characters: Character[]): number;
/**
 * Check if tax level can be changed
 */
export declare function canChangeTaxLevel(location: Location, taxType: 'PERSONAL' | 'TRADE', direction: 'UP' | 'DOWN'): boolean;
/**
 * Check if food collection level can be changed
 */
export declare function canChangeFoodCollection(location: Location, direction: 'UP' | 'DOWN'): boolean;
