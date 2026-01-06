import { GameState, FactionId, Location } from '../../../types';
import { FactionPersonality } from '../types';
export interface EmbargoResult {
    locations: Location[];
    logs: string[];
    grainTradeNotification?: GameState['grainTradeNotification'];
}
/**
 * Handle grain embargo logic for Windward.
 *
 * FACTION-SPECIFIC RULES:
 *
 * - REPUBLICANS: NEVER apply embargo, even if they control Windward and Great Plains.
 *
 * - CONSPIRATORS: Can apply embargo if:
 *   - Control both Windward and Great Plains
 *   - Count Rivenberg is alive (for political cover)
 *   - Embargo chance increases each turn (10% + 10%/turn, max 80%)
 *   - Windward stability > 60
 *
 * - NOBLES: Can apply embargo if:
 *   - Control both Windward and Great Plains
 *   - Baron Lekal AND/OR Sir Haraldic are alive
 *   - Embargo is economically advantageous:
 *     (Food Production > Food Consumption + (10 * number of controlled cities))
 *
 * @param state - Current game state
 * @param faction - Faction to process
 * @param profile - Faction personality
 * @param locations - Locations array (modified in place)
 * @returns Embargo result with logs and notification
 */
export declare function handleGrainEmbargo(state: GameState, faction: FactionId, profile: FactionPersonality, locations: Location[]): EmbargoResult;
