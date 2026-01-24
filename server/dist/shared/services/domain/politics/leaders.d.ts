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
 * NOTE: If leader is GOVERNING, they retain that status (governor can command armies in their region)
 */
export declare const executeDetachLeader: (state: GameState, charId: string) => LeaderActionResult;
export declare const executeMoveLeader: (state: GameState, charId: string, destId: string) => LeaderActionResult;
