/**
 * Resentment Tax Events - Immediate resentment effects from tax changes
 *
 * Handles immediate resentment changes when tax levels are modified:
 * - Personal taxes: ±15 per level change
 * - Trade taxes: ±5 per level change
 * - Food collection: ±20 per level change
 */
import { Location, ManagementLevel } from '../../../types';
export type TaxType = 'PERSONAL' | 'TRADE' | 'FOOD_COLLECTION';
/**
 * Apply resentment changes resulting from a change in tax/management level
 * This should be called immediately when the tax level is changed in the UI/Action
 */
export declare function applyTaxChangeResentment(location: Location, oldLevel: ManagementLevel | undefined, newLevel: ManagementLevel, taxType: TaxType): Location;
