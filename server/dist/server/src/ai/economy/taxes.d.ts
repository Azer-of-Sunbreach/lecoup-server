import { Location } from '../../../../shared/types';
/**
 * Optimize city tax levels based on stability and gold needs.
 *
 * @param cities - All cities controlled by the faction
 * @param isDesperateForGold - Whether faction urgently needs gold
 */
export declare function optimizeCityTaxes(cities: Location[], isDesperateForGold: boolean): void;
/**
 * Optimize rural food collection levels based on stability and food needs.
 *
 * @param rurals - All rural areas controlled by the faction
 * @param isDesperateForFood - Whether faction urgently needs food
 */
export declare function optimizeRuralCollection(rurals: Location[], isDesperateForFood: boolean): void;
