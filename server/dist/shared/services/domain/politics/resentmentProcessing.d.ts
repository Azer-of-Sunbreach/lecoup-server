/**
 * Resentment Processing - Turn-based resentment effects
 *
 * Handles resentment changes that occur each turn:
 * - Shortage/Famine: Food stock levels cause resentment
 * - Very High taxes: Ongoing resentment from high taxation
 * - Embargo: Grain embargo causes resentment in all Larion locations
 */
import { Location, FactionId } from '../../../types';
/**
 * Process shortage and famine resentment for all locations
 * Called once per turn during turn processing
 */
export declare function processShortageResentment(locations: Location[]): Location[];
/**
 * Process ongoing resentment from VERY_HIGH tax levels
 * Called once per turn during turn processing
 */
export declare function processHighTaxResentment(locations: Location[]): Location[];
/**
 * Process embargo resentment for all Larion locations
 * Called once per turn during turn processing
 *
 * @param locations All game locations
 * @param isEmbargoActive Whether grain embargo is currently active
 * @param embargoFactionId Faction that activated the embargo (controls Windward)
 */
export declare function processEmbargoResentment(locations: Location[], isEmbargoActive: boolean, embargoFactionId: FactionId | null): Location[];
/**
 * Update previousFaction for all locations at end of turn
 * This captures the current faction before any changes next turn
 */
export declare function updatePreviousFaction(locations: Location[]): Location[];
