/**
 * Clandestine Role - AI decision logic for undercover agents
 *
 * Handles action selection for clandestine agents based on:
 * - Current risk level and faction thresholds
 * - GRAND_INSURRECTION opportunities
 * - Budget constraints
 * - Leader traits (SCORCHED_EARTH, FAINT_HEARTED, FIREBRAND)
 *
 * @module shared/services/ai/leaders/roles
 */
import { Character, Location, FactionId, Army } from '../../../../types';
import { ClandestineDecision, FactionStrategy, ClandestineOpportunity } from '../types';
/**
 * Generate clandestine decisions for an undercover agent.
 */
export declare function makeClandestineDecisions(leader: Character, location: Location, faction: FactionId, strategy: FactionStrategy, budget: number, turn: number, armies: Army[], characters: Character[], opportunity?: ClandestineOpportunity): ClandestineDecision;
/**
 * Evaluate a location as a GRAND_INSURRECTION target.
 */
export declare function evaluateClandestineOpportunity(location: Location, leader: Character, armies: Army[], characters: Character[], faction: FactionId): ClandestineOpportunity;
