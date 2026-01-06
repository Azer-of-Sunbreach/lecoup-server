/**
 * Leaders Service
 * Handles player leader management (attach, detach, move)
 * Extracted from App.tsx handleAttachLeader/DetachLeader/MoveLeader
 */
import { GameState } from '../../../types';
export interface LeaderActionResult {
    success: boolean;
    newState: Partial<GameState>;
    message: string;
}
/**
 * Attach a leader to an army
 */
export declare const executeAttachLeader: (state: GameState, armyId: string, charId: string) => LeaderActionResult;
/**
 * Detach a leader from their army
 */
export declare const executeDetachLeader: (state: GameState, charId: string) => LeaderActionResult;
/**
 * Move a leader to a new location
 */
export declare const executeMoveLeader: (state: GameState, charId: string, destId: string) => LeaderActionResult;
