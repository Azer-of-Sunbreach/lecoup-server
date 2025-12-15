import { GameState, Character, Location, Army, FactionId } from '../../types';
export declare const processInsurrections: (locations: Location[], characters: Character[], armies: Army[], playerFaction: FactionId) => {
    locations: Location[];
    characters: Character[];
    armies: Army[];
    logs: string[];
    notification: any | null;
    refunds: { [key in FactionId]?: number; };
};
export declare const processConstruction: (state: GameState) => {
    locations: Location[];
    roads: any[];
    armies: Army[];
    logs: string[];
};
export declare const processAutoCapture: (locations: Location[], roads: any[], armies: Army[], playerFaction: FactionId) => {
    locations: Location[];
    roads: any[];
    logs: string[];
    tradeNotification: any;
};
