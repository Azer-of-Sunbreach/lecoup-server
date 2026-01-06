import { GameState, FactionId } from '../../../types';
export declare const executeGarrison: (state: GameState, armyId: string, faction: FactionId) => {
    success: boolean;
    newState: GameState;
    error?: string;
};
