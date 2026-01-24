/**
 * Clandestine Processor - Main orchestrator for clandestine action processing
 *
 * Processes all active clandestine actions for all leaders at turn start:
 * 1. Deducts action costs from leader budgets
 * 2. Applies action effects (stability reduction, etc.)
 * 3. Auto-disables actions when conditions fail
 * 4. Generates warning logs for defenders
 *
 * Called from turnProcessor.ts during turn processing.
 *
 * @see ./insurrectionFormulas.ts - Centralized formulas for insurgent estimation
 */
import { Character, Location, LogEntry, FactionId, Army } from '../../../types';
/**
 * Result of processing clandestine actions
 */
export interface ClandestineProcessingResult {
    characters: Character[];
    locations: Location[];
    logs: LogEntry[];
    resourceUpdates: Record<FactionId, number>;
    newArmies?: Army[];
    armies?: Army[];
}
/**
 * Process all active clandestine actions.
 */
export declare function processClandestineActions(characters: Character[], locations: Location[], armies: Army[], turn: number): ClandestineProcessingResult;
