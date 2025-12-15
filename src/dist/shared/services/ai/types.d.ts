export interface AITheater {
    id: number;
    locationIds: string[];
    borderLocationIds: string[];
    internalRoadIds: string[];
    threatLevel: number;
    armyStrength: number;
    isContested: boolean;
}
export type AIGoalType = 'CONQUER_CITY' | 'CONQUER_RURAL' | 'DEFEND_VITAL' | 'CONNECT_THEATERS' | 'INSURRECTION' | 'STABILIZE' | 'STOCKPILE_FOOD';
export interface AIGoal {
    id: string;
    type: AIGoalType;
    targetId: string;
    priority: number;
    assignedArmyIds: string[];
    budgetReserved: number;
}
export interface AIBudget {
    total: number;
    reserved: number;
    available: number;
    allocations: {
        recruitment: number;
        fortification: number;
        diplomacy: number;
        logistics: number;
        siege: number;
    };
}
export interface FactionPersonality {
    name: string;
    aggressiveness: number;
    defensiveness: number;
    subversiveness: number;
    expansionism: number;
    riskTolerance: number;
    preferredTargets: string[];
    canUseGrainEmbargo: boolean;
    useFortifications: boolean;
}
