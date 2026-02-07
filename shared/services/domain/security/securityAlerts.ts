/**
 * Security Alerts Service
 * 
 * Analyzes game state (logs, locations, stability) to generate alerts for the player
 * regarding enemy activities in their territory.
 * 
 * Focuses on:
 * 1. Insurrections (Grand, Neutral, Low Stability)
 * 2. Clandestine Activities (Infiltration, Sabotage, Departures)
 */

import {
    LogEntry,
    Location,
    FactionId,
    LogType,
    GameState,
    Character
} from '../../../types';
import { estimateGrandInsurgents, estimateNeutralInsurgents, AI_ESTIMATION_DEFAULTS } from '../clandestine/insurrectionFormulas';

// ============================================================================
// TYPES
// ============================================================================

export interface InsurrectionAlert {
    type: 'GRAND_INSURRECTION' | 'NEUTRAL_INSURRECTION' | 'LOW_STABILITY';
    location: Location;
    turnExpected: string; // "Tour X", "Next Turn", "Ongoing"
    messageKey: string;
    messageParams?: Record<string, any>;
    priority: number; // 1 = Grand, 2 = Neutral, 3 = Stability
}

export interface OtherAlert {
    type: 'INFILTRATION' | 'DEPARTURE' | 'SABOTAGE' | 'ELIMINATED' | 'SIEGE' | 'OTHER';
    location: Location;
    messageKey: string;
    messageParams?: Record<string, any>;
    stability: number;
    governorId?: string; // If a governor is present
    isSuccess?: boolean; // Display in Green (Resolution events)
}

