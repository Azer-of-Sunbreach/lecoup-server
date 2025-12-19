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
            // The handler cleared it earlier to put it into pendingCombat
            const stateToResolve = {
                ...room.gameState,
                combatState: room.pendingCombat.combatState
            };

            console.log(`[COMBAT_HANDLER] stateToResolve.humanFactions = ${JSON.stringify((stateToResolve as any).humanFactions)}`);

            const updates = resolveCombatResult(stateToResolve, finalAction, finalSiegeCost);

            // APPLY UPDATES TO SERVER STATE
            // This includes loss of troops, movement, etc.
            room.gameState = { ...room.gameState, ...updates };

            // Clear pending combat NOW, as it is resolved.
            gameRoomManager.clearCombat(code);

            // However, `updates.combatState` might contain the NEXT battle in the queue.
            // We need to decide what to do with it.
            // If we leave it in `room.gameState.combatState`, it will be broadcasted to everyone as "Battle Imminent".
            // We want to hide it, but KEEP the results of the previous battle (armies moved/died).

            let nextCombat = updates.combatState; // This is the next battle derived by resolveCombatResult
            console.log(`[COMBAT_HANDLER] updates.combatState = ${nextCombat ? `${nextCombat.attackerFaction} vs ${nextCombat.defenderFaction}` : 'NULL'}`);

            // Capture the state to broadcast - this state includes the RESULTS of the fight (deaths/moves)
            // But we must sanitize `combatState` if it exists, to prevent public leak of the NEXT battle.
            const rawStateForBroadcast = { ...room.gameState };

            // If there is a next combat, we must initiate it properly (Private) and hide it from Public
            if (nextCombat) {
                console.log(`[Game] ${code}: Subsequent combat detected after resolution!`);

                // Identify participants
                const attackerSocketId = gameRoomManager.getSocketForFaction(code, nextCombat.attackerFaction);
                const defenderSocketId = gameRoomManager.getSocketForFaction(code, nextCombat.defenderFaction);
                const attackerIsHuman = attackerSocketId !== null;
                const defenderIsHuman = defenderSocketId !== null;

                if (!attackerIsHuman && !defenderIsHuman) {
                    // Auto-resolve non-human chain immediately
                    // This is recursive/iterative ideally, but for now single step
                    const autoUpdates = resolveCombatResult(room.gameState, 'FIGHT', 0);
                    room.gameState = { ...room.gameState, ...autoUpdates };
                    // Update the broadcast state with the result of this auto-resolve too
                    Object.assign(rawStateForBroadcast, room.gameState);
                } else {
                    // Human involved: Initiate Private Pending Combat
                    if (attackerIsHuman) {
                        gameRoomManager.initiateCombat(code, nextCombat, attackerSocketId!, nextCombat.defenderFaction);
                        // Notify ATTACKER
                        io.to(attackerSocketId!).emit('combat_choice_requested', {
                            combatState: nextCombat,
                            role: 'ATTACKER'
                        });
                    } else if (defenderIsHuman) {
                        // AI vs Human - AI chooses FIGHT, ask Defender
                        gameRoomManager.initiateCombat(code, nextCombat, 'AI', nextCombat.defenderFaction);
                        gameRoomManager.setAttackerChoice(code, 'FIGHT');
                        io.to(defenderSocketId!).emit('combat_choice_requested', {
                            combatState: nextCombat,
                            role: 'DEFENDER'
                        });
                    }
                }

                // HIDE combatState from the public broadcast
                // The server state `room.gameState` might have it set (from updates), or cleared (if initiated via gameRoomManager which usually doesn't clear it from gameState, but we should).
                // Actually `initiateCombat` puts it in `pendingCombat`.
                // We should ensure `room.gameState.combatState` is NULL so it doesn't block others or show UI.
                room.gameState.combatState = null;
            }

            // Broadcast the state (with combatState nullified for privacy)
            const clientState = getClientState(rawStateForBroadcast);
            const stateForBroadcast = { ...clientState, combatState: null }; // Ensure null for public

            io.to(code).emit('state_update', { gameState: stateForBroadcast });
            io.to(code).emit('combat_resolved', { result: 'Combat ended' });

            console.log(`[Game] ${code}: Combat resolved with action ${finalAction}`);

        } else {
            // Waiting for other player
            const isAttacker = socket.id === combat.attackerSocketId;
            const otherSocketId = isAttacker ? combat.defenderSocketId : combat.attackerSocketId;

            if (otherSocketId) {
                // If I am attacker and just committed, notify defender
                if (isAttacker && combat.attackerChoice) {
                    io.to(combat.defenderSocketId!).emit('combat_choice_requested', {
                        combatState: combat.combatState,
                        role: 'DEFENDER'
                    });
                    socket.emit('action_result', { success: true, message: 'Attacking... Waiting for defender.' });
                }
            }
            // AI Opponent case is handled by isCombatReady auto-resolving or setup
        }
    });
}
