/**
 * Military Movement Service
 * Handles army movement logic including local and regional roads
 * Extracted from useGameEngine.ts moveArmy()
 */
import { GameState, FactionId } from '../../../types';
export interface MoveArmyResult {
    success: boolean;
    newState: Partial<GameState>;
    triggersRescan: boolean;
    message: string;
}
/**
 * Check if an army can move to a destination
 */
export declare const canMoveArmy: (state: GameState, armyId: string, destLocId: string) => {
    canMove: boolean;
    reason?: string;
};
/**
 * Execute army movement
 * Returns state updates to apply
 */
export declare const executeArmyMove: (state: GameState, armyId: string, destLocId: string, playerFaction: FactionId) => MoveArmyResult;
/**
 * Split an army into two
 */
export declare const executeSplitArmy: (state: GameState, armyId: string, amount: number) => Partial<GameState>;
