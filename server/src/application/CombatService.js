"use strict";
/**
 * Combat Service - Application Layer
 * Encapsulates combat-related use cases: initiate, handle choices, resolve
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CombatService = void 0;
const gameLogic_1 = require("../gameLogic");
const combat_1 = require("../../../shared/services/combat");
/**
 * CombatService handles all combat-related use cases
 */
class CombatService {
    constructor(gameRoomManager) {
        this.gameRoomManager = gameRoomManager;
    }
    /**
     * Initiate a combat between attacker and defender
     */
    initiateCombat(code, combat, attackerSocketId, defenderFaction) {
        const defenderSocketId = this.gameRoomManager.getSocketForFaction(code, defenderFaction);
        this.gameRoomManager.initiateCombat(code, combat, attackerSocketId, defenderFaction);
        return {
            initiated: true,
            pendingCombat: this.gameRoomManager.getRoom(code)?.pendingCombat || null,
            attackerSocketId,
            defenderSocketId
        };
    }
    /**
     * Handle a combat choice from attacker or defender
     */
    handleChoice(code, socketId, choice, siegeCost) {
        const room = this.gameRoomManager.getRoom(code);
        if (!room || !room.pendingCombat) {
            return { ready: false, resolved: false };
        }
        const combat = room.pendingCombat;
        // Determine role and set choice
        if (socketId === combat.attackerSocketId) {
            if (['FIGHT', 'RETREAT', 'SIEGE'].includes(choice)) {
                this.gameRoomManager.setAttackerChoice(code, choice, siegeCost);
                // If defender is AI (no socket), auto-choose FIGHT
                if (!combat.defenderSocketId) {
                    console.log(`[CombatService] AI defender - auto-choosing FIGHT`);
                    this.gameRoomManager.setDefenderChoice(code, 'FIGHT');
                }
                else {
                    return { ready: false, resolved: false, waitingFor: 'DEFENDER' };
                }
            }
        }
        else if (socketId === combat.defenderSocketId) {
            if (['FIGHT', 'RETREAT_CITY'].includes(choice)) {
                this.gameRoomManager.setDefenderChoice(code, choice);
            }
        }
        // Check if ready to resolve
        if (this.gameRoomManager.isCombatReady(code)) {
            return this.resolveCombat(code);
        }
        return { ready: false, resolved: false };
    }
    /**
     * Resolve combat when both choices are made
     */
    resolveCombat(code) {
        const room = this.gameRoomManager.getRoom(code);
        if (!room || !room.pendingCombat) {
            return { ready: false, resolved: false };
        }
        const combat = room.pendingCombat;
        // Determine final choice based on precedence
        // Priority: RETREAT_CITY > RETREAT > SIEGE > FIGHT
        let finalChoice = 'FIGHT';
        const finalSiegeCost = combat.siegeCost || 0;
        if (combat.defenderChoice === 'RETREAT_CITY') {
            finalChoice = 'RETREAT_CITY';
        }
        else if (combat.attackerChoice === 'RETREAT') {
            finalChoice = 'RETREAT';
        }
        else if (combat.attackerChoice === 'SIEGE') {
            finalChoice = 'SIEGE';
        }
        else {
            finalChoice = 'FIGHT';
        }
        console.log(`[CombatService] Resolving combat with choice: ${finalChoice}`);
        // Apply combat resolution
        const updates = (0, combat_1.resolveCombatResult)(room.gameState, finalChoice, finalSiegeCost);
        room.gameState = { ...room.gameState, ...updates };
        // Clear pending combat
        this.gameRoomManager.clearCombat(code);
        return {
            ready: true,
            resolved: true,
            finalChoice,
            updatedState: (0, gameLogic_1.getClientState)(room.gameState)
        };
    }
    /**
     * Set AI attacker choice (always FIGHT)
     */
    setAIAttackerChoice(code) {
        this.gameRoomManager.setAttackerChoice(code, 'FIGHT');
    }
    /**
     * Get pending combat for a room
     */
    getPendingCombat(code) {
        return this.gameRoomManager.getRoom(code)?.pendingCombat || null;
    }
}
exports.CombatService = CombatService;
