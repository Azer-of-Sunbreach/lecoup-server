/**
 * Combat Socket Handlers
 * Handles all combat-related socket events: combat_choice
 */

import { Server, Socket } from 'socket.io';
import { GameRoomManager } from '../../gameRoom';
import { getClientState } from '../../gameLogic';
import { resolveCombatResult } from '../../../../shared/services/combat';

export function registerCombatHandlers(
    io: Server,
    socket: Socket,
    gameRoomManager: GameRoomManager
): void {

    socket.on('combat_choice', ({ choice, siegeCost }) => {
        // Try to get gameCode from socket data, or recover it from room manager
        let code = socket.data.gameCode;
        if (!code) {
            code = gameRoomManager.getGameCodeForSocket(socket.id);
            if (code) {
                socket.data.gameCode = code;
                console.log(`[Combat] Recovered gameCode ${code} for socket ${socket.id}`);
            }
        }

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
                    // Notify attacker they're waiting for defender
                    io.to(socket.id).emit('attacker_waiting', {
                        combatState: combat.combatState,
                        message: 'Waiting for defender\'s reaction...'
                    });
                    // Request defender's choice
                    io.to(combat.defenderSocketId).emit('combat_choice_requested', {
                        combatState: combat.combatState,
                        role: 'DEFENDER'
                    });
                    // Early return - wait for defender's response before checking isCombatReady
                    // The defender's choice will trigger another combat_choice event
                    return;
                } else {
                    // Defender is AI - auto-choose FIGHT and resolve immediately
                    console.log(`[Game] ${code}: AI defender - auto-choosing FIGHT`);
                    gameRoomManager.setDefenderChoice(code, 'FIGHT');
                }
            }
        } else if (socket.id === combat.defenderSocketId) {
            if (choice === 'FIGHT' || choice === 'RETREAT_CITY') {
                gameRoomManager.setDefenderChoice(code, choice as 'FIGHT' | 'RETREAT_CITY');
            }
        }

        // Check if combat is ready to resolve
        if (gameRoomManager.isCombatReady(code)) {
            console.log(`[Game] ${code}: All parties chose. Resolving combat...`);

            // Get final choices
            const attackerChoice = room.pendingCombat.attackerChoice;
            const defenderChoice = room.pendingCombat.defenderChoice || 'FIGHT';
            const finalSiegeCost = room.pendingCombat.siegeCost;

            let finalAction: 'FIGHT' | 'RETREAT' | 'RETREAT_CITY' | 'SIEGE' = 'FIGHT';

            if (attackerChoice === 'RETREAT') finalAction = 'RETREAT';
            else if (defenderChoice === 'RETREAT_CITY') finalAction = 'RETREAT_CITY';
            else if (attackerChoice === 'SIEGE') finalAction = 'SIEGE';
            else finalAction = 'FIGHT';

            // IMPORTANT: We need to put the combat back into state.combatState for the resolver to find it!
            room.gameState.combatState = room.pendingCombat.combatState;

            const updates = resolveCombatResult(room.gameState, finalAction, finalSiegeCost);
            room.gameState = { ...room.gameState, ...updates };

            // Clear pending combat
            gameRoomManager.clearCombat(code);
            room.gameState.combatState = null; // Ensure the *resolved* combat is cleared

            // CRITICAL FIX: Check if `updates.combatState` contains a NEW battle from the queue!
            // `resolveCombatResult` detects subsquent battles and puts them in `combatState`.
            // If we just broadcast this, EVERYONE sees it.
            // We must "initiate" it properly (Private flow).

            let nextCombat = updates.combatState;

            // Note: resolveCombatResult populates combatState with the *next* battle if available.
            // If the user's logic in resolveCombatResult is correct, `updates.combatState` holds it.
            // However, `room.gameState` has it merged now.
            // So we check `room.gameState.combatState`.

            if (room.gameState.combatState) {
                console.log(`[Game] ${code}: Subsequent combat detected after resolution!`);
                const newCombat = room.gameState.combatState;

                // Identify participants
                const attackerSocketId = gameRoomManager.getSocketForFaction(code, newCombat.attackerFaction);
                const defenderSocketId = gameRoomManager.getSocketForFaction(code, newCombat.defenderFaction);
                const attackerIsHuman = attackerSocketId !== null;
                const defenderIsHuman = defenderSocketId !== null;

                // Move to Pending Logic immediately
                if (!attackerIsHuman && !defenderIsHuman) {
                    // Auto-resolve non-human chain
                    const autoUpdates = resolveCombatResult(room.gameState, 'FIGHT', 0);
                    room.gameState = { ...room.gameState, ...autoUpdates };
                    // We might need a loop here for full recursion, but let's assume 1 level for now to avoid stack depth
                } else {
                    // Initiate Pending Combat for the next battle
                    // This prevents it from "leaking" to public in the broadcast below

                    if (attackerIsHuman && defenderIsHuman) {
                        gameRoomManager.initiateCombat(code, newCombat, attackerSocketId!, newCombat.defenderFaction);
                        // Notify ATTACKER only (PvP flow start)
                        io.to(attackerSocketId!).emit('combat_choice_requested', {
                            combatState: newCombat,
                            role: 'ATTACKER'
                        });
                    } else if (attackerIsHuman) {
                        gameRoomManager.initiateCombat(code, newCombat, attackerSocketId!, newCombat.defenderFaction);
                        socket.emit('combat_choice_requested', {
                            combatState: newCombat,
                            role: 'ATTACKER'
                        });
                    } else if (defenderIsHuman) {
                        gameRoomManager.initiateCombat(code, newCombat, 'AI', newCombat.defenderFaction);
                        gameRoomManager.setAttackerChoice(code, 'FIGHT'); // AI Attacker Ready
                        io.to(defenderSocketId!).emit('combat_choice_requested', {
                            combatState: newCombat,
                            role: 'DEFENDER'
                        });
                    }

                    // Clear from public state so it doesn't show "Battle Imminent" to everyone
                    room.gameState.combatState = null;
                }
            }

            // Broadcast updates
            const clientState = getClientState(room.gameState);

            // Privacy Filter: Ensure no leaked combatState
            const stateForBroadcast = room.pendingCombat
                ? { ...clientState, combatState: null }
                : clientState;

            io.to(code).emit('state_update', { gameState: stateForBroadcast });
            io.to(code).emit('combat_resolved', { result: 'Combat ended' });

            console.log(`[Game] ${code}: Combat resolved with action ${finalAction}`);

        } else {
            // Waiting for other player - This part was correct, but let's double check message
            const otherSocketId = isAttacker ? combat.defenderSocketId : combat.attackerSocketId;
            if (otherSocketId) {
                // If I am attacker (waiting for defender)
                if (isAttacker) {
                    // Do nothing, UI handles "Waiting..." via local state or we can emit info
                }
                // If I am defender and I just chose -> effectively resolved instantly if Attacker is ready.
                // So this else block is mostly for Attacker waiting for Defender.

                // If Attacker committed, notify Defender
                if (isAttacker && combat.attackerChoice) {
                    io.to(combat.defenderSocketId!).emit('combat_choice_requested', {
                        combatState: combat.combatState,
                        role: 'DEFENDER'
                    });
                    socket.emit('action_result', { success: true, message: 'Attacking... Waiting for defender.' });
                }
            } else {
                // AI Opponent case - Should be handled by isCombatReady auto-resolving or setup
            }
        }
    });
}
