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
export declare function getBattleLocationName(combatState: CombatState, gameState: any): string;
/**
 * Convert CombatState array to BattleInfo array for display
 */
export declare function combatStatesToBattleInfos(combatStates: CombatState[], gameState: any): BattleInfo[];
/**
 * Create BattleResolutionPhase state
 */
export declare function createBattleResolutionPhase(currentCombat: CombatState | null, combatQueue: CombatState[], gameState: any, currentIndex?: number): BattleResolutionPhase;
/**
 * Emit combat_phase_started event to all players in a room
 */
export declare function emitCombatPhaseStarted(io: Server, roomCode: string, currentCombat: CombatState, combatQueue: CombatState[], gameState: any): void;
/**
 * Emit combat_phase_update event to all players in a room
 * Called when a battle is resolved or new battles are added
 */
export declare function emitCombatPhaseUpdate(io: Server, roomCode: string, currentCombat: CombatState | null, combatQueue: CombatState[], gameState: any, resolvedCount: number): void;
/**
 * Emit combat_phase_ended event to all players in a room
 */
export declare function emitCombatPhaseEnded(io: Server, roomCode: string): void;
/**
 * Check if there are any human-involved battles in the queue
 * This helps determine if the phase should start
 */
export declare function hasHumanInvolvedBattles(combatStates: CombatState[], humanFactions: FactionId[]): boolean;
