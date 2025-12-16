import { GameState, FactionId, Army, Road, Character } from '../../types';
export declare const getArmyStrength: (armies: Army[], characters: Character[]) => number;
export declare const getDistance: (startId: string, endId: string, roads: Road[]) => number;
export declare const findSafePath: (startId: string, endId: string, state: GameState, faction: FactionId) => string[] | null;
