
import { ClandestineActionId } from '../../../types/clandestineTypes';
import { LogEntry, LogSeverity, LogType } from '../../../types';

/**
 * Interface for logs stored in the buffer before consolidation
 */
export interface BufferedLog {
    log: LogEntry;
    actionId: string;
    isCritical: boolean;
}

// Priority rank for non-critical filtering (Lower number = Higher Priority)
const ACTION_PRIORITY: Record<string, number> = {
    [ClandestineActionId.BURN_CROP_FIELDS]: 1,
    [ClandestineActionId.START_URBAN_FIRE]: 1,
    [ClandestineActionId.UNDERMINE_AUTHORITIES]: 2,
    [ClandestineActionId.DISTRIBUTE_PAMPHLETS]: 3,
    [ClandestineActionId.STEAL_FROM_GRANARIES]: 4,
    [ClandestineActionId.ATTACK_TAX_CONVOYS]: 5,
    // Default for others
    'DEFAULT': 10
};

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
export const consolidateClandestineLogs = (
    logBuffer: Map<string, Map<string, BufferedLog[]>>
): LogEntry[] => {
    const finalLogs: LogEntry[] = [];

    // Iterate over each Location
    for (const [locationId, factionMap] of logBuffer.entries()) {
        // Iterate over each Actor Faction within that location
        for (const [factionId, bufferedLogs] of factionMap.entries()) {

            // 1. Separate Critical vs Non-Critical
            const criticalLogs = bufferedLogs.filter(b => b.isCritical);
            const nonCriticalLogs = bufferedLogs.filter(b => !b.isCritical);

            // A) Always emit Critical Logs
            criticalLogs.forEach(b => finalLogs.push(b.log));

            // B) If critical logs exist, we DO NOT suppress other logs?
            // Spec: "Si des logs de catégorie CRITICAL n’ont pas été générés... un seul log non-CRITICAL sera généré."
            // Implies: If Critical Logs WERE generated, we do NOT generate non-critical logs?
            // "If critical logs have NOT been generated... ONE non-critical log will be generated."
            // This implies mutual exclusion. Criticals TRUMP normals. 
            // If Criticals exist -> Show Criticals. Ignore Normals.
            // If No Criticals -> Show 1 Normal.

            if (criticalLogs.length > 0) {
                continue; // Skip non-criticals
            }

            // C) If no Critical logs, pick ONE Priority log
            if (nonCriticalLogs.length > 0) {
                // Sort by Priority (Ascending)
                nonCriticalLogs.sort((a, b) => {
                    const pA = ACTION_PRIORITY[a.actionId] || ACTION_PRIORITY['DEFAULT'];
                    const pB = ACTION_PRIORITY[b.actionId] || ACTION_PRIORITY['DEFAULT'];
                    return pA - pB;
                });

                // Pick the first one
                finalLogs.push(nonCriticalLogs[0].log);
            }
        }
    }

    return finalLogs;
};
