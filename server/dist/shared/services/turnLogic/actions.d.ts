import { GameState, Character, Location, Army, FactionId, LogEntry } from '../../types';
export declare const processInsurrections: (locations: Location[], characters: Character[], armies: Army[], playerFaction: FactionId, currentTurn?: number) => {
    locations: Location[];
    characters: Character[];
    armies: Army[];
    logs: LogEntry[];
    notification: any | null;
    refunds: { [key in FactionId]?: number; };
};
export declare const processConstruction: (state: GameState) => {
    locations: Location[];
    roads: any[];
    armies: Army[];
    logs: LogEntry[];
};
export declare const processAutoCapture: (locations: Location[], roads: any[], armies: Army[], characters: Character[], playerFaction: FactionId, currentTurn?: number) => {
    locations: Location[];
    roads: any[];
    characters: Character[];
    logs: LogEntry[];
    tradeNotification: any;
};
