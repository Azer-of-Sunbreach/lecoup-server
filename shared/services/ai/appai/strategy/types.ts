// AI Strategy Types - Interfaces and constants for strategic operations

import { GameState, FactionId, Location, AIMission } from '../../../../types';
import { AITheater, FactionPersonality } from '../types';

/**
 * Vital cities that require prioritized defense
 */
export const VITAL_CITIES = ['sunbreach', 'windward', 'port_de_sable', 'stormbay', 'karamos', 'hornvale'];

/**
 * Strategic locations per faction - critical defensive points
 */
export const STRATEGIC_LOCATIONS: Record<FactionId, string[]> = {
    [FactionId.REPUBLICANS]: ['sunbreach', 'sunbreach_lands'],
    [FactionId.CONSPIRATORS]: ['stormbay', 'order_lands', 'great_plains', 'windward'],
    [FactionId.NOBLES]: ['port_de_sable', 'northern_barony'],
    [FactionId.NEUTRAL]: [],
    [FactionId.LOYALISTS]: [],
    [FactionId.PRINCELY_ARMY]: [],
    [FactionId.CONFEDERATE_CITIES]: [],
    [FactionId.LARION_KNIGHTS]: [],
    [FactionId.THYRAKAT_SULTANATE]: [],
    [FactionId.LINEAGES_COUNCIL]: [],
    [FactionId.OATH_COALITION]: [],
    [FactionId.LARION_EXPEDITION]: []
};

/**
 * Faction-specific priority targets for insurrections
 */
export const INSURRECTION_PRIORITIES: Record<FactionId, string[]> = {
    [FactionId.NOBLES]: ['sunbreach_lands', 'hornvale_viscounty', 'sunbreach'],
    [FactionId.CONSPIRATORS]: ['sunbreach_lands', 'northern_barony', 'thane_duchy'],
    [FactionId.REPUBLICANS]: ['northern_barony', 'esmarch_duchy', 'larion_islands'],
    [FactionId.NEUTRAL]: [],
    [FactionId.LOYALISTS]: [],
    [FactionId.PRINCELY_ARMY]: [],
    [FactionId.CONFEDERATE_CITIES]: [],
    [FactionId.LARION_KNIGHTS]: [],
    [FactionId.THYRAKAT_SULTANATE]: [],
    [FactionId.LINEAGES_COUNCIL]: [],
    [FactionId.OATH_COALITION]: [],
    [FactionId.LARION_EXPEDITION]: []
};

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
