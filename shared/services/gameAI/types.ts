
import { FactionId, Location, Army } from '../../types';

export interface AITheater {
    id: number;
    locationIds: string[]; // Owned locations
    borderLocationIds: string[]; // Adjacent enemy/neutral locations
    internalRoadIds: string[]; // Roads connecting owned locations
    threatLevel: number; // Enemy strength on borders
    armyStrength: number; // Friendly strength
    isContested: boolean; // Are there enemies INSIDE the territory (e.g. roads)?
}

export type AIGoalType =
    | 'CONQUER_CITY'
    | 'CONQUER_RURAL'
    | 'DEFEND_VITAL'
    | 'CONNECT_THEATERS'
    | 'INSURRECTION'
    | 'STABILIZE'
    | 'STOCKPILE_FOOD';

export interface AIGoal {
    id: string;
    type: AIGoalType;
    targetId: string; // Location ID
    priority: number; // 1-100
    assignedArmyIds: string[];
    budgetReserved: number;
}

export interface AIBudget {
    total: number;
    reserved: number; // Emergency funds / Saving for big actions
    available: number; // Spendable this turn
    allocations: {
        recruitment: number;
        fortification: number;
        diplomacy: number; // Insurrections/Negotiations
        logistics: number; // Convoys costs (if any in future)
        siege: number;
    };
}

export interface FactionPersonality {
    name: string;
    aggressiveness: number; // 0-1
    defensiveness: number; // 0-1
    subversiveness: number; // 0-1 (Insurrections)
    expansionism: number; // 0-1 (Neutrals)
    riskTolerance: number; // 0-1 (Leader usage)
    preferredTargets: string[]; // IDs of priority cities
    canUseGrainEmbargo: boolean;
    useFortifications: boolean;
}
