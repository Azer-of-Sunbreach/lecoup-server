"use strict";
/**
 * Combat Socket Handlers
 * Handles all combat-related socket events: combat_choice
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCombatHandlers = registerCombatHandlers;
const gameLogic_1 = require("../../gameLogic");
const combat_1 = require("../../../../shared/services/combat");
function registerCombatHandlers(io, socket, gameRoomManager) {
    socket.on('combat_choice', ({ choice, siegeCost }) => {
        const code = socket.data.gameCode;
        if (!code) {
            socket.emit('error', { message: 'Not in a game' });
            return;
        }
        const room = gameRoomManager.getRoom(code);
        if (!room || !room.pendingCombat) {
            socket.emit('error', { message: 'No pending combat' });
            return;
        }
        const combat = room.pendingCombat;
        // Determine if this is attacker or defender choice
        if (socket.id === combat.attackerSocketId) {
            if (choice === 'FIGHT' || choice === 'RETREAT' || choice === 'SIEGE') {
                gameRoomManager.setAttackerChoice(code, choice, siegeCost);
                // If defender is human, request their choice
                if (combat.defenderSocketId) {
                    io.to(combat.defenderSocketId).emit('combat_choice_requested', {
                        combatState: combat.combatState,
                        role: 'DEFENDER'
                    });
                }
                else {
                    // Defender is AI - auto-choose FIGHT and resolve immediately
                    console.log(`[Game] ${code}: AI defender - auto-choosing FIGHT`);
                    gameRoomManager.setDefenderChoice(code, 'FIGHT');
                }
            }
        }
        else if (socket.id === combat.defenderSocketId) {
            if (choice === 'FIGHT' || choice === 'RETREAT_CITY') {
                gameRoomManager.setDefenderChoice(code, choice);
            }
        }
        // Check if combat is ready to resolve
        if (gameRoomManager.isCombatReady(code)) {
            // Determine final choice based on precedence
            // Priority: RETREAT_CITY > RETREAT > SIEGE > FIGHT
            let finalChoice = 'FIGHT';
            let finalSiegeCost = combat.siegeCost || 0;
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
            console.log(`[Game] ${code}: Resolving combat with choice: ${finalChoice}`);
            const updates = (0, combat_1.resolveCombatResult)(room.gameState, finalChoice, finalSiegeCost);
            // Update state
            room.gameState = { ...room.gameState, ...updates };
            io.to(code).emit('combat_resolved', {
                result: room.pendingCombat, // Send original pending context
                gameState: (0, gameLogic_1.getClientState)(room.gameState)
            });
            io.to(code).emit('state_update', {
                gameState: (0, gameLogic_1.getClientState)(room.gameState)
            });
            gameRoomManager.clearCombat(code);
        }
    });
}
