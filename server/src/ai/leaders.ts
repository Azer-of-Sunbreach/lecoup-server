
import { GameState, FactionId, CharacterStatus, LocationType, Character, LogEntry } from '../../../shared/types';
import { getLeaderProfile, LeaderProfile, LeaderRole } from './leaders_config';
import { findSafePath } from './utils';
import { AITheater } from './types';

export const manageLeaders = (state: GameState, faction: FactionId): Partial<GameState> => {
    let characters = [...state.characters];
    let logs: LogEntry[] = [];

    const myLeaders = characters.filter(c => c.faction === faction && c.status === CharacterStatus.AVAILABLE);
    const activeMissions = state.aiState?.[faction]?.missions || [];

    for (const leader of myLeaders) {
        const profile = getLeaderProfile(leader.name, leader.id);
        if (!profile) continue; // Skip generic leaders if any, or implement default logic

        // DECISION PROCESS:
        // Try Primary Role -> Secondary -> Tertiary
        // Exceptional is only if situation is desperate (not implemented yet for simplicity)

        let actionTaken = false;

        // 0. EXFILTRATION CHECK: Is leader in enemy territory?
        if (leader.locationId) {
            const currentLoc = state.locations.find(l => l.id === leader.locationId);
            if (currentLoc && currentLoc.faction !== faction) {
                // TRAPPED! Find nearest friendly location to flee to.
                const friendlyLocs = state.locations.filter(l => l.faction === faction);
                // Sort by simple distance first to avoid pathfinding spam
                friendlyLocs.sort((a, b) => {
                    const distA = Math.hypot(a.position.x - currentLoc.position.x, a.position.y - currentLoc.position.y);
                    const distB = Math.hypot(b.position.x - currentLoc.position.x, b.position.y - currentLoc.position.y);
                    return distA - distB;
                });

                for (const safeLoc of friendlyLocs) {
                    // Try to move to the nearest safe haven
                    if (moveLeaderStart(leader, safeLoc.id, state, characters, logs, `escape to ${safeLoc.name}`)) {
                        actionTaken = true;
                        break;
                    }
                }
                if (actionTaken) continue; // Fleeing is the only priority
            }
        }

        // --- VIP EMERGENCY STABILITY CHECK (Advanced Logic - User Request) ---
        // 1. Commander Exception: Specific martial VIPs join offensive on linked location.
        // 2. Full Control: Own both -> Stabilize either if < 80.
        // 3. Partial Control: Own Current -> Stabilize current if < 80. (Ignore unowned linked).
        if (profile.isVIP && leader.locationId) {
            const currentLoc = state.locations.find(l => l.id === leader.locationId);

            if (currentLoc && currentLoc.faction === faction) {
                // Check Linked Location
                let linkedLoc: any = null;
                if (currentLoc.linkedLocationId) {
                    linkedLoc = state.locations.find(l => l.id === currentLoc.linkedLocationId);
                }

                // COMMANDER EXCEPTION
                const COMMANDER_VIPS = ['rivenberg', 'barrett', 'thane', 'azer', 'tordis'];
                // Check if this leader is a commander VIP
                // Note: profile.id might be undefined, fallback to name or check known names
                // We use name matches from config for safety
                // Map names to IDs roughly or just use exact names if IDs aren't set in config
                // Let's rely on leader.name or id. The config has IDs like 'rivenberg'.
                // If profile has ID, use it.
                const isCommanderVip = COMMANDER_VIPS.includes(profile.id || '') ||
                    COMMANDER_VIPS.some(id => profile.name.toLowerCase().includes(id));

                let skipStabilityCheck = false;
                if (isCommanderVip && linkedLoc && linkedLoc.faction !== faction) {
                    // Check for Active Campaign against Linked Location
                    const activeCampaign = state.aiState?.[faction]?.missions.some(m =>
                        m.type === 'CAMPAIGN' &&
                        m.targetId === linkedLoc.id &&
                        m.status === 'ACTIVE'
                    );

                    if (activeCampaign) {
                        // Fall through to normal logic (which prioritizes COMMANDER or similar)
                        // Actually, we should explicitely ensure they join? 
                        // Normal logic will likely pick COMMANDER if available. 
                        // So we just CONTINUE to normal logic.
                        skipStabilityCheck = true; // Don't do stability check, proceed to normal role evaluation
                    }
                }

                if (!skipStabilityCheck) {
                    let targetId: string | null = null;
                    const currentUnstable = currentLoc.stability < 80;

                    if (linkedLoc && linkedLoc.faction === faction) {
                        // FULL CONTROL (Own both)
                        const linkedUnstable = linkedLoc.stability < 80;
                        if (currentUnstable || linkedUnstable) {
                            // HYSTERESIS: Prevent oscillation by requiring significant difference to move
                            const BUFFER = 10;

                            if (leader.locationId === currentLoc.id) {
                                // We are at Current. Only move if Linked is significantly worse.
                                if (linkedLoc.stability < (currentLoc.stability - BUFFER)) {
                                    targetId = linkedLoc.id;
                                } else {
                                    targetId = currentLoc.id; // Stay
                                }
                            } else if (leader.locationId === linkedLoc.id) {
                                // We are at Linked. Only move if Current is significantly worse.
                                if (currentLoc.stability < (linkedLoc.stability - BUFFER)) {
                                    targetId = currentLoc.id;
                                } else {
                                    targetId = linkedLoc.id; // Stay
                                }
                            } else {
                                // Not at either. Move to the worst one.
                                targetId = (linkedLoc.stability < currentLoc.stability) ? linkedLoc.id : currentLoc.id;
                            }
                        }
                    } else {
                        // PARTIAL CONTROL (Own Current only, or Linked unowned)
                        // Stabilize Current ONLY
                        if (currentUnstable) {
                            targetId = currentLoc.id;
                        }
                        // Explicitly IGNORE linked if we don't own it (unless Commander Exception handled above)
                    }

                    if (targetId) {
                        // logs.push(`${leader.name} (VIP) overrides priorities to STABILIZE ${targetId} (Advanced Logic).`);
                        // Force STABILIZER role with explicit target
                        // Return value is boolean, if true we continue the outer loop
                        if (handleStabilizerRole(leader, state, faction, characters, logs, false, targetId)) {
                            continue; // Action taken, move to next leader
                        }
                    }
                }
            }
        }

        // Normal Priority Loop
        // Try Primary
        if (evaluateAndAssignRole(profile.priorities.primary, leader, state, faction, activeMissions, characters, logs)) {
            continue;
        }
        // Try Secondary
        if (evaluateAndAssignRole(profile.priorities.secondary, leader, state, faction, activeMissions, characters, logs)) {
            continue;
        }
        // Try Tertiary
        if (profile.priorities.tertiary) {
            if (evaluateAndAssignRole(profile.priorities.tertiary, leader, state, faction, activeMissions, characters, logs)) {
                continue;
            }
        }
    }

    return { characters, logs: state.logs.concat(logs) }; // Append logs correctly
};

