/**
 * Detection Risk Service
 *
 * Calculates the probability of a clandestine leader being detected and caught
 * while operating in enemy territory.
 */
import { Location, Character, Army } from '../../../types';
import { ActiveClandestineAction } from '../../../types/clandestineTypes';
/**
 * Calculates the total probability (0.0 to 1.0) of a leader being caught
 * based on their active actions, location stats, and leader stats.
 */
export declare function calculateDetectionRisk(location: Location, activeActions: ActiveClandestineAction[], infiltratingLeader: Character, allArmies: Army[], governor?: Character, isCounterEspionageActive?: boolean): number;
