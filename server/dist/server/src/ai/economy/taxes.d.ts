import { Location, FactionId } from '../../../../shared/types';
/**
 * Optimize city tax levels based on stability thresholds and gold needs.
 *
 * @param cities - All cities controlled by the faction
 * @param isDesperateForGold - Whether faction urgently needs gold
 * @param faction - Faction ID for threshold lookup
 * @param hasEmergency - Whether in emergency mode
 */
export declare function optimizeCityTaxes(cities: Location[], isDesperateForGold: boolean, faction?: FactionId, hasEmergency?: boolean): void;
/**
 * Optimize rural food collection levels based on stability thresholds.
 *
 * @param rurals - All rural areas controlled by the faction
 * @param isDesperateForFood - Whether faction urgently needs food
 * @param faction - Faction ID for threshold lookup
 * @param hasEmergency - Whether in emergency mode
 */
export declare function optimizeRuralCollection(rurals: Location[], isDesperateForFood: boolean, faction?: FactionId, hasEmergency?: boolean): void;
