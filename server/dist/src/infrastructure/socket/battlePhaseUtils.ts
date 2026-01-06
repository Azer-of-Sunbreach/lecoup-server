/**
 * Battle Resolution Phase Utilities
 * 
 * Manages the battle resolution phase state and emits events to all players.
 * This module provides functions to start, update, and end the battle phase.
 */

import { Server } from 'socket.io';
import { FactionId, CombatState, BattleInfo, BattleResolutionPhase } from '../../../../shared/types';

/**
 * Get battle location name from CombatState
 */
export function getBattleLocationName(
    combatState: CombatState,
    gameState: any
): string {
    if (combatState.locationId) {
        const loc = gameState.locations?.find((l: any) => l.id === combatState.locationId);
        return loc?.name || 'Unknown Location';
    }
    if (combatState.roadId && combatState.stageIndex !== undefined) {
        const road = gameState.roads?.find((r: any) => r.id === combatState.roadId);
        return road?.stages[combatState.stageIndex]?.name || 'Road Stage';
    }
    return 'Unknown Location';
}

/**
 * Convert CombatState array to BattleInfo array for display
 */
export function combatStatesToBattleInfos(
    combatStates: CombatState[],
    gameState: any
): BattleInfo[] {
    return combatStates.map(cs => ({
        attackerFaction: cs.attackerFaction,
        defenderFaction: cs.defenderFaction,
        locationName: getBattleLocationName(cs, gameState)
    }));
}

/**
 * Create BattleResolutionPhase state
 */
export function createBattleResolutionPhase(
    currentCombat: CombatState | null,
    combatQueue: CombatState[],
    gameState: any,
    currentIndex: number = 1
): BattleResolutionPhase {
    // Combine current combat with queue for the battle list
    const allBattles: CombatState[] = [];
    if (currentCombat) {
        allBattles.push(currentCombat);
    }
    allBattles.push(...combatQueue);

    const totalBattles = allBattles.length + (currentIndex - 1); // Add already resolved battles

    return {
        isActive: true,
        currentIndex,
        totalBattles: Math.max(totalBattles, currentIndex),
        battles: combatStatesToBattleInfos(allBattles, gameState)
    };
}

/**
 * Emit combat_phase_started event to all players in a room
 */
export function emitCombatPhaseStarted(
    io: Server,
    roomCode: string,
    currentCombat: CombatState,
    combatQueue: CombatState[],
    gameState: any
): void {
    const phase = createBattleResolutionPhase(currentCombat, combatQueue, gameState, 1);

    console.log(`[COMBAT_PHASE] Starting phase for room ${roomCode} with ${phase.totalBattles} battles`);

    io.to(roomCode).emit('combat_phase_started', { phase });
}

/**
 * Emit combat_phase_update event to all players in a room
 * Called when a battle is resolved or new battles are added
 */
export function emitCombatPhaseUpdate(
    io: Server,
    roomCode: string,
    currentCombat: CombatState | null,
    combatQueue: CombatState[],
    gameState: any,
    resolvedCount: number
): void {
    const phase = createBattleResolutionPhase(
        currentCombat,
        combatQueue,
        gameState,
        resolvedCount + 1 // 1-based index for display
    );

    console.log(`[COMBAT_PHASE] Update for room ${roomCode}: battle ${phase.currentIndex}/${phase.totalBattles}`);

    io.to(roomCode).emit('combat_phase_update', { phase });
}

/**
 * Emit combat_phase_ended event to all players in a room
 */
export function emitCombatPhaseEnded(
    io: Server,
    roomCode: string
): void {
    console.log(`[COMBAT_PHASE] Ending phase for room ${roomCode}`);

    io.to(roomCode).emit('combat_phase_ended', {});
}

/**
 * Check if there are any human-involved battles in the queue
 * This helps determine if the phase should start
 */
export function hasHumanInvolvedBattles(
    combatStates: CombatState[],
    humanFactions: FactionId[]
): boolean {
    return combatStates.some(cs =>
        humanFactions.includes(cs.attackerFaction) ||
        humanFactions.includes(cs.defenderFaction)
    );
}
