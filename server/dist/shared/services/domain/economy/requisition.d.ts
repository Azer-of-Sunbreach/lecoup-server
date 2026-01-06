/**
 * Requisition Service
 * Handles seizing gold or food from controlled locations
 * Extracted from App.tsx handleRequisition()
 */
import { GameState, FactionId } from '../../../types';
export interface RequisitionResult {
    success: boolean;
    newState: Partial<GameState>;
    message: string;
}
/**
 * Execute requisition of gold or food from a location
 */
export declare const executeRequisition: (state: GameState, locId: string, type: "GOLD" | "FOOD", faction: FactionId) => RequisitionResult;
