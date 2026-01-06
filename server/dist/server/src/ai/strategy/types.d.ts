import { GameState, FactionId, AIMission } from '../../../../shared/types';
import { AITheater, FactionPersonality } from '../types';
/**
 * Vital cities that require prioritized defense
 */
export declare const VITAL_CITIES: string[];
/**
 * Strategic locations per faction - critical defensive points
 */
export declare const STRATEGIC_LOCATIONS: Record<FactionId, string[]>;
/**
 * Faction-specific priority targets for insurrections
 */
export declare const INSURRECTION_PRIORITIES: Record<FactionId, string[]>;
/**
 * Context for mission generation
 */
export interface MissionContext {
    state: GameState;
    faction: FactionId;
    theaters: AITheater[];
    profile: FactionPersonality;
    activeMissions: AIMission[];
}
