/**
 * Unified Assignment Service
 * 
 * Implements unified IPG comparison across all leader roles:
 * - Governor (nearby territories only)
 * - Clandestine Major (Grand/Neutral)
 * - Clandestine Minor (Undermine)
 * - Commander
 * 
 * Phase 0: Reserve leaders with fixed roles (MOVING, ON_MISSION, Urgent Governor)
 * Phase 1: Generate all possible assignments with IPG
 * Phase 2: Sort by IPG and assign, respecting budget and limits
 * 
 * @module shared/services/ai/leaders/core
 */

import { Character, Location, Army, FactionId, CharacterStatus, GameState } from '../../../../types';
import { AILeaderRole, RoleAssignment, TerritoryStatus, ClandestineOpportunity } from '../types';
import { GovernorPolicy } from '../../../../types/governorTypes';
import {
    calculateGovernorIPG,
    calculateGrandIPG,
    calculateNeutralIPG,
    calculateMinorIPG,
    calculateCommanderValue,
    getFactionIPGMultiplier,
    getEffectiveIPGFloor
} from '../utils/IPGCalculator';
import { calculateLeaderTravelTime } from '../../../domain/leaders/leaderPathfinding';

// ============================================================================
// TYPES
// ============================================================================

export interface PotentialAssignment {
    leaderId: string;
    leaderName: string;
    role: AILeaderRole;
    targetId: string;
    targetName: string;
    ipg: number;
    missionType?: 'MAJOR' | 'MINOR';
    goldRequired: number;
    travelTime: number;
    details: string;
}

