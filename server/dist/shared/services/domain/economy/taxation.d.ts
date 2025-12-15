/**
 * Taxation Service
 * Handles city management updates including grain trade embargo
 * Extracted from App.tsx handleUpdateCityManagement()
 */
import { GameState, Location } from '../../../types';
export interface TaxationResult {
    success: boolean;
    newState: Partial<GameState>;
    message: string;
}
/**
 * Update city management settings (taxes, grain trade, etc.)
 */
export declare const executeUpdateCityManagement: (state: GameState, locId: string, updates: Partial<Location>) => TaxationResult;
