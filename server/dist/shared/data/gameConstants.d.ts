/**
 * Game Constants - Pure numerical/static values that define game mechanics
 * These values should not change during gameplay and are derived from specifications
 */
export declare const DEBUG_AI = false;
export declare const DEBUG_COMBAT = false;
export declare const BONUS_HUNTING_ONLY = 6;
export declare const BONUS_FISHING_HUNTING = 10;
export declare const RECRUIT_COST = 50;
export declare const RECRUIT_AMOUNT = 500;
export declare const MAX_RECRUITS_PER_TURN = 4;
export declare const COST_INCITE = 100;
export declare const INCITE_BASE_STABILITY_DAMAGE = 10;
export declare const INCITE_BASE_CHANCE = 0.7;
export declare const REQUISITION_AMOUNT = 50;
export declare const REQUISITION_STABILITY_PENALTY = 15;
export declare const FOOD_PER_SOLDIER = 0.001;
export declare const PORT_SEQUENCE: string[];
export declare const NAVAL_TRAVEL_TIMES: Record<string, Record<string, number>>;
export declare const getNavalTravelTime: (from: string, to: string) => number;
export declare const NAVAL_STAGE_DAYS = 2;
export interface FortificationLevel {
    name: string;
    legend: string;
    bonus: number;
    cost: number;
    manpower: number;
    time: number;
}
export declare const FORTIFICATION_LEVELS: Record<number, FortificationLevel>;
export declare const INITIAL_PLAYER_RESOURCES: {
    REPUBLICANS: number;
    CONSPIRATORS: number;
    NOBLES: number;
};
export declare const INITIAL_AI_RESOURCES: {
    REPUBLICANS: number;
    CONSPIRATORS: number;
    NOBLES: number;
};
export declare const FORTIFY_COST = 40;
export declare const FORTIFY_DEFENSE_BONUS = 20;
export declare const APPEASE_POPULATION_COSTS: Record<string, number>;
export declare const getAppeaseFoodCost: (population: number) => number;
