/**
 * Server-side Game Logic Handler
 * Uses shared game logic to process player actions and manage game state
 */
import { GameState, FactionId, CoreGameState, GameAction } from '../../shared/types';
export interface MultiplayerGameState extends GameState {
    humanFactions: FactionId[];
    aiFaction: FactionId | null;
    currentTurnFaction: FactionId;
    turnOrder: FactionId[];
    currentTurnIndex: number;
}
/**
 * Create initial multiplayer game state
 */
export declare function createMultiplayerGameState(humanFactions: FactionId[], aiFaction: FactionId | null): MultiplayerGameState;
/**
 * Process a player action on the server
 * Returns the updated game state
 */
export declare function processPlayerAction(state: MultiplayerGameState, action: GameAction, playerFaction: FactionId): {
    success: boolean;
    newState: MultiplayerGameState;
    error?: string;
};
/**
 * Advance to next turn
 */
export declare function advanceTurn(state: MultiplayerGameState): Promise<{
    newState: MultiplayerGameState;
    nextFaction: FactionId;
    isAITurn: boolean;
}>;
export { processAITurn, processSingleFactionAITurn } from './ai';
/**
 * Extract state for client (removes server-only fields)
 */
export declare function getClientState(state: MultiplayerGameState): CoreGameState;
