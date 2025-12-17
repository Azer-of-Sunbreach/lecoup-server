/**
 * Game Service - Application Layer
 * Encapsulates game-related use cases: process actions, end turn, combat detection
 */

import { Server } from 'socket.io';
import { GameRoomManager, GameRoom } from '../gameRoom';
import { processPlayerAction, advanceTurn, getClientState, MultiplayerGameState } from '../gameLogic';
import { resolveCombatResult } from '../../../shared/services/combat';
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
export class GameService {
    constructor(
        private gameRoomManager: GameRoomManager
    ) { }

    /**
     * Process a player action
     * @returns Result including combat info if triggered
     */
    processAction(
        code: string,
        socketId: string,
        action: any
    ): ActionResult {
        const room = this.gameRoomManager.getRoom(code);
        if (!room) {
            return { success: false, error: 'Game room not found' };
        }

        const playerFaction = room.playerFactions.get(socketId);
        if (!playerFaction) {
            return { success: false, error: 'Player faction not found' };
        }

        // Process action using shared logic
        const sharedAction = { ...action, faction: playerFaction };
        const result = processPlayerAction(room.gameState, sharedAction, playerFaction);

        if (!result.success) {
            return { success: false, error: result.error };
        }

        // Update room state
        room.gameState = result.newState;

        // Check for combat
        if (result.newState.combatState) {
            const combat = result.newState.combatState;
            const combatType = this.determineCombatType(room, combat);

            return {
                success: true,
                combat,
                combatType
            };
        }

        return { success: true };
    }

    /**
     * End the current player's turn
     */
    async endTurn(code: string, socketId: string): Promise<TurnResult> {
        if (!this.gameRoomManager.isPlayerTurn(code, socketId)) {
            return {
                success: false,
                error: 'Not your turn',
                newState: null as any,
                isAITurn: false,
                nextFaction: FactionId.NEUTRAL
            };
        }

        const room = this.gameRoomManager.getRoom(code);
        if (!room) {
            return {
                success: false,
                error: 'Game room not found',
                newState: null as any,
                isAITurn: false,
                nextFaction: FactionId.NEUTRAL
            };
        }

        const result = await advanceTurn(room.gameState);
        room.gameState = result.newState;

        // Auto-resolve non-human combats
        this.autoResolveNonHumanCombats(room);

        return {
            success: true,
            newState: room.gameState,
            isAITurn: result.isAITurn,
            nextFaction: result.nextFaction
        };
    }

    /**
     * Process AI turn (advances and auto-resolves)
     */
    async processAITurn(code: string): Promise<TurnResult> {
        const room = this.gameRoomManager.getRoom(code);
        if (!room) {
            return {
                success: false,
                error: 'Game room not found',
                newState: null as any,
                isAITurn: false,
                nextFaction: FactionId.NEUTRAL
            };
        }

        const result = await advanceTurn(room.gameState);
        room.gameState = result.newState;

        // Auto-resolve non-human combats
        this.autoResolveNonHumanCombats(room);

        return {
            success: true,
            newState: room.gameState,
            isAITurn: result.isAITurn,
            nextFaction: result.nextFaction
        };
    }

    /**
     * Auto-resolve all combats where no human is involved
     */
    autoResolveNonHumanCombats(room: GameRoom): void {
        while (room.gameState.combatState) {
            const combat = room.gameState.combatState;
            const combatType = this.determineCombatType(room, combat);

            if (combatType === 'AI_VS_AI') {
                console.log(`[GameService] Auto-resolving AI vs AI combat`);
                const updates = resolveCombatResult(room.gameState, 'FIGHT', 0);
                room.gameState = { ...room.gameState, ...updates };
            } else {
                // Human involved - stop auto-resolution
                break;
            }
        }
    }

    /**
     * Determine the type of combat based on participants
     */
    determineCombatType(
        room: GameRoom,
        combat: CombatState
    ): 'AI_VS_AI' | 'AI_ATTACKER' | 'AI_DEFENDER' | 'PVP' {
        const attackerIsAI = combat.attackerFaction === room.aiFaction;
        const defenderIsAI = combat.defenderFaction === room.aiFaction;

        // Check if defender is human (has a socket)
        const defenderSocketId = this.gameRoomManager.getSocketForFaction(
            room.code,
            combat.defenderFaction
        );
        const defenderIsHuman = defenderSocketId !== null;

        if (attackerIsAI && (defenderIsAI || !defenderIsHuman)) {
            return 'AI_VS_AI';
        } else if (attackerIsAI) {
            return 'AI_ATTACKER';
        } else if (defenderIsAI || !defenderIsHuman) {
            return 'AI_DEFENDER';
        } else {
            return 'PVP';
        }
    }

    /**
     * Get client-safe state for broadcasting
     */
    getClientState(code: string) {
        const room = this.gameRoomManager.getRoom(code);
        if (!room) return null;
        return getClientState(room.gameState);
    }
}
