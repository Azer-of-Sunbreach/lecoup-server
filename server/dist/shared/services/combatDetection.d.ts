import { CombatState, Army, Location, Road } from '../types';
export declare const detectBattles: (locations: Location[], armies: Army[], roads: Road[]) => CombatState[];
