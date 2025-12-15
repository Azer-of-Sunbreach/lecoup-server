import { Army, CombatState, FactionId, Road, Location } from '../../types';
/**
 * Get the name of the combat location for logging purposes
 */
export declare const getLocationName: (combat: CombatState, locations: Location[], roads: Road[]) => string;
/**
 * Get all armies of a faction at the combat location
 */
export declare const getArmiesAtCombatLocation: (faction: FactionId, armies: Army[], combat: CombatState) => Army[];
/**
 * Create a retreat position calculator bound to current state
 */
export declare const calculateRetreatPosition: (army: Army, roads: Road[], locations: Location[]) => Partial<Army>;
/**
 * Create an army positioned at the combat location (for retreat calculation)
 * The army's stored locationId may be stale, so we use combat position
 */
export declare const getArmyAtCombatPosition: (army: Army, combat: CombatState) => Army;
/**
 * Get fallback retreat position if calculated position is invalid
 */
export declare const getFallbackRetreatPosition: (army: Army, combat: CombatState) => Partial<Army>;
/**
 * Check if a retreat position is valid (has location data)
 */
export declare const isValidRetreatPosition: (retreatPos: Partial<Army>) => boolean;