// Helper to evaluate and execute a role
function evaluateAndAssignRole(
    role: LeaderRole,
    leader: Character,
    state: GameState,
    faction: FactionId,
    missions: any[],
    allCharacters: Character[],
    logs: LogEntry[]
): boolean {
    if (!leader.locationId) return false;

    switch (role) {
        case 'COMMANDER':
            return handleCommanderRole(leader, state, faction, missions, allCharacters, logs);
        case 'MANAGER':
            return handleManagerRole(leader, state, faction, allCharacters, logs);
        case 'STABILIZER':
            return handleStabilizerRole(leader, state, faction, allCharacters, logs);
        case 'PROTECTOR':
            // Protector logic similar to Stabilizer but prioritizes high pop/high threat
            return handleStabilizerRole(leader, state, faction, allCharacters, logs, true);
        case 'INSURRECTION':
            // Handled by Diplomacy usually, but here we can move them to position
            return false; // Not integrated yet in this file
        default:
            return false;
    }
}

function handleCommanderRole(
    leader: Character,
    state: GameState,
    faction: FactionId,
    missions: any[],
    allCharacters: Character[],
    logs: LogEntry[]
): boolean {
    // Look for ACTIVE or PLANNING missions needing a general
    // Prioritize attacking (CAMPAIGN) over defending (DEFEND) for Commanders
    const combatMissions = missions.filter(m => (m.type === 'CAMPAIGN' || m.type === 'DEFEND') && m.status !== 'COMPLETED');

    for (const mission of combatMissions) {
        // Is there an army assigned to this mission that needs a leader?
        // OR is the mission in gathering stage and needs a leader at staging point?

        let targetLocationId: string | null = null;

        if (mission.stage === 'GATHERING' && mission.data?.stagingId) {
            targetLocationId = mission.data.stagingId;
        } else {
            // Check armies assigned to mission
            // We need to find if any army assigned to this mission is leaderless AND reachable
            // This requires linking armies to missions more explicitly or inferring.
            // For now, let's look at the Target of the mission.
            targetLocationId = mission.targetId;
        }

        if (!targetLocationId) continue;

        // Check reachability
        const path = findSafePath(leader.locationId!, targetLocationId, state, faction);
        if (!path) continue; // Cannot reach

        // Is there a significant army there (or en route) without a leader?
        const armyWithoutLeader = state.armies.find(a =>
            a.faction === faction &&
            !allCharacters.some(c => c.armyId === a.id) &&
            (a.locationId === targetLocationId || (a.destinationId === targetLocationId)) &&
            a.strength > 1000
        );

        if (armyWithoutLeader) {
            // ASSIGN
            // If at same location, join instantly.
            if (leader.locationId === armyWithoutLeader.locationId) {
                const idx = allCharacters.findIndex(c => c.id === leader.id);
                if (idx !== -1) {
                    allCharacters[idx] = { ...leader, armyId: armyWithoutLeader.id, status: CharacterStatus.AVAILABLE }; // Occupied?
                    // AI leader action log removed - AI actions don't generate logs
                    return true;
                }
            } else {
                // Move towards it
                return moveLeaderStart(leader, targetLocationId, state, allCharacters, logs, `commands an army in ${targetLocationId}`);
            }
        }
    }
    return false;
}

