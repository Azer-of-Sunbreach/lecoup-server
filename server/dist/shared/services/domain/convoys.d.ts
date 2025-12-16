import { GameState, FactionId } from '../../types';
export declare const executeSendConvoy: (state: GameState, locationId: string, amount: number, destinationId: string, faction: FactionId) => {
    success: boolean;
    newState: GameState;
    error?: string;
};
export declare const executeSendNavalConvoy: (state: GameState, locationId: string, amount: number, destinationId: string, faction: FactionId) => {
    success: boolean;
    newState: GameState;
    error?: string;
};
export declare const executeReverseConvoy: (state: GameState, convoyId: string, faction: FactionId) => {
    success: boolean;
    newState: GameState;
    error?: string;
};
