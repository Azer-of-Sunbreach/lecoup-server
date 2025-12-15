/**
 * Negotiation Service
 * Handles player negotiations with neutral factions
 * Extracted from App.tsx handleNegotiate()
 */
import { GameState, FactionId } from '../../../types';
export interface NegotiationResult {
    success: boolean;
    newState: Partial<GameState>;
    message: string;
}
/**
 * Initiate a negotiation with a neutral location
 */
export declare const executeNegotiate: (state: GameState, locId: string, gold: number, food: number, foodSourceIds: string[], faction: FactionId) => NegotiationResult;
