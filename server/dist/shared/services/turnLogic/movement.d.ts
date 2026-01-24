import { GameState, Army, Character, LogEntry } from '../../types';
export declare const resolveMovements: (state: GameState) => {
    armies: Army[];
    characters: Character[];
    logs: LogEntry[];
};
