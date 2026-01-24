/**
 * Clandestine Agent Processor
 *
 * Handles AI decision-making for UNDERCOVER agents.
 * Migrated from Application to shared for multiplayer consistency.
 *
 * @module shared/services/ai/leaders/core
 */
import { Character, Location, Army, FactionId, Road } from '../../../../types';
export interface ClandestineResult {
    character: Character;
    logs: string[];
}
/**
 * Process an UNDERCOVER agent's clandestine operations.
 *
 * This function determines what actions an undercover agent should take,
 * manages their budget, and handles special cases like PARANOID governors
 * and LEGENDARY enemies.
 *
 * @param leader The undercover agent
 * @param locations All locations in the game
 * @param armies All armies in the game
 * @param turn Current turn number
 * @param actorFaction The faction the agent belongs to
 * @param logs Array to append log messages to
 * @param allCharacters List of all characters (for context)
 * @param roads List of all roads (for exfiltration pathfinding)
 * @returns Updated character and logs
 */
export declare function processClandestineAgent(leader: Character, locations: Location[], armies: Army[], turn: number, actorFaction: FactionId, logs: string[], allCharacters?: Character[], roads?: Road[]): ClandestineResult;
