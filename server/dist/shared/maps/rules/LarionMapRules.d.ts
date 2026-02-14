import { BaseMapRules } from './BaseMapRules';
import { GameState, Location, Army, Character, Road } from '../../types';
export declare class LarionMapRules extends BaseMapRules {
    getInitialCharacters(): any[];
    calculateEconomy(state: GameState, locations: Location[], armies: Army[], characters: Character[], roads: Road[]): Location[];
}