function handleManagerRole(
    leader: Character,
    state: GameState,
    faction: FactionId,
    allCharacters: Character[],
    logs: LogEntry[]
): boolean {
    if (leader.stats.ability.includes('MANAGER')) {
        // Find best city (Income) without manager
        const myCities = state.locations
            .filter(l => l.faction === faction && l.type === 'CITY' && !hasManager(l.id, allCharacters, faction))
            .sort((a, b) => b.goldIncome - a.goldIncome);

        for (const city of myCities) {
            const path = findSafePath(leader.locationId!, city.id, state, faction);
            if (path) {
                if (leader.locationId === city.id) {
                    return true; // Already there, doing job
                }
                return moveLeaderStart(leader, city.id, state, allCharacters, logs, `manage ${city.name}`);
            }
        }
    }
    return false;
}

function handleStabilizerRole(
    leader: Character,
    state: GameState,
    faction: FactionId,
    allCharacters: Character[],
    logs: LogEntry[],
    isProtector: boolean = false,
    explicitTargetId: string | null = null
): boolean {
    // 0. EXPLICIT OVERRIDE (For VIPs)
    if (explicitTargetId) {
        // Direct Action
        // Check if already there
        if (leader.locationId === explicitTargetId) {
            return true; // Stay and stabilize
        }
        // Move there
        const path = findSafePath(leader.locationId!, explicitTargetId, state, faction);
        if (path && path.length <= 3) {
            return moveLeaderStart(leader, explicitTargetId, state, allCharacters, logs, `stabilize (Emergency) ${explicitTargetId}`);
        }
        // If blocked, fall through to standard logic? No, override should be strict.
        // If we can't reach home, maybe we do nothing or standard logic.
        return false;
    }

    // OLD AD-HOC LOGIC REPLACED BY MISSION LOGIC
    // We search for assigned STABILIZE missions or available unassigned ones.

    const missions = state.aiState?.[faction]?.missions || [];

    // 1. Is leader already assigned to a STABILIZE mission?
    // (We don't explicitly link leader ID to mission in mission struct yet, but we can check if he is moving to one)
    // Actually, persistence is key.

    // Find highest priority STABILIZE mission
    const stabilizeMissions = missions
        .filter(m => m.type === 'STABILIZE' && m.status !== 'COMPLETED')
        .sort((a, b) => b.priority - a.priority);

    for (const mission of stabilizeMissions) {
        const { targetId } = mission;

        // Check if someone else is already there acting as stabilizer?
        // We allow 2 stabilizers if really bad? No, usually 1 is enough.
        const otherStabilizer = allCharacters.find(c =>
            c.locationId === targetId &&
            c.id !== leader.id &&
            c.faction === faction &&
            (c.status === CharacterStatus.AVAILABLE || c.status === CharacterStatus.MOVING) &&
            // Roughly check if they are "handling" it? 
            // Simplified: If someone is there, skip.
            c.locationId === targetId
        );

        if (otherStabilizer) continue;

        // Distance check (2 roads max)
        const path = findSafePath(leader.locationId!, targetId, state, faction);
        if (!path || path.length > 2) continue; // Too far

        // Assign/Move
        if (leader.locationId === targetId) {
            // Already there. 
            // Logic to "Act" is passive in this game (based on presence), so we just stay.
            return true;
        }

        return moveLeaderStart(leader, targetId, state, allCharacters, logs, `stabilize ${mission.targetId}`);
    }

    return false;
}


