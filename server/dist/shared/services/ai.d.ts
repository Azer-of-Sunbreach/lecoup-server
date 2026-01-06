import { FactionId } from '../types';
export declare const generateTurnNarrative: (turn: number, events: string[], playerFaction: FactionId, context?: {
    leaders: {
        name: string;
        status: string;
    }[];
    cities: {
        name: string;
        faction: string;
        foodStock: number;
    }[];
    armies: {
        faction: string;
        totalStrength: number;
    }[];
}) => Promise<string>;
export declare const getAIActionDescription: (faction: FactionId, action: string, target: string) => Promise<string>;
