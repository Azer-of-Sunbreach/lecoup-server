import { GameState, FactionId } from '../../../shared/types';
import { AIGoal, AIBudget, FactionPersonality } from './types';
export declare const manageDiplomacy: (state: GameState, faction: FactionId, goals: AIGoal[], // Deprecated in favor of missions
profile: FactionPersonality, budget: AIBudget, disableInsurrections?: boolean) => Partial<GameState>;
