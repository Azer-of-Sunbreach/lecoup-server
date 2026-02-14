/**
 * Game Service - Application Layer
 * Encapsulates game-related use cases: process actions, end turn, combat detection
 */
import { GameRoomManager, GameRoom } from '../gameRoom';
import { MultiplayerGameState } from '../gameLogic';
import { FactionId, CombatState } from '../../../shared/types';
export interface ActionResult {
    success: boolean;
    error?: string;
    combat?: CombatState;
    combatType?: 'AI_VS_AI' | 'AI_ATTACKER' | 'AI_DEFENDER' | 'PVP';
}
export interface TurnResult {
    success: boolean;
    error?: string;
    newState: MultiplayerGameState;
    isAITurn: boolean;
    nextFaction: FactionId;
}
/**
 * GameService handles all game-related use cases
 */
export declare class GameService {
    private gameRoomManager;
    constructor(gameRoomManager: GameRoomManager);
    /**
     * Process a player action
     * @returns Result including combat info if triggered
     */
    processAction(code: string, socketId: string, action: any): ActionResult;
    /**
     * End the current player's turn
     */
    endTurn(code: string, socketId: string): Promise<TurnResult>;
    /**
     * Process AI turn (advances and auto-resolves)
     */
    processAITurn(code: string): Promise<TurnResult>;
    /**
     * Auto-resolve all combats where no human is involved
     */
    autoResolveNonHumanCombats(room: GameRoom): void;
    /**
     * Determine the type of combat based on participants
     */
    determineCombatType(room: GameRoom, combat: CombatState): 'AI_VS_AI' | 'AI_ATTACKER' | 'AI_DEFENDER' | 'PVP';
    /**
     * Get client-safe state for broadcasting
     */
    getClientState(code: string): import("../../../shared/types").CoreGameState;
}
