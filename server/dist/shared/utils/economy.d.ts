import { Location, Army, Character } from '../types';
import { GameState } from '../types';
export declare const calculateEconomyAndFood: (state: GameState, locs: Location[], armies: Army[], chars: Character[], roads: any[]) => Location[];
