import { GameState, FactionId } from '../../../shared/types';
/**
 * Main entry point for AI leader processing.
 *
 * Delegates to the shared AI leader system.
 */
export declare const manageLeaders: (state: GameState, faction: FactionId) => Partial<GameState>;