export interface AssignmentContext {
    state: GameState;
    faction: FactionId;
    budget: number;
    turn: number;
    isCampaignActive: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Max travel time for STABILIZER/PROTECTOR assignments */
const MAX_STABILIZER_TRAVEL = 3;

/** Max clandestine missions on turn 1 (Republicans only) */
const MAX_CLANDESTINE_TURN_1_REPUBLICANS = 2;

/** Max clandestine missions per turn (all factions, including turn 1 for non-Republicans) */
const MAX_CLANDESTINE_PER_TURN = 1;

/** Leaders eligible for STABILIZER role */
const STABILIZER_CANDIDATES = [
    'baron_lekal', 'duke_of_thane', 'sir_azer',
    'count_rivenberg', 'sir_barrett', 'sir_tymon'
];

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Generate unified assignments for all leaders of a faction.
 * 
 * @returns Sorted list of role assignments, ready for execution
 */
export function generateUnifiedAssignments(
    context: AssignmentContext,
    territories: TerritoryStatus[],
    enemyLocations: Location[],
    armies: Army[]
): RoleAssignment[] {
    const { state, faction, budget, turn } = context;
    const leaders = state.characters.filter(c =>
        c.faction === faction &&
        c.status !== CharacterStatus.DEAD
    );

    const logs: string[] = [];
    const assignedLeaderIds = new Set<string>();
    const assignedLocations = new Set<string>();
    const assignments: RoleAssignment[] = [];

    // Pre-populate locations with existing undercover agents and agents en-route
    // to prevent sending multiple agents to the same location
    const occupiedClandestineLocations = new Set<string>();
    for (const leader of leaders) {
        // Active undercover agents
        if (leader.status === CharacterStatus.UNDERCOVER && leader.locationId) {
            occupiedClandestineLocations.add(leader.locationId);
        }
        // ON_MISSION agents (preparing Grand Insurrection, still in location)
        if ((leader.status as string) === 'ON_MISSION' && leader.locationId) {
            occupiedClandestineLocations.add(leader.locationId);
        }
        // Agents moving to a clandestine destination (MOVING with destination in enemy territory)
        if (leader.status === CharacterStatus.MOVING && leader.destinationId) {
            const destLoc = state.locations.find(l => l.id === leader.destinationId);
            if (destLoc && destLoc.faction !== faction && destLoc.faction !== FactionId.NEUTRAL) {
                occupiedClandestineLocations.add(leader.destinationId);
            }
        }
    }
    console.log(`[AI UNIFIED ${faction}] Occupied clandestine locations: ${Array.from(occupiedClandestineLocations).join(', ') || 'none'}`);

    // =========================================================================
    // PHASE 0: Reserve Fixed Roles
    // =========================================================================

    for (const leader of leaders) {
        // Skip MOVING leaders
        if (leader.status === CharacterStatus.MOVING) {
            assignedLeaderIds.add(leader.id);
            logs.push(`${leader.name}: Reserved (MOVING)`);
            continue;
        }

        // Skip ON_MISSION leaders (preparing Grand Insurrection)
        if ((leader.status as any) === 'ON_MISSION') {
            assignedLeaderIds.add(leader.id);
            logs.push(`${leader.name}: Reserved (ON_MISSION)`);
            continue;
        }

        // FIX #1: Skip UNDERCOVER leaders with budget (already on mission)
        if (leader.status === CharacterStatus.UNDERCOVER && (leader.clandestineBudget || 0) > 0) {
            assignedLeaderIds.add(leader.id);
            logs.push(`${leader.name}: Reserved (UNDERCOVER with budget ${leader.clandestineBudget})`);
            continue;
        }

        // Check for urgent Governor needs at current location
        const currentLocation = state.locations.find(l => l.id === leader.locationId);
        if (currentLocation && currentLocation.faction === faction) {
            // FIX: Only assign urgent governor if location doesn't already have one
            if (!assignedLocations.has(currentLocation.id)) {
                const urgentPolicy = getUrgentGovernorPolicy(currentLocation, state, faction);
                if (urgentPolicy) {
                    assignments.push({
                        leaderId: leader.id,
                        assignedRole: AILeaderRole.GOVERNOR,
                        targetLocationId: currentLocation.id,
                        priority: 100,
                        reasoning: `Urgent: ${urgentPolicy} at ${currentLocation.name}`
                    });
                    assignedLeaderIds.add(leader.id);
                    assignedLocations.add(currentLocation.id);
                    logs.push(`${leader.name}: Urgent Governor (${urgentPolicy})`);
                }
            }
        }
    }

    // =========================================================================
    // PHASE 1: Generate All Possible Assignments
    // =========================================================================

    const potentialAssignments: PotentialAssignment[] = [];
    const availableLeaders = leaders.filter(l => !assignedLeaderIds.has(l.id));
    const factionMultiplier = getFactionIPGMultiplier(faction);

    for (const leader of availableLeaders) {
        const leaderKey = leader.id.toLowerCase().replace(/\s+/g, '_');
        const isStabilizerCandidate = STABILIZER_CANDIDATES.includes(leaderKey);
        const currentLoc = state.locations.find(l => l.id === leader.locationId);

        // 1. Governor at nearby territories (current + linkedLocation)
        if (currentLoc && currentLoc.faction === faction) {
            const nearbyTerritories = getNearbyTerritories(currentLoc, territories);

            // Debug: Log what territories are found for this leader
            if (nearbyTerritories.length > 0) {
                console.log(`[PHASE1] ${leader.name} at ${currentLoc.name}: nearby=[${nearbyTerritories.map(t => t.location.name).join(', ')}]`);
            }

            for (const territory of nearbyTerritories) {
                if (assignedLocations.has(territory.location.id)) {
                    console.log(`[PHASE1] ${leader.name}: SKIP ${territory.location.name} (already assigned in Phase0)`);
                    continue;
                }

                const result = calculateGovernorIPG(leader, territory.location, faction);
                potentialAssignments.push({
                    leaderId: leader.id,
                    leaderName: leader.name,
                    role: AILeaderRole.GOVERNOR,
                    targetId: territory.location.id,
                    targetName: territory.location.name,
                    ipg: result.ipg,
                    goldRequired: 0,
                    travelTime: 0, // Nearby = instant
                    details: result.details
                });
            }
        }

        // 2. STABILIZER missions (for candidates, max 3 turns travel)
        if (isStabilizerCandidate && (leader.stats?.stabilityPerTurn || 0) > 0) {
            const criticalTerritories = territories.filter(t =>
                t.needsStabilizer &&
                !assignedLocations.has(t.location.id)
            );

            for (const territory of criticalTerritories) {
                const travelTime = calculateLeaderTravelTime(
                    leader.locationId || '',
                    territory.location.id,
                    state.locations,
                    state.roads
                );

                if (travelTime <= MAX_STABILIZER_TRAVEL) {
                    const result = calculateGovernorIPG(leader, territory.location, faction);
                    // STABILIZER gets priority boost
                    potentialAssignments.push({
                        leaderId: leader.id,
                        leaderName: leader.name,
                        role: AILeaderRole.STABILIZER,
                        targetId: territory.location.id,
                        targetName: territory.location.name,
                        ipg: result.ipg * 1.5, // Priority boost for stabilization
                        goldRequired: 0,
                        travelTime,
                        details: `STABILIZER: ${result.details}`
                    });
                }
            }
        }

        // 3. Clandestine missions - any leader with clandestineOps can attempt
        // Low ops leaders will naturally have lower IPG and be filtered out
        const ops = leader.stats?.clandestineOps || 0;
        if (ops > 0) {
            for (const enemy of enemyLocations) {
                // 3a. Grand Insurrection (Major, min 300g)
                const grandIPG = calculateGrandIPG(enemy, ops, 400, faction) * factionMultiplier;
                potentialAssignments.push({
                    leaderId: leader.id,
                    leaderName: leader.name,
                    role: AILeaderRole.CLANDESTINE,
                    targetId: enemy.id,
                    targetName: enemy.name,
                    ipg: grandIPG,
                    missionType: 'MAJOR',
                    goldRequired: 300, // Minimum for Major missions
                    travelTime: calculateLeaderTravelTime(leader.locationId || '', enemy.id, state.locations, state.roads),
                    details: `Grand @ ${enemy.name}: IPG=${grandIPG.toFixed(2)}`
                });

                // 3b. Incite Neutral (Major, min 300g)
                const neutralIPG = calculateNeutralIPG(enemy, ops, faction) * factionMultiplier;
                potentialAssignments.push({
                    leaderId: leader.id,
                    leaderName: leader.name,
                    role: AILeaderRole.CLANDESTINE,
                    targetId: enemy.id,
                    targetName: enemy.name,
                    ipg: neutralIPG,
                    missionType: 'MAJOR',
                    goldRequired: 300, // Minimum for Major missions
                    travelTime: calculateLeaderTravelTime(leader.locationId || '', enemy.id, state.locations, state.roads),
                    details: `Neutral @ ${enemy.name}: IPG=${neutralIPG.toFixed(2)}`
                });

                // 3c. Undermine (Minor, 100g)
                const minorResult = calculateMinorIPG(enemy, ops, faction);
                const minorIPG = minorResult.ipg * factionMultiplier;
                potentialAssignments.push({
                    leaderId: leader.id,
                    leaderName: leader.name,
                    role: AILeaderRole.CLANDESTINE,
                    targetId: enemy.id,
                    targetName: enemy.name,
                    ipg: minorIPG,
                    missionType: 'MINOR',
                    goldRequired: 100,
                    travelTime: calculateLeaderTravelTime(leader.locationId || '', enemy.id, state.locations, state.roads),
                    details: `Minor @ ${enemy.name}: ${minorResult.details}`
                });
            }
        }

        // 6. Commander
        if ((leader.stats?.commandBonus || 0) > 0) {
            const needyArmies = armies.filter(a =>
                a.faction === faction &&
                a.strength > 1000 &&
                !state.characters.some(c => (c as any).assignedArmyId === a.id)
            );

            for (const army of needyArmies) {
                const travelTime = calculateLeaderTravelTime(
                    leader.locationId || '',
                    army.locationId || '',
                    state.locations,
                    state.roads
                );

                const result = calculateCommanderValue(leader, army, context.isCampaignActive);
                potentialAssignments.push({
                    leaderId: leader.id,
                    leaderName: leader.name,
                    role: AILeaderRole.COMMANDER,
                    targetId: army.id,
                    targetName: `Army at ${army.locationId}`,
                    ipg: result.value, // Use "value" as comparable metric
                    goldRequired: 0,
                    travelTime,
                    details: result.details
                });
            }
        }
    }

    // =========================================================================
    // PHASE 2: Sort and Assign
    // =========================================================================

    // Sort by IPG descending
    potentialAssignments.sort((a, b) => b.ipg - a.ipg);

    // remainingBudget is the clandestine budget allocated by the AI pipeline
    // (after recruitment, siege, diplomacy allocations in Application/services/ai/index.ts)
    let remainingBudget = budget;
    let clandestineMissionsThisTurn = 0;
    // FIX #2: Limit to 1 mission/turn except Republicans on turn 1 who get 2
    const maxClandestine = (turn === 1 && faction === FactionId.REPUBLICANS)
        ? MAX_CLANDESTINE_TURN_1_REPUBLICANS
        : MAX_CLANDESTINE_PER_TURN;

    // Track clandestine destinations to avoid sending multiple agents to same location
    const clandestineDestinations = new Set<string>();

    // Dynamic IPG floor: lower if faction is gold-rich (needs to spend)
    const factionGold = state.resources?.[faction]?.gold || 0;
    const effectiveIPGFloor = getEffectiveIPGFloor(factionGold);

    // Log all potential assignments for debugging
    console.log(`[AI UNIFIED ${faction}] Turn ${turn} - ${potentialAssignments.length} potential assignments:`);
    for (const pa of potentialAssignments.slice(0, 20)) { // Top 20
        console.log(`  ${pa.leaderName} -> ${pa.role} @ ${pa.targetName}: IPG=${pa.ipg.toFixed(2)} (${pa.details})`);
    }

    for (const pa of potentialAssignments) {
        // Skip if leader already assigned
        if (assignedLeaderIds.has(pa.leaderId)) continue;

        // Skip if location already has assignment (for Governor roles)
        if ((pa.role === AILeaderRole.GOVERNOR || pa.role === AILeaderRole.STABILIZER) &&
            assignedLocations.has(pa.targetId)) {
            console.log(`  [SKIP-LOC] ${pa.leaderName} -> ${pa.role} @ ${pa.targetName}: location already has governor`);
            continue;
        }

        // Check constraints for Clandestine
        if (pa.role === AILeaderRole.CLANDESTINE) {
            // IPG floor check (dynamic based on faction wealth)
            if (pa.ipg < effectiveIPGFloor) {
                console.log(`  [REJECTED] ${pa.leaderName} -> ${pa.role}: IPG ${pa.ipg.toFixed(2)} < floor ${effectiveIPGFloor}`);
                continue;
            }

            // Budget check
            if (pa.goldRequired > remainingBudget) {
                console.log(`  [REJECTED] ${pa.leaderName} -> ${pa.role}: Budget ${remainingBudget} < ${pa.goldRequired}`);
                continue;
            }

            // Mission limit check
            if (clandestineMissionsThisTurn >= maxClandestine) {
                console.log(`  [REJECTED] ${pa.leaderName} -> ${pa.role}: Mission limit reached (${clandestineMissionsThisTurn}/${maxClandestine})`);
                continue;
            }

            // Check if location already has an active or en-route agent
            if (occupiedClandestineLocations.has(pa.targetId)) {
                console.log(`  [REJECTED] ${pa.leaderName} -> ${pa.role}: Location ${pa.targetName} already has an agent`);
                continue;
            }

            // Prevent multiple agents to same destination (this turn)
            if (clandestineDestinations.has(pa.targetId)) {
                console.log(`  [REJECTED] ${pa.leaderName} -> ${pa.role}: Agent already sent to ${pa.targetName} this turn`);
                continue;
            }
        }

        // ASSIGN!
        assignments.push({
            leaderId: pa.leaderId,
            assignedRole: pa.role,
            targetLocationId: pa.role !== AILeaderRole.COMMANDER ? pa.targetId : undefined,
            targetArmyId: pa.role === AILeaderRole.COMMANDER ? pa.targetId : undefined,
            priority: Math.min(100, Math.floor(pa.ipg * 5)),
            reasoning: pa.details
        });

        assignedLeaderIds.add(pa.leaderId);

        if (pa.role === AILeaderRole.GOVERNOR || pa.role === AILeaderRole.STABILIZER) {
            assignedLocations.add(pa.targetId);
        }

        if (pa.role === AILeaderRole.CLANDESTINE) {
            remainingBudget -= pa.goldRequired;
            clandestineMissionsThisTurn++;
            clandestineDestinations.add(pa.targetId); // Prevent multiple agents to same location
        }

        console.log(`  [ASSIGNED] ${pa.leaderName} -> ${pa.role} @ ${pa.targetName} (IPG=${pa.ipg.toFixed(2)})`);
    }

    // Assign remaining leaders as IDLE
    for (const leader of availableLeaders) {
        if (!assignedLeaderIds.has(leader.id)) {
            assignments.push({
                leaderId: leader.id,
                assignedRole: AILeaderRole.IDLE,
                targetLocationId: leader.locationId,
                priority: 5,
                reasoning: 'No high-value assignment available'
            });
        }
    }

    return assignments.sort((a, b) => b.priority - a.priority);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get nearby territories (current location + linkedLocation).
 */
function getNearbyTerritories(
    currentLoc: Location,
    territories: TerritoryStatus[]
): TerritoryStatus[] {
    const nearby: TerritoryStatus[] = [];

    // Current location
    const current = territories.find(t => t.location.id === currentLoc.id);
    if (current) nearby.push(current);

    // Linked location
    if (currentLoc.linkedLocationId) {
        const linked = territories.find(t => t.location.id === currentLoc.linkedLocationId);
        if (linked) nearby.push(linked);
    }

    return nearby;
}

/**
 * Check if location needs urgent Governor action.
 * Returns the urgent policy type or null.
 */
function getUrgentGovernorPolicy(
    location: Location,
    state: GameState,
    faction: FactionId
): GovernorPolicy | null {
    // HUNT_NETWORKS: Enemy agent detected
    const hasEnemyAgent = state.characters.some(c =>
        c.faction !== faction &&
        c.faction !== FactionId.NEUTRAL &&
        c.status === CharacterStatus.UNDERCOVER &&
        c.locationId === location.id
    );
    if (hasEnemyAgent) return GovernorPolicy.HUNT_NETWORKS;

    // RATIONING: City cut off from rural with low food
    if (location.type === 'CITY') {
        const linkedRural = location.linkedLocationId
            ? state.locations.find(l => l.id === location.linkedLocationId)
            : null;

        if (linkedRural && linkedRural.faction !== faction && linkedRural.faction !== FactionId.NEUTRAL) {
            const foodStock = location.foodStock || 0;
            const foodDrain = Math.abs(location.foodIncome || 0);
            const turnsUntilEmpty = foodDrain > 0 ? Math.floor(foodStock / foodDrain) : 999;

            if (turnsUntilEmpty <= 2) return GovernorPolicy.RATIONING;
        }
    }

    // Critical stability
    if (location.stability < 30) {
        return GovernorPolicy.STABILIZE_REGION;
    }

    return null;
}