export interface SecurityAlertsData {
    insurrections: InsurrectionAlert[];
    otherAlerts: OtherAlert[];
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Check if a location is controlled by the player
 */
const isPlayerTerritory = (location: Location, playerFaction: FactionId): boolean => {
    return location.faction === playerFaction;
};

/**
 * find leader by id
 */
const getLeader = (leaderId: string, characters: Character[]): Character | undefined => {
    return characters.find(c => c.id === leaderId);
};

/**
 * Find governor ID for a location
 */
const getGovernorId = (locationId: string, characters: Character[]): string | undefined => {
    return characters.find(c =>
        c.status === 'GOVERNING' &&
        c.locationId === locationId
    )?.id;
};


/**
 * Extract location from log highlight target
 */
const getLocationFromLog = (log: LogEntry, locations: Location[]): Location | undefined => {
    if (log.highlightTarget?.type === 'LOCATION') {
        return locations.find(l => l.id === log.highlightTarget!.id);
    }
    return undefined;
};

// ============================================================================
// CORE LOGIC
// ============================================================================

/**
 * Build security alerts for the current turn
 */
export const buildSecurityAlerts = (
    gameState: GameState,
    currentTurn: number,
    explicitSiegeNotification?: any // Optional: Pass explicit notification to bypass potential state mismatches
): SecurityAlertsData => {
    const { logs, locations, characters, playerFaction } = gameState;

    // Use explicit notification if provided, otherwise fallback to state
    const siegeNotification = explicitSiegeNotification || gameState.siegeNotification;

    const insurrections: InsurrectionAlert[] = [];
    const otherAlerts: OtherAlert[] = [];

    // Filter logs for THIS turn only
    const turnLogs = logs.filter(log => log.turn === currentTurn);

    // Track which locations have active insurrection events to avoid duplicates
    // e.g. Don't show "Preparing" if "Uprising" also happened this turn
    const activeInsurrectionLocIds = new Set<string>();

    // 0. Pre-Scan: Identify Resolved Leaders (Captured/Eliminated/Escaped)
    // If a leader is resolved attempts to do other things (insurrections) should be suppressed
    const resolvedLeaderIds = new Set<string>();

    try {
        turnLogs.forEach(log => {
            if (['infiltrationEliminated', 'clandestineExecutionController', 'clandestineEscapeController'].includes(log.i18nKey || '')) {
                if (log.i18nParams?.leader) {
                    resolvedLeaderIds.add(log.i18nParams.leader as string);
                }
            }
        });

        // 1. Scan Logs for Events
        turnLogs.forEach(log => {

            // --- INSURRECTIONS ---
            if (log.type === LogType.INSURRECTION) {

                // Grand Insurrection Preparation
                // Key: "insurrectionPreparing"
                if (log.i18nKey === 'insurrectionPreparing') {
                    const leaderId = log.i18nParams?.leader;
                    // SKIP if leader was resolved (captured/killed) this turn
                    if (leaderId && resolvedLeaderIds.has(leaderId)) return;

                    const loc = getLocationFromLog(log, locations);
                    if (loc && isPlayerTerritory(loc, playerFaction)) {
                        // Start + 4 turns (Preparation Phase)
                        // Note: User reported "Tour 6" when it should be "Tour 5" at turn 1.
                        // This implies log.turn might be ahead or display logic adds 1.
                        // Adjusted to +3 based on feedback to align with expected game flow.
                        const expectedTurn = log.turn + 3;

                        // Determine gender context for translations (e.g. "join her" vs "join him")
                        const FEMALE_LEADER_IDS = ['alia', 'ethell', 'jadis'];
                        const genderContext = (leaderId && FEMALE_LEADER_IDS.includes(leaderId)) ? 'female' : 'male';

                        insurrections.push({
                            type: 'GRAND_INSURRECTION',
                            location: loc,
                            turnExpected: `Tour ${expectedTurn}`, // Will be translated in UI
                            messageKey: 'securityAlerts:grandInsurrectionWarning',
                            messageParams: {
                                ...log.i18nParams,
                                context: genderContext,
                                count: log.i18nParams?.count || (() => {
                                    // Fallback for legacy logs: Estimate count
                                    const leader = leaderId ? getLeader(leaderId, characters) : undefined;
                                    const resentmentVsController = (loc.resentment as Record<string, number>)?.[loc.faction] || 0;
                                    const resentmentVsInstigator = (loc.resentment as Record<string, number>)?.[leader?.faction || ''] || 0;

                                    return estimateGrandInsurgents(
                                        400, // Assume default gold if unknown (logs don't store it)
                                        loc.population,
                                        loc.stability,
                                        leader?.stats.clandestineOps || AI_ESTIMATION_DEFAULTS.CLANDESTINE_OPS,
                                        resentmentVsController,
                                        resentmentVsInstigator,
                                        leader?.stats.ability?.includes('FIREBRAND') || false
                                    );
                                })()
                            },
                            priority: 1
                        });
                        activeInsurrectionLocIds.add(loc.id);
                    }
                }

                // Neutral Insurrection Warning
                // Key: "neutralInsurrectionWarning"
                if (log.i18nKey === 'neutralInsurrectionWarning') {
                    const loc = getLocationFromLog(log, locations);
                    if (loc && isPlayerTerritory(loc, playerFaction)) {
                        insurrections.push({
                            type: 'NEUTRAL_INSURRECTION',
                            location: loc,
                            turnExpected: 'securityAlerts:nextTurn', // "Prochain tour"
                            messageKey: 'securityAlerts:neutralInsurrectionWarning',
                            messageParams: {
                                ...log.i18nParams,
                                count: log.i18nParams?.count || (() => {
                                    // Fallback for legacy logs
                                    const resentment = (loc.resentment as Record<string, number>)?.[loc.faction] || 0;
                                    return estimateNeutralInsurgents(
                                        loc.population,
                                        AI_ESTIMATION_DEFAULTS.CLANDESTINE_OPS, // Unknown leader, assume average
                                        resentment,
                                        loc.stability,
                                        loc.type === 'CITY'
                                    );
                                })()
                            },
                            priority: 2
                        });
                        activeInsurrectionLocIds.add(loc.id);
                    }
                }
            }

            // --- OTHER ALERTS (Clandestine / Leader / Log based) ---
            const isVisible = log.visibleToFactions.length === 0 || log.visibleToFactions.includes(playerFaction);

            if (isVisible) {
                const loc = getLocationFromLog(log, locations);
                const leaderId = log.i18nParams?.leader;

                // Check if this leader has been resolved (captured/eliminated/escaped) this turn
                const isResolved = leaderId && resolvedLeaderIds.has(leaderId);

                // 1. Success/Resolution Events (Always show, usually Green)
                if (['infiltrationEliminated', 'clandestineExecutionController', 'clandestineEscapeController'].includes(log.i18nKey || '')) {
                    if (loc) {
                        otherAlerts.push({
                            type: 'ELIMINATED', // Or generic 'RESOLUTION'
                            location: loc,
                            messageKey: `logs:${log.i18nKey}`,
                            messageParams: log.i18nParams,
                            stability: loc.stability,
                            governorId: getGovernorId(loc.id, characters),
                            isSuccess: true // New flag for Green styling
                        });
                    }
                    return; // Done with this log
                }

                // 2. Active Threat Events (Skip if leader is resolved)
                if (isResolved) return;

                // Infiltration Detected
                if (log.i18nKey === 'infiltrationDetectedOwner') {
                    if (loc) {
                        otherAlerts.push({
                            type: 'INFILTRATION',
                            location: loc,
                            messageKey: `logs:${log.i18nKey}`,
                            messageParams: log.i18nParams,
                            stability: loc.stability,
                            governorId: getGovernorId(loc.id, characters)
                        });
                    }
                }

                // Leader Departure
                if (log.i18nKey === 'leaderDepartureSpotted') {
                    if (loc) {
                        otherAlerts.push({
                            type: 'DEPARTURE',
                            location: loc,
                            messageKey: `logs:${log.i18nKey}`,
                            messageParams: log.i18nParams,
                            stability: loc.stability,
                            governorId: getGovernorId(loc.id, characters)
                        });
                    }
                }

                // Sabotage Warning
                if (log.i18nKey === 'clandestineSabotageWarning') {
                    if (loc) {
                        otherAlerts.push({
                            type: 'SABOTAGE',
                            location: loc,
                            messageKey: `logs:${log.i18nKey}`,
                            messageParams: log.i18nParams,
                            stability: loc.stability,
                            governorId: getGovernorId(loc.id, characters)
                        });
                    }
                }
            }
        });

        // 2. Scan for Low Stability (< 50%)
        locations.forEach(loc => {
            if (
                isPlayerTerritory(loc, playerFaction) &&
                loc.stability < 50 &&
                !activeInsurrectionLocIds.has(loc.id) // Avoid double alerting if already in insurrection
            ) {
                insurrections.push({
                    type: 'LOW_STABILITY',
                    location: loc,
                    turnExpected: 'securityAlerts:unknown', // "Inconnu"
                    messageKey: 'securityAlerts:lowStabilityWarning',
                    messageParams: { location: loc.id },
                    priority: 3
                });
            }
        });

        // 3. Check for Siege Notification (Reverted to Original Logic)
        // 3. Check for Siege Notification (Reverted to Original Logic)
        if (siegeNotification) {
            console.log('[DEBUG_SIEGE] securityAlerts: Checking Siege Notification', siegeNotification);
            // Find the location being sieged using ID
            const siegedLoc = locations.find(l => l.id === siegeNotification!.targetId);

            const isPlayer = siegedLoc ? isPlayerTerritory(siegedLoc, playerFaction) : false;
            console.log(`[DEBUG_SIEGE] securityAlerts: Loc found? ${!!siegedLoc}, isPlayer? ${isPlayer}`, siegedLoc?.id, playerFaction);

            if (siegedLoc && isPlayerTerritory(siegedLoc, playerFaction)) {

                // Deduplicate
                const alreadyExists = otherAlerts.some(a => a.type === 'SIEGE' && a.location.id === siegedLoc.id);
                if (!alreadyExists) {
                    // Determine remaining fortification text key
                    let remainingKey = 'securityAlerts:siegeRemaining.nothing';
                    if (siegedLoc.fortificationLevel >= 3) {
                        remainingKey = 'securityAlerts:siegeRemaining.cityWalls';
                    } else if (siegedLoc.fortificationLevel === 2) {
                        remainingKey = 'securityAlerts:siegeRemaining.stoneTowers';
                    } else if (siegedLoc.fortificationLevel === 1) {
                        remainingKey = 'securityAlerts:siegeRemaining.pikesAndTrenches';
                    }

                    otherAlerts.push({
                        type: 'SIEGE',
                        location: siegedLoc,
                        messageKey: 'securityAlerts:siegeAlert',
                        messageParams: {
                            attacker: siegeNotification!.attackerName,
                            remainingKey
                        },
                        stability: siegedLoc.stability,
                        governorId: getGovernorId(siegedLoc.id, characters)
                    });
                }
            }
        } else {
            console.log('[DEBUG_SIEGE] Step 3: Skipped (No Siege Notification)');
        }

    } catch (error) {
        console.error('[DEBUG_SIEGE] CRASH in buildSecurityAlerts (Fatal):', error);
    }

    // 4. Post-Processing: Sort Insurrections by Priority
    insurrections.sort((a, b) => a.priority - b.priority);

    return {
        insurrections,
        otherAlerts
    };
};
