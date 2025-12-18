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
        // Broadcast updated state to ALL players
        // Exclude combatState from broadcast - it's sent only to involved players via combat_choice_requested
        const clientState = getClientState(room.gameState);

        // FIX: Ensure combatState is NULL in the broadcast unless we specifically want to show it (which we don't, for privacy)
        // Previous logic: `room.pendingCombat ? ... : ...`
        // But if pendingCombat is SET, we definitely want to HIDE the `combatState` property in the public broadcast.
        // And even if it's NOT set (resolved), we don't want to leak "active" combat unless it's intended.
        const stateForBroadcast = { ...clientState, combatState: null };

        io.to(code).emit('state_update', { gameState: stateForBroadcast });

        socket.emit('action_result', { success: true });
        console.log(`[Game] ${code}: Action ${action.type} processed successfully`);
    });

    socket.on('combat_choice', ({ choice, siegeCost }) => {
        // Try to get gameCode from socket data, or recover it from room manager
        let code = socket.data.gameCode;
        if (!code) {
            code = gameRoomManager.getGameCodeForSocket(socket.id);
            if (code) {
                socket.data.gameCode = code;
            }
        }

        if (!code) {
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

        if (!room.pendingCombat) {
            socket.emit('action_result', { success: false, error: 'No pending combat found' });
            return;
        }

        const combat = room.pendingCombat;
        const isAttacker = combat.attackerSocketId === socket.id;
        const isDefender = combat.defenderSocketId === socket.id;

        if (!isAttacker && !isDefender) {
            socket.emit('action_result', { success: false, error: 'You are not involved in this combat' });
            return;
        }

        console.log(`[Game] ${code}: Received combat choice ${choice} from ${playerFaction} (${isAttacker ? 'ATTACKER' : 'DEFENDER'})`);

        // Record choice
        if (isAttacker) {
            gameRoomManager.setAttackerChoice(code, choice, siegeCost);
        } else {
            gameRoomManager.setDefenderChoice(code, choice);
        }

        // Check if ready to resolve
        if (gameRoomManager.isCombatReady(code)) {
            console.log(`[Game] ${code}: All parties chose. Resolving combat...`);

            // Get final choices
            const attackerChoice = room.pendingCombat.attackerChoice;
            const defenderChoice = room.pendingCombat.defenderChoice || 'FIGHT'; // Default for AI if any
            const finalSiegeCost = room.pendingCombat.siegeCost;

            // Resolve using shared logic
            // Note: resolveCombatResult expects `attackerChoice` etc. to be passed or derived? 
            // The shared `resolveCombatResult` function normally takes ONE choice (from the active player).
            // But here we have two. We need to handle this carefully.
            // Looking at `combat.ts`: `resolveCombatResult(state, choice, siegeCost)`
            // It seems designed for single-player where the "Player" makes a choice.
            // If both fight, it's a fight. If one retreats, etc.

            // LOGIC ADAPTATION for Multiplayer:
            // If EITHER retreats, it's a retreat (usually).
            // If Attacker SIEGES, it's a siege.

            let finalAction: 'FIGHT' | 'RETREAT' | 'RETREAT_CITY' | 'SIEGE' = 'FIGHT';

            if (attackerChoice === 'RETREAT') finalAction = 'RETREAT';
            else if (defenderChoice === 'RETREAT_CITY') finalAction = 'RETREAT_CITY'; // What about normal retreat? Defender usually only retreats to city or just loses.
            else if (attackerChoice === 'SIEGE') finalAction = 'SIEGE';
            else finalAction = 'FIGHT';

            // Execute resolution
            // We need to pass the "Action" that triggered the resolution.
            // In the shared logic, it assumes "Current Player" made the choice.
            // But here strictly speaking it might be a simultaneous resolution.
            // However, `resolveCombatResult` typically processes the combat stored in state.

            // IMPORTANT: We need to put the combat back into state.combatState for the resolver to find it!
            // The handlers removed it earlier to put it into pendingCombat.
            room.gameState.combatState = room.pendingCombat.combatState;

            const updates = resolveCombatResult(room.gameState, finalAction, finalSiegeCost);
            room.gameState = { ...room.gameState, ...updates };

            // Clear pending combat
            gameRoomManager.clearCombat(code);
            room.gameState.combatState = null; // Ensure it's cleared from state too

            // Broadcast updates
            const clientState = getClientState(room.gameState);
            io.to(code).emit('state_update', { gameState: clientState });
            io.to(code).emit('combat_resolved', { result: 'Combat ended' }); // Simple notification

            console.log(`[Game] ${code}: Combat resolved with action ${finalAction}`);

            // If combat was blocking end_turn or other flows, they should naturally proceed now that pendingCombat is null.

        } else {
            // Waiting for other player
            const otherSocketId = isAttacker ? combat.defenderSocketId : combat.attackerSocketId;
            if (otherSocketId) {
                io.to(otherSocketId).emit('attacker_waiting', {
                    combatState: combat.combatState,
                    message: 'Opponent has chosen. Waiting for you.'
                });
            }
            socket.emit('action_result', { success: true, message: 'Waiting for opponent...' });
        }
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
