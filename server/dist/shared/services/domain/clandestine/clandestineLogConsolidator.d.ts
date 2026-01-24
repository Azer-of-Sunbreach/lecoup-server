import { LogEntry } from '../../../types';
/**
 * Interface for logs stored in the buffer before consolidation
 */
export interface BufferedLog {
    log: LogEntry;
    actionId: string;
    isCritical: boolean;
}
/**
 * Consolidates buffered clandestine logs based on priority rules.
 *
 * Rules:
 * A) Critical Logs (Grand Insurrection, Neutral Insurrection, Assassination Attempts) are ALWAYS shown.
 * B) If NO critical logs exist for a (Location, Faction) pair, show ONLY the highest priority non-critical log.
 *
 * @param logBuffer Map<LocationId, Map<ActorFactionId, BufferedLog[]>>
 * @returns Array of final LogEntry objects to emit
 */
export declare const consolidateClandestineLogs: (logBuffer: Map<string, Map<string, BufferedLog[]>>) => LogEntry[];
