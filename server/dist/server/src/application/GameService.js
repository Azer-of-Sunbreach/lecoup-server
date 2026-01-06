"use strict";
/**
 * Game Service - Application Layer
 * Encapsulates game-related use cases: process actions, end turn, combat detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameService = void 0;
const gameLogic_1 = require("../gameLogic");
const combat_1 = require("../../../shared/services/combat");
const types_1 = require("../../../shared/types");
/**
 * GameService handles all game-related use cases
 */
class GameService {
    constructor(gameRoomManager) {
        this.gameRoomManager = gameRoomManager;
    }
    /**
     * Process a player action
     * @returns Result including combat info if triggered
     */
    processAction(code, socketId, action) {
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
        const result = (0, gameLogic_1.processPlayerAction)(room.gameState, sharedAction, playerFaction);
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
    async endTurn(code, socketId) {
        if (!this.gameRoomManager.isPlayerTurn(code, socketId)) {
            return {
                success: false,
                error: 'Not your turn',
                newState: null,
                isAITurn: false,
                nextFaction: types_1.FactionId.NEUTRAL
            };
        }
        const room = this.gameRoomManager.getRoom(code);
        if (!room) {
            return {
                success: false,
                error: 'Game room not found',
                newState: null,
                isAITurn: false,
                nextFaction: types_1.FactionId.NEUTRAL
            };
        }
        const result = await (0, gameLogic_1.advanceTurn)(room.gameState);
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
    async processAITurn(code) {
        const room = this.gameRoomManager.getRoom(code);
        if (!room) {
            return {
                success: false,
                error: 'Game room not found',
                newState: null,
                isAITurn: false,
                nextFaction: types_1.FactionId.NEUTRAL
            };
        }
        const result = await (0, gameLogic_1.advanceTurn)(room.gameState);
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
    autoResolveNonHumanCombats(room) {
        while (room.gameState.combatState) {
            const combat = room.gameState.combatState;
            const combatType = this.determineCombatType(room, combat);
            if (combatType === 'AI_VS_AI') {
                console.log(`[GameService] Auto-resolving AI vs AI combat`);
                const updates = (0, combat_1.resolveCombatResult)(room.gameState, 'FIGHT', 0);
                room.gameState = { ...room.gameState, ...updates };
            }
            else {
                // Human involved - stop auto-resolution
                break;
            }
        }
    }
    /**
     * Determine the type of combat based on participants
     */
    determineCombatType(room, combat) {
        const attackerIsAI = combat.attackerFaction === room.aiFaction;
        const defenderIsAI = combat.defenderFaction === room.aiFaction;
        // Check if defender is human (has a socket)
        const defenderSocketId = this.gameRoomManager.getSocketForFaction(room.code, combat.defenderFaction);
        const defenderIsHuman = defenderSocketId !== null;
        if (attackerIsAI && (defenderIsAI || !defenderIsHuman)) {
            return 'AI_VS_AI';
        }
        else if (attackerIsAI) {
            return 'AI_ATTACKER';
        }
        else if (defenderIsAI || !defenderIsHuman) {
            return 'AI_DEFENDER';
        }
        else {
            return 'PVP';
        }
    }
    /**
     * Get client-safe state for broadcasting
     */
    getClientState(code) {
        const room = this.gameRoomManager.getRoom(code);
        if (!room)
            return null;
        return (0, gameLogic_1.getClientState)(room.gameState);
    }
}
exports.GameService = GameService;
