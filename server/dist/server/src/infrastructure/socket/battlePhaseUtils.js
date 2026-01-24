"use strict";
/**
 * Battle Resolution Phase Utilities
 *
 * Manages the battle resolution phase state and emits events to all players.
 * This module provides functions to start, update, and end the battle phase.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBattleLocationName = getBattleLocationName;
exports.combatStatesToBattleInfos = combatStatesToBattleInfos;
exports.createBattleResolutionPhase = createBattleResolutionPhase;
exports.emitCombatPhaseStarted = emitCombatPhaseStarted;
exports.emitCombatPhaseUpdate = emitCombatPhaseUpdate;
exports.emitCombatPhaseEnded = emitCombatPhaseEnded;
exports.hasHumanInvolvedBattles = hasHumanInvolvedBattles;
/**
 * Get battle location name from CombatState
 */
function getBattleLocationName(combatState, gameState) {
    if (combatState.locationId) {
        const loc = gameState.locations?.find((l) => l.id === combatState.locationId);
        return loc?.name || 'Unknown Location';
    }
    if (combatState.roadId && combatState.stageIndex !== undefined) {
        const road = gameState.roads?.find((r) => r.id === combatState.roadId);
        return road?.stages[combatState.stageIndex]?.name || 'Road Stage';
    }
    return 'Unknown Location';
}
/**
 * Convert CombatState array to BattleInfo array for display
 */
function combatStatesToBattleInfos(combatStates, gameState) {
    return combatStates.map(cs => ({
        attackerFaction: cs.attackerFaction,
        defenderFaction: cs.defenderFaction,
        locationName: getBattleLocationName(cs, gameState)
    }));
}
/**
 * Create BattleResolutionPhase state
 */
function createBattleResolutionPhase(currentCombat, combatQueue, gameState, currentIndex = 1) {
    // Combine current combat with queue for the battle list
    const allBattles = [];
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
function emitCombatPhaseStarted(io, roomCode, currentCombat, combatQueue, gameState) {
    const phase = createBattleResolutionPhase(currentCombat, combatQueue, gameState, 1);
    console.log(`[COMBAT_PHASE] Starting phase for room ${roomCode} with ${phase.totalBattles} battles`);
    io.to(roomCode).emit('combat_phase_started', { phase });
}
/**
 * Emit combat_phase_update event to all players in a room
 * Called when a battle is resolved or new battles are added
 */
function emitCombatPhaseUpdate(io, roomCode, currentCombat, combatQueue, gameState, resolvedCount) {
    const phase = createBattleResolutionPhase(currentCombat, combatQueue, gameState, resolvedCount + 1 // 1-based index for display
    );
    console.log(`[COMBAT_PHASE] Update for room ${roomCode}: battle ${phase.currentIndex}/${phase.totalBattles}`);
    io.to(roomCode).emit('combat_phase_update', { phase });
}
/**
 * Emit combat_phase_ended event to all players in a room
 */
function emitCombatPhaseEnded(io, roomCode) {
    console.log(`[COMBAT_PHASE] Ending phase for room ${roomCode}`);
    io.to(roomCode).emit('combat_phase_ended', {});
}
/**
 * Check if there are any human-involved battles in the queue
 * This helps determine if the phase should start
 */
function hasHumanInvolvedBattles(combatStates, humanFactions) {
    return combatStates.some(cs => humanFactions.includes(cs.attackerFaction) ||
        humanFactions.includes(cs.defenderFaction));
}
