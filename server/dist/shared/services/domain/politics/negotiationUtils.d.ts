/**
 * Negotiation Utilities
 * Helper functions for calculating negotiation success and valid food sources
 */
import { Location, FactionId } from '../../../types';
import { Road } from '../../../types';
import { MapId } from '../../../data/ports';
/**
 * Calculate the success chance for a negotiation attempt (0-100%)
 *
 * Formula: min(stability, 50) + (gold/5) + food - (resentment/5)
 * Result clamped to 0-100
 */
export declare function calculateNegotiationSuccessChance(stability: number, goldOffer: number, foodOffer: number, resentment: number): number;
/**
 * Check if a location is coastal (for determining maritime food source eligibility)
 * - For rural areas: check isCoastal directly
 * - For cities: check if linked rural area is coastal
 */
export declare function isLocationCoastal(location: Location, allLocations: Location[]): boolean;
/**
 * Food source with amount for multi-source negotiation
 */
export interface FoodSourceEntry {
    cityId: string;
    cityName: string;
    maxStock: number;
    amount: number;
    isPort: boolean;
    travelTime?: number;
}
/**
 * Get valid food sources for negotiation with a target neutral zone
 *
 * Land sources: Cities in rural areas directly adjacent (by road) to the target zone
 * Maritime sources: Ports controlled by player within 3 turns travel (if target is coastal)
 */
export declare function getValidFoodSourcesForNegotiation(targetLocation: Location, allLocations: Location[], roads: Road[], playerFaction: FactionId, mapId?: MapId): {
    cityId: string;
    cityName: string;
    maxStock: number;
    isPort: boolean;
    travelTime?: number;
}[];