// --- UTILS ---

function moveLeaderStart(
    leader: Character,
    targetId: string,
    state: GameState,
    allCharacters: Character[],
    logs: LogEntry[],
    reason: string
): boolean {
    const path = findSafePath(leader.locationId!, targetId, state, leader.faction);
    if (!path || path.length === 0) return false;

    // Movement Logic for Leaders (Simplified to use travelTurns of road)
    const roadId = path[0];
    const road = state.roads.find(r => r.id === roadId);
    if (!road) return false;

    // Safety check: Is path length acceptable? (Avoid cross-map treks)
    if (path.length > 3) { // >3 roads is approx >6-9 turns. Too far.
        return false;
    }

    const turns = road.travelTurns || road.stages.length; // Approximate
    const idx = allCharacters.findIndex(c => c.id === leader.id);

    if (idx !== -1) {
        allCharacters[idx] = {
            ...leader,
            status: CharacterStatus.MOVING,
            destinationId: targetId,
            turnsUntilArrival: turns
        };
        // User Request: Log Refinement
        let logMsg = `${leader.name} is travelling to ${reason}.`;
        let shouldLog = true;

        if (reason.includes("stabilize")) {
            // Chance check (50%)
            if (Math.random() < 0.5) {
                shouldLog = false;
            } else {
                // Formatting
                const targetLoc = state.locations.find(l => l.id === targetId);
                const locName = targetLoc ? targetLoc.name : targetId;
                logMsg = `Spies have spotted ${leader.name} travelling to stabilize ${locName}.`;
            }
        }

        if (shouldLog) {
            logs.push({
                id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'LEADER' as any,
                message: logMsg,
                turn: state.turn,
                visibleToFactions: [],  // Visible to all
                baseSeverity: 'INFO' as any
            });
        }
        return true;
    }
    return false;
}

function hasManager(locationId: string, chars: Character[], faction: FactionId): boolean {
    return chars.some(c => c.locationId === locationId && c.faction === faction && c.stats.ability.includes('MANAGER') && !c.armyId);
}
function hasStabilizer(locationId: string, chars: Character[], faction: FactionId): boolean {
    return chars.some(c => c.locationId === locationId && c.faction === faction && c.status === CharacterStatus.AVAILABLE && !c.armyId); // Any avail char acts as stabilizer? Or specific traits? 
    // In this game logic, usually characters purely by presence or trait?
    // User spec: "Leaders Stabilisateurs sont ceux disposant d’un bonus augmentant à chaque tour la stabilité"
    // We assume the logic elsewhere handles the effect. Here we just check if someone is there.
}
