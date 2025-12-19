/**
 * Game Socket Handlers
 * Handles all game-related socket events: player_action, end_turn
 */

import { Server, Socket } from 'socket.io';
import { GameRoomManager } from '../../gameRoom';
import { processPlayerAction, advanceTurn, getClientState, processSingleFactionAITurn } from '../../gameLogic';
import { resolveCombatResult } from '../../../../shared/services/combat';
import { emitCombatPhaseStarted, emitCombatPhaseEnded, emitCombatPhaseUpdate } from './battlePhaseUtils';

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

        // Block actions if there's a pending combat that involves this player
        if (room.pendingCombat) {
            const combat = room.pendingCombat;
            const playerIsInvolvedInCombat =
                socket.id === combat.attackerSocketId ||
                socket.id === combat.defenderSocketId ||
                combat.combatState.attackerFaction === playerFaction ||
                combat.combatState.defenderFaction === playerFaction;

            if (playerIsInvolvedInCombat) {
                socket.emit('action_result', {
                    success: false,
                    error: 'Cannot perform action while combat is pending. Resolve the combat first.'
                });
                // Re-send the combat request in case client missed it
                const role = combat.combatState.attackerFaction === playerFaction ? 'ATTACKER' : 'DEFENDER';
                socket.emit('combat_choice_requested', {
                    combatState: combat.combatState,
                    role
                });
                return;
            }
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
        const stateForBroadcast = { ...clientState, combatState: null };
        io.to(code).emit('state_update', { gameState: stateForBroadcast });

        socket.emit('action_result', { success: true });
        console.log(`[Game] ${code}: Action ${action.type} processed successfully`);
    });

    // NOTE: combat_choice handler is defined in combatHandlers.ts
    // DO NOT duplicate it here - the handler there includes proper routing for subsequent battles

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
            console.log(`[END_TURN] Calling advanceTurn...`);
            let result = await advanceTurn(room.gameState);

            // Update room state
            room.gameState = result.newState;

            // DEBUG: Log state after advanceTurn
            console.log(`[END_TURN] advanceTurn complete. combatState=${room.gameState.combatState ? 'SET' : 'NULL'}`);
            if (room.gameState.combatState) {
                const cs = room.gameState.combatState;
                console.log(`[END_TURN] combatState details: attacker=${cs.attackerFaction}, defender=${cs.defenderFaction}, location=${cs.locationId || cs.roadId}`);
            }
            console.log(`[END_TURN] humanFactions=${JSON.stringify(room.gameState.humanFactions)}`);
            console.log(`[END_TURN] combatQueue length=${room.gameState.combatQueue?.length || 0}`);

            // Handle any combats generated by processTurn (including insurrections)
            // Loop to auto-resolve AI vs AI battles, and route human battles properly
            let pendingCombatRequest: { socketId: string; combatState: any; role: 'ATTACKER' | 'DEFENDER' } | null = null;

            // FIX: If combatState is NULL but combatQueue has battles, pop the first one
            if (!room.gameState.combatState && room.gameState.combatQueue && room.gameState.combatQueue.length > 0) {
                console.log(`[END_TURN] combatState is NULL but queue has ${room.gameState.combatQueue.length} battles. Popping first...`);
                const [nextBattle, ...remainingQueue] = room.gameState.combatQueue;
                room.gameState.combatState = nextBattle;
                room.gameState.combatQueue = remainingQueue;
                console.log(`[END_TURN] Popped: ${nextBattle.attackerFaction} vs ${nextBattle.defenderFaction}. Remaining queue: ${remainingQueue.length}`);
            }

            // START BATTLE PHASE if there are any battles to resolve
            if (room.gameState.combatState) {
                const totalBattles = 1 + (room.gameState.combatQueue?.length || 0);
                gameRoomManager.startBattlePhase(code, totalBattles);
                emitCombatPhaseStarted(
                    io,
                    code,
                    room.gameState.combatState,
                    room.gameState.combatQueue || [],
                    room.gameState
                );
            }

            while (room.gameState.combatState) {
                const combat = room.gameState.combatState;
                const attackerSocketId = gameRoomManager.getSocketForFaction(code, combat.attackerFaction);
                const defenderSocketId = gameRoomManager.getSocketForFaction(code, combat.defenderFaction);
                const attackerIsHuman = attackerSocketId !== null;
                const defenderIsHuman = defenderSocketId !== null;

                console.log(`[Game] ${code}: Turn combat check - Attacker: ${combat.attackerFaction} (Human: ${attackerIsHuman}), Defender: ${combat.defenderFaction} (Human: ${defenderIsHuman})`);

                if (!attackerIsHuman && !defenderIsHuman) {
                    // Neither is human (AI vs AI or AI vs Neutral) - auto-resolve
                    console.log(`[Game] ${code}: Auto-resolving non-human combat: ${combat.attackerFaction} vs ${combat.defenderFaction}`);
                    const updates = resolveCombatResult(room.gameState, 'FIGHT', 0);
                    room.gameState = { ...room.gameState, ...updates };
                    // Continue loop to check for more combats
                } else if (!attackerIsHuman && defenderIsHuman) {
                    // AI/Neutral attacker vs Human defender - route to defender
                    console.log(`[Game] ${code}: AI/Neutral attacker vs Human defender - asking defender`);
                    gameRoomManager.initiateCombat(code, combat, 'AI', combat.defenderFaction);
                    gameRoomManager.setAttackerChoice(code, 'FIGHT');
                    room.gameState.combatState = null; // Clear from public state
                    // Store for later emission AFTER state_update
                    pendingCombatRequest = { socketId: defenderSocketId!, combatState: combat, role: 'DEFENDER' };
                    break; // Wait for human response
                } else if (attackerIsHuman && !defenderIsHuman) {
                    // Human attacker vs AI/Neutral defender - route to attacker
                    console.log(`[Game] ${code}: Human attacker vs AI/Neutral defender - asking attacker`);
                    gameRoomManager.initiateCombat(code, combat, attackerSocketId!, combat.defenderFaction);
                    room.gameState.combatState = null; // Clear from public state
                    // Store for later emission AFTER state_update
                    pendingCombatRequest = { socketId: attackerSocketId!, combatState: combat, role: 'ATTACKER' };
                    break; // Wait for human response
                } else {
                    // Human vs Human (PvP) - route to attacker first
                    console.log(`[Game] ${code}: PvP combat - asking attacker first`);
                    gameRoomManager.initiateCombat(code, combat, attackerSocketId!, combat.defenderFaction);
                    room.gameState.combatState = null; // Clear from public state
                    // Store for later emission AFTER state_update
                    pendingCombatRequest = { socketId: attackerSocketId!, combatState: combat, role: 'ATTACKER' };
                    break; // Wait for human response
                }
            }

            // CRITICAL: Broadcast state_update FIRST to prevent race condition
            // Then send combat_choice_requested to involved player
            const clientStateAfterTurn = getClientState(room.gameState);
            const sanitizedState = { ...clientStateAfterTurn, combatState: null };
            io.to(code).emit('state_update', { gameState: sanitizedState });
            io.to(code).emit('turn_changed', {
                currentFaction: room.gameState.currentTurnFaction,
                turnNumber: room.gameState.turn
            });

            // NOW send combat_choice_requested after client has processed state_update
            if (pendingCombatRequest) {
                io.to(pendingCombatRequest.socketId).emit('combat_choice_requested', {
                    combatState: pendingCombatRequest.combatState,
                    role: pendingCombatRequest.role
                });
                console.log(`[Game] ${code}: Sent combat_choice_requested to ${pendingCombatRequest.role}`);
            }

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

            // CRITICAL FIX: After AI turn loop completes, check for any battles that need routing
            // This catches insurrection battles from processTurn that weren't detected during the loop
            if (room.gameState.combatState && !room.pendingCombat) {
                console.log(`[END_TURN] Post-AI check: Found unrouted combat!`);
                const combat = room.gameState.combatState;
                const attackerSocketId = gameRoomManager.getSocketForFaction(code, combat.attackerFaction);
                const defenderSocketId = gameRoomManager.getSocketForFaction(code, combat.defenderFaction);
                const attackerIsHuman = attackerSocketId !== null;
                const defenderIsHuman = defenderSocketId !== null;

                console.log(`[END_TURN] Post-AI combat: ${combat.attackerFaction} vs ${combat.defenderFaction}, attackerHuman=${attackerIsHuman}, defenderHuman=${defenderIsHuman}`);

                if (!attackerIsHuman && !defenderIsHuman) {
                    // Auto-resolve non-human combat
                    const updates = resolveCombatResult(room.gameState, 'FIGHT', 0);
                    room.gameState = { ...room.gameState, ...updates };
                } else if (!attackerIsHuman && defenderIsHuman) {
                    // AI/Neutral attacker vs Human defender
                    gameRoomManager.initiateCombat(code, combat, 'AI', combat.defenderFaction);
                    gameRoomManager.setAttackerChoice(code, 'FIGHT');
                    room.gameState.combatState = null;

                    // Broadcast sanitized state FIRST
                    const clientState = getClientState(room.gameState);
                    io.to(code).emit('state_update', { gameState: { ...clientState, combatState: null } });

                    // THEN send combat request
                    io.to(defenderSocketId!).emit('combat_choice_requested', {
                        combatState: combat,
                        role: 'DEFENDER'
                    });
                    console.log(`[END_TURN] Sent combat_choice_requested to defender`);
                } else if (attackerIsHuman && !defenderIsHuman) {
                    // Human attacker vs AI/Neutral defender
                    gameRoomManager.initiateCombat(code, combat, attackerSocketId!, combat.defenderFaction);
                    room.gameState.combatState = null;

                    // Broadcast sanitized state FIRST
                    const clientState = getClientState(room.gameState);
                    io.to(code).emit('state_update', { gameState: { ...clientState, combatState: null } });

                    // THEN send combat request
                    io.to(attackerSocketId!).emit('combat_choice_requested', {
                        combatState: combat,
                        role: 'ATTACKER'
                    });
                    console.log(`[END_TURN] Sent combat_choice_requested to attacker`);
                } else {
                    // PvP - route to attacker first
                    gameRoomManager.initiateCombat(code, combat, attackerSocketId!, combat.defenderFaction);
                    room.gameState.combatState = null;

                    // Broadcast sanitized state FIRST
                    const clientState = getClientState(room.gameState);
                    io.to(code).emit('state_update', { gameState: { ...clientState, combatState: null } });

                    // THEN send combat request
                    io.to(attackerSocketId!).emit('combat_choice_requested', {
                        combatState: combat,
                        role: 'ATTACKER'
                    });
                    console.log(`[END_TURN] Sent PvP combat_choice_requested to attacker`);
                }
            }

        } catch (err: any) {
            console.error(`[Game] ${code}: Error ending turn:`, err);
            socket.emit('error', { message: 'Failed to process end turn' });
        }
    });
}
