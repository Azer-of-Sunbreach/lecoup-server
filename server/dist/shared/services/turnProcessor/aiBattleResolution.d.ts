import { GameState, FactionId, CombatState } from '../../types';
import { AIBattleResolutionResult } from './types';
/**
 * Resolve all AI vs AI battles for the current turn.
 *
 * This function loops to handle cascading battles (e.g., winner fights next invader).
 * It filters out player battles and sieging battles.
 *
 * @param state - Current game state
 * @param existingInsurrectionNotification - Existing notification from earlier in the turn
 * @returns Updated game state elements and logs
 */
export declare function resolveAIBattles(state: GameState, existingInsurrectionNotification: any): AIBattleResolutionResult;
/**
 * Get player-relevant battles from the current state.
 * Used to determine if player needs to make combat decisions.
 *
 * @param battles - All detected battles
 * @param playerFaction - The player's faction
 * @returns Battles where player is attacker or defender
 */
export declare function getPlayerBattles(battles: CombatState[], playerFaction: FactionId): CombatState[];
