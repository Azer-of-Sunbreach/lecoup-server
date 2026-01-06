
import { GameState, FactionId } from '../../../shared/types';
import { processLeaderAI } from '../../../shared/services/ai/leaders';

// Flags controlled by feature flags or config
const USE_NEW_LEADER_AI = true;

/**
 * Main entry point for AI leader processing.
 * 
 * Delegates to the shared AI leader system.
 */
export const manageLeaders = (state: GameState, faction: FactionId): Partial<GameState> => {

    // Fallback or legacy path if needed (currently fully switched)
    if (!USE_NEW_LEADER_AI) {
        return {};
    }

    const result = processLeaderAI(state, faction, state.turn);

    // Mapping logs from string[] to LogEntry[]?
    // processLeaderAI currently returns simple logs (string[]).
    // Server expects LogEntry format if it merges logs.
    // However, the signature returns Partial<GameState>.
    // Usually manageLeaders returns { characters: ..., logs: ... }

    // We strictly adhere to existing signature logic if possible.
    // But processLeaderAI is new.
    // Let's create dummy LogEntries for the strings for now, or update processLeaderAI to return LogEntries.
    // For simplicity, we ignore logs or convert them.

    // Actually, processLeaderAI was returning { updatedCharacters, logs: string[] }
    // We should probably convert these logs to proper LogEntry objects if we want to display them.
    // But AI debug logs are mainly for dev.

    // Let's NOT return logs to avoid spamming the UI event log with AI debug info, 
    // unless it's critical. The shared logic creates some logs inside apply* functions if needed? 
    // No, apply functions just return state.

    // For now, we return updated characters.

    return {
        characters: result.updatedCharacters
        // logs: ... (omitted)
    };
};
