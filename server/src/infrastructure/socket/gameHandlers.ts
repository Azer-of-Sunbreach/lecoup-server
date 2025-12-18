/**
 * Game Socket Handlers
 * Handles all game-related socket events: player_action, end_turn
 */

import { Server, Socket } from 'socket.io';
import { GameRoomManager } from '../../gameRoom';
import { processPlayerAction, advanceTurn, getClientState, processSingleFactionAITurn } from '../../gameLogic';
import { resolveCombatResult } from '../../../../shared/services/combat';

export function registerGameHandlers(
    io: Server,
    socket: Socket,
    gameRoomManager: GameRoomManager
): void {

    socket.on('player_action', ({ action }) => {
        console.log(`[Game] Received player_action from socket ${socket.id}:`, action?.type);

        // Try to get gameCode from socket data, or recover it from room manager
        let code = socket.data.gameCode;
        if (!code) {
            code = gameRoomManager.getGameCodeForSocket(socket.id);
            if (code) {
                socket.data.gameCode = code; // Restore it
                console.log(`[Game] Recovered gameCode ${code} for socket ${socket.id}`);
            }
        }

        if (!code) {
            console.log(`[Game] ERROR: No gameCode for socket ${socket.id}`);
            socket.emit('error', { message: 'Not in a game' });
            return;
        }

        const room = gameRoomManager.getRoom(code);
        if (!room) {
            socket.emit('error', { message: 'Game room not found' });
            return;
        }

        // Get player's faction
        const playerFaction = room.playerFactions.get(socket.id);
        if (!playerFaction) {
            socket.emit('action_result', { success: false, error: 'Player faction not found' });
            return;
        }

        // Process action on server using shared game logic
        console.log(`[Game] ${code}: Processing ${action.type} from ${playerFaction}`);
        const sharedAction = { ...action, faction: playerFaction }; // Add faction for shared type
        const result = processPlayerAction(room.gameState, sharedAction as any, playerFaction);

        if (!result.success) {
            socket.emit('action_result', { success: false, error: result.error });
            return;
        }

        // Update server state
        room.gameState = result.newState;

        // Check if combat was triggered by this action
        if (result.newState.combatState) {
            const combat = result.newState.combatState;
            // Check if participants are human by socket presence (covers AI and NEUTRAL)
            const attackerSocketId = gameRoomManager.getSocketForFaction(code, combat.attackerFaction);
            const defenderSocketId = gameRoomManager.getSocketForFaction(code, combat.defenderFaction);
            const attackerIsHuman = attackerSocketId !== null;
            const defenderIsHuman = defenderSocketId !== null;

            console.log(`[Game] ${code}: Combat detected - Attacker: ${combat.attackerFaction} (Human: ${attackerIsHuman}), Defender: ${combat.defenderFaction} (Human: ${defenderIsHuman})`);

            if (!attackerIsHuman && !defenderIsHuman) {
                // AI/Neutral vs AI/Neutral - auto resolve with FIGHT
                console.log(`[Game] ${code}: Non-human combat - auto-resolving`);
                const updates = resolveCombatResult(room.gameState, 'FIGHT', 0);
                room.gameState = { ...room.gameState, ...updates };
            } else if (!attackerIsHuman && defenderIsHuman) {
                // AI/Neutral attacker vs Human defender - AI always fights, ask defender
                console.log(`[Game] ${code}: AI attacker vs Human defender - asking defender only`);
                gameRoomManager.initiateCombat(code, combat, 'AI', combat.defenderFaction);
                gameRoomManager.setAttackerChoice(code, 'FIGHT');
                // Clear combatState from server state - it's now tracked in pendingCombat
                room.gameState.combatState = null;
                io.to(defenderSocketId).emit('combat_choice_requested', {
                    combatState: combat,
                    role: 'DEFENDER'
                });
            } else if (attackerIsHuman && !defenderIsHuman) {
                // Human attacker vs AI/Neutral defender - ask attacker only, AI auto-responds
                console.log(`[Game] ${code}: Human attacker vs AI defender - asking attacker only`);
                gameRoomManager.initiateCombat(code, combat, socket.id, combat.defenderFaction);
                // Clear combatState from server state - it's now tracked in pendingCombat
                room.gameState.combatState = null;
                socket.emit('combat_choice_requested', {
                    combatState: combat,
                    role: 'ATTACKER'
                });
            } else {
                // Human vs Human (PvP) - ask attacker first, then defender
                console.log(`[Game] ${code}: PvP combat - asking attacker first`);
                gameRoomManager.initiateCombat(code, combat, attackerSocketId!, combat.defenderFaction);
                // Clear combatState from server state - it's now tracked in pendingCombat
                room.gameState.combatState = null;
                io.to(attackerSocketId!).emit('combat_choice_requested', {
                    combatState: combat,
                    role: 'ATTACKER'
                });
            }
        }

        // Broadcast updated state to ALL players
        // Exclude combatState from broadcast - it's sent only to involved players via combat_choice_requested
        const clientState = getClientState(room.gameState);
        const stateForBroadcast = room.pendingCombat
            ? { ...clientState, combatState: null }
            : clientState;
        io.to(code).emit('state_update', { gameState: stateForBroadcast });

        socket.emit('action_result', { success: true });
        console.log(`[Game] ${code}: Action ${action.type} processed successfully`);
    });

    socket.on('end_turn', async () => {
        // Try to get gameCode from socket data, or recover it from room manager
        let code = socket.data.gameCode;
        if (!code) {
            code = gameRoomManager.getGameCodeForSocket(socket.id);
            if (code) {
                socket.data.gameCode = code;
                console.log(`[Game] Recovered gameCode ${code} for socket ${socket.id}`);
            }
        }

        if (!code) {
            socket.emit('error', { message: 'Not in a game' });
            return;
        }

        if (!gameRoomManager.isPlayerTurn(code, socket.id)) {
            socket.emit('error', { message: 'Not your turn' });
            return;
        }

        const room = gameRoomManager.getRoom(code);
        if (!room) {
            socket.emit('error', { message: 'Game room not found' });
            return;
        }

        console.log(`[Game] ${code}: Ending turn for ${room.gameState.currentTurnFaction}`);

        try {
            // 1. Advance the turn (calculates next faction, potentially processes full turn if round complete)
            let result = await advanceTurn(room.gameState);

            // Update room state
            room.gameState = result.newState;

            // Auto-resolve any AI combats (AI vs AI, AI vs Neutral, etc.)
            while (room.gameState.combatState) {
                const combat = room.gameState.combatState;
                const attackerIsHuman = room.playerFactions.has(gameRoomManager.getSocketForFaction(code, combat.attackerFaction) || '');
                const defenderIsHuman = room.playerFactions.has(gameRoomManager.getSocketForFaction(code, combat.defenderFaction) || '');

                if (!attackerIsHuman && !defenderIsHuman) {
                    // Neither is human (AI vs AI or AI vs Neutral) - auto-resolve
                    console.log(`[Game] ${code}: Auto-resolving non-human combat: ${combat.attackerFaction} vs ${combat.defenderFaction}`);
                    const updates = resolveCombatResult(room.gameState, 'FIGHT', 0);
                    room.gameState = { ...room.gameState, ...updates };
                } else {
                    // At least one human involved - break loop, will be handled by combat_choice
                    break;
                }
            }

            // Notify players of the new state and turn
            io.to(code).emit('state_update', { gameState: getClientState(room.gameState) });
            io.to(code).emit('turn_changed', {
                currentFaction: room.gameState.currentTurnFaction,
                turnNumber: room.gameState.turn
            });

            // 2. If it's an AI turn, process it immediately
            // Loop in case multiple AI turns happen in sequence (unlikely in this design but good for robustness)
            while (result.isAITurn) {
                console.log(`[Game] ${code}: Processing AI turn for ${result.nextFaction}`);

                // Execute AI logic for this faction
                room.gameState = processSingleFactionAITurn(room.gameState, result.nextFaction);

                // Handle any combats generated during AI turn
                while (room.gameState.combatState) {
                    const combat = room.gameState.combatState;
                    const attackerSocketId = gameRoomManager.getSocketForFaction(code, combat.attackerFaction);
                    const defenderSocketId = gameRoomManager.getSocketForFaction(code, combat.defenderFaction);
                    const attackerIsHuman = attackerSocketId !== null;
                    const defenderIsHuman = defenderSocketId !== null;

                    if (!attackerIsHuman && !defenderIsHuman) {
                        // Neither is human (AI vs AI or AI vs Neutral) - auto-resolve
                        console.log(`[Game] ${code}: Auto-resolving AI combat: ${combat.attackerFaction} vs ${combat.defenderFaction}`);
                        const updates = resolveCombatResult(room.gameState, 'FIGHT', 0);
                        room.gameState = { ...room.gameState, ...updates };
                    } else if (!attackerIsHuman && defenderIsHuman) {
                        // AI attacker vs Human defender - AI fights, ask defender
                        console.log(`[Game] ${code}: AI attacker vs Human defender - asking defender`);
                        gameRoomManager.initiateCombat(code, combat, 'AI', combat.defenderFaction);
                        gameRoomManager.setAttackerChoice(code, 'FIGHT');
                        room.gameState.combatState = null;
                        io.to(defenderSocketId!).emit('combat_choice_requested', {
                            combatState: combat,
                            role: 'DEFENDER'
                        });
                        break; // Wait for human response
                    } else if (attackerIsHuman && !defenderIsHuman) {
                        // Human attacker vs AI/Neutral - Should not happen during AI turn, but handle it
                        console.log(`[Game] ${code}: Human attacker during AI turn - unexpected, auto-resolving`);
                        const updates = resolveCombatResult(room.gameState, 'FIGHT', 0);
                        room.gameState = { ...room.gameState, ...updates };
                    } else {
                        // Human vs Human - Should not happen during AI turn
                        console.log(`[Game] ${code}: PvP combat during AI turn - unexpected`);
                        break;
                    }
                }

                // Send updates after AI turn - EXCLUDE combatState if there's pending combat
                const aiClientState = getClientState(room.gameState);
                const aiStateForBroadcast = room.pendingCombat
                    ? { ...aiClientState, combatState: null }
                    : aiClientState;
                io.to(code).emit('state_update', { gameState: aiStateForBroadcast });
                io.to(code).emit('turn_changed', {
                    currentFaction: room.gameState.currentTurnFaction,
                    turnNumber: room.gameState.turn
                });

                // If there's pending combat with a human, stop advancing turns
                if (room.pendingCombat) {
                    console.log(`[Game] ${code}: Waiting for human combat response`);
                    break;
                }

                // Advance to next player after AI finishes
                result = await advanceTurn(room.gameState);
                room.gameState = result.newState;

                // Send state update after advancing turn
                io.to(code).emit('state_update', { gameState: getClientState(room.gameState) });
                io.to(code).emit('turn_changed', {
                    currentFaction: room.gameState.currentTurnFaction,
                    turnNumber: room.gameState.turn
                });
            }

        } catch (err: any) {
            console.error(`[Game] ${code}: Error ending turn:`, err);
            socket.emit('error', { message: 'Failed to process end turn' });
        }
    });
}
