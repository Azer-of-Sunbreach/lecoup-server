import { GameState } from '../../types';
import { NegotiationProcessingResult } from './types';
/**
 * Process pending negotiations with neutral territories.
 *
 * Negotiations succeed if: stability + (goldOffer / 5) + foodOffer > 60
 *
 * On success:
 * - Territory joins the negotiating faction
 * - Stability is set to the score (capped at 100)
 * - Neutral troops become faction troops (capped at 1000)
 * - If city, food offer is added to stock
 *
 * On failure:
 * - Territory remains neutral
 * - Invested resources are lost
 *
 * @param state - Current game state
 * @returns Updated locations, armies, pending negotiations and logs
 */
export declare function processNegotiations(state: GameState): NegotiationProcessingResult;
