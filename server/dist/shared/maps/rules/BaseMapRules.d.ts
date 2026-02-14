import { MapRules } from '../types';
import { GameState, Location, Army, Character, Road } from '../../types';
export declare class BaseMapRules implements MapRules {
    getInitialCharacters(): any[];
    calculateEconomy(state: GameState, locations: Location[], armies: Army[], characters: Character[], roads: Road[]): Location[];
}
