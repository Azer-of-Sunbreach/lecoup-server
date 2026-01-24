"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUnifiedAssignments = generateUnifiedAssignments;
const types_1 = require("../../../../types");
const types_2 = require("../types");
const clandestineTypes_1 = require("../../../../types/clandestineTypes");
const governorTypes_1 = require("../../../../types/governorTypes");
const IPGCalculator_1 = require("../utils/IPGCalculator");
const leaderPathfinding_1 = require("../../../domain/leaders/leaderPathfinding");
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
function generateUnifiedAssignments(context, territories, enemyLocations, armies) {
    const { state, faction, budget, turn } = context;
    const leaders = state.characters.filter(c => c.faction === faction &&
        c.status !== types_1.CharacterStatus.DEAD);
    const logs = [];
    const assignedLeaderIds = new Set();
    const assignedLocations = new Set();
    const assignments = [];
    // Pre-populate locations with existing undercover agents and agents en-route
    // to prevent sending multiple agents to the same location
    const occupiedClandestineLocations = new Set();
    for (const leader of leaders) {
        // Active undercover agents
        if (leader.status === types_1.CharacterStatus.UNDERCOVER && leader.locationId) {
            occupiedClandestineLocations.add(leader.locationId);
        }
        // ON_MISSION agents (preparing Grand Insurrection, still in location)
        if (leader.status === 'ON_MISSION' && leader.locationId) {
            occupiedClandestineLocations.add(leader.locationId);
        }
        // Agents moving to a clandestine destination (MOVING with destination in enemy territory)
        if (leader.status === types_1.CharacterStatus.MOVING && leader.destinationId) {
            const destLoc = state.locations.find(l => l.id === leader.destinationId);
            if (destLoc && destLoc.faction !== faction && destLoc.faction !== types_1.FactionId.NEUTRAL) {
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
        if (leader.status === types_1.CharacterStatus.MOVING) {
            assignedLeaderIds.add(leader.id);
            logs.push(`${leader.name}: Reserved (MOVING)`);
            continue;
        }
        // Skip ON_MISSION leaders (preparing Grand Insurrection)
        if (leader.status === 'ON_MISSION') {
            assignedLeaderIds.add(leader.id);
            logs.push(`${leader.name}: Reserved (ON_MISSION)`);
            continue;
        }
        // FIX #1: Skip UNDERCOVER leaders with budget (already on mission)
        if (leader.status === types_1.CharacterStatus.UNDERCOVER && (leader.clandestineBudget || 0) > 0) {
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
                        assignedRole: types_2.AILeaderRole.GOVERNOR,
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
    const potentialAssignments = [];
    const availableLeaders = leaders.filter(l => !assignedLeaderIds.has(l.id));
    const factionMultiplier = (0, IPGCalculator_1.getFactionIPGMultiplier)(faction);
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
                const result = (0, IPGCalculator_1.calculateGovernorIPG)(leader, territory.location, faction);
                potentialAssignments.push({
                    leaderId: leader.id,
                    leaderName: leader.name,
                    role: types_2.AILeaderRole.GOVERNOR,
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
            const criticalTerritories = territories.filter(t => t.needsStabilizer &&
                !assignedLocations.has(t.location.id));
            for (const territory of criticalTerritories) {
                const travelTime = (0, leaderPathfinding_1.calculateLeaderTravelTime)(leader.locationId || '', territory.location.id, state.locations, state.roads);
                if (travelTime <= MAX_STABILIZER_TRAVEL) {
                    const result = (0, IPGCalculator_1.calculateGovernorIPG)(leader, territory.location, faction);
                    // STABILIZER gets priority boost
                    potentialAssignments.push({
                        leaderId: leader.id,
                        leaderName: leader.name,
                        role: types_2.AILeaderRole.STABILIZER,
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
                // BASELINE: Calculate potential using standard 400g investment for comparison
                const grandIPG = (0, IPGCalculator_1.calculateGrandIPG)(enemy, ops, 400, faction) * factionMultiplier;
                if (grandIPG > 0) {
                    const travelTime = (0, leaderPathfinding_1.calculateLeaderTravelTime)(leader.locationId || '', enemy.id, state.locations, state.roads);
                    // Determine actual gold to assign based on available budget
                    // If rich (>500), assign 500. If >400, assign 400. Else 300 default.
                    let goldToAssign = 300;
                    if (budget >= 500)
                        goldToAssign = 500;
                    else if (budget >= 400)
                        goldToAssign = 400;
                    potentialAssignments.push({
                        leaderId: leader.id,
                        leaderName: leader.name,
                        role: types_2.AILeaderRole.CLANDESTINE,
                        targetId: enemy.id,
                        targetName: enemy.name,
                        ipg: (0, IPGCalculator_1.applyDistancePenalty)(grandIPG, travelTime),
                        missionType: 'MAJOR',
                        targetActionId: clandestineTypes_1.ClandestineActionId.PREPARE_GRAND_INSURRECTION,
                        goldRequired: goldToAssign, // Assign dynamic amount based on wealth
                        travelTime: travelTime,
                        details: `Grand @ ${enemy.name}: IPG=${grandIPG.toFixed(2)} (Dist: ${travelTime}) [Alloc: ${goldToAssign}g]`
                    });
                } // 3b. Incite Neutral (Major, budget based on discretion)
                const discretion = leader.stats?.discretion ?? 3;
                const neutralMinBudget = (0, IPGCalculator_1.calculateNeutralMissionBudget)(discretion);
                const neutralIPG = (0, IPGCalculator_1.calculateNeutralIPG)(enemy, ops, faction, discretion) * factionMultiplier;
                if (neutralIPG > 0) {
                    const travelTime = (0, leaderPathfinding_1.calculateLeaderTravelTime)(leader.locationId || '', enemy.id, state.locations, state.roads);
                    potentialAssignments.push({
                        leaderId: leader.id,
                        leaderName: leader.name,
                        role: types_2.AILeaderRole.CLANDESTINE,
                        targetId: enemy.id,
                        targetName: enemy.name,
                        ipg: (0, IPGCalculator_1.applyDistancePenalty)(neutralIPG, travelTime),
                        missionType: 'MAJOR',
                        targetActionId: clandestineTypes_1.ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS,
                        goldRequired: neutralMinBudget,
                        travelTime: travelTime,
                        details: `Neutral @ ${enemy.name}: IPG=${neutralIPG.toFixed(2)} (Dist: ${travelTime})`
                    });
                } // 3c. Undermine (Minor)
                // SCORCHED_EARTH leaders need 200g minimum to cover destructive actions
                const hasScorchedEarth = leader.stats?.traits?.includes('SCORCHED_EARTH') ?? false;
                const minorMinBudget = hasScorchedEarth ? 200 : 100;
                const leaderDiscretion = leader.stats?.discretion ?? 3;
                const minorResult = (0, IPGCalculator_1.calculateMinorIPG)(enemy, ops, faction, leaderDiscretion, faction);
                const minorIPG = minorResult.ipg * factionMultiplier;
                if (minorResult.ipg > 0) {
                    const travelTime = (0, leaderPathfinding_1.calculateLeaderTravelTime)(leader.locationId || '', enemy.id, state.locations, state.roads);
                    potentialAssignments.push({
                        leaderId: leader.id,
                        leaderName: leader.name,
                        role: types_2.AILeaderRole.CLANDESTINE,
                        targetId: enemy.id,
                        targetName: enemy.name,
                        ipg: (0, IPGCalculator_1.applyDistancePenalty)(minorIPG, travelTime),
                        missionType: 'MINOR',
                        targetActionId: clandestineTypes_1.ClandestineActionId.UNDERMINE_AUTHORITIES, // Default for minor, will pick up others too
                        goldRequired: minorMinBudget,
                        travelTime: travelTime,
                        details: `Minor @ ${enemy.name}: ${minorResult.details}${hasScorchedEarth ? ' [SCORCHED]' : ''} (Dist: ${travelTime})`
                    });
                }
            }
        }
        // 6. Commander
        if ((leader.stats?.commandBonus || 0) > 0) {
            const needyArmies = armies.filter(a => a.faction === faction &&
                a.strength > 1000 &&
                a.locationId !== null && // Leaders can only travel to locations, not roads
                !state.characters.some(c => c.assignedArmyId === a.id));
            for (const army of needyArmies) {
                // Resolve army location name (handle both location and road-based armies)
                let armyLocationName = 'Unknown';
                if (army.locationId) {
                    const loc = state.locations.find(l => l.id === army.locationId);
                    armyLocationName = loc?.name || army.locationId;
                }
                else if (army.roadId) {
                    const road = state.roads.find(r => r.id === army.roadId);
                    if (road && army.stageIndex >= 0 && army.stageIndex < road.stages.length) {
                        armyLocationName = road.stages[army.stageIndex].name || `Road Stage ${army.stageIndex}`;
                    }
                    else {
                        armyLocationName = `Road ${army.roadId}`;
                    }
                }
                const travelTime = (0, leaderPathfinding_1.calculateLeaderTravelTime)(leader.locationId || '', army.locationId || '', state.locations, state.roads);
                const result = (0, IPGCalculator_1.calculateCommanderValue)(leader, army, context.isCampaignActive);
                potentialAssignments.push({
                    leaderId: leader.id,
                    leaderName: leader.name,
                    role: types_2.AILeaderRole.COMMANDER,
                    targetId: army.id,
                    targetName: `Army at ${armyLocationName}`,
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
    const maxClandestine = (turn === 1 && faction === types_1.FactionId.REPUBLICANS)
        ? MAX_CLANDESTINE_TURN_1_REPUBLICANS
        : MAX_CLANDESTINE_PER_TURN;
    // Track clandestine destinations to avoid sending multiple agents to same location
    const clandestineDestinations = new Set();
    // Dynamic IPG floor: lower if faction is gold-rich (needs to spend)
    const factionGold = state.resources?.[faction]?.gold || 0;
    const effectiveIPGFloor = (0, IPGCalculator_1.getEffectiveIPGFloor)(factionGold);
    // Log all potential assignments for debugging
    console.log(`[AI UNIFIED ${faction}] Turn ${turn} - ${potentialAssignments.length} potential assignments:`);
    for (const pa of potentialAssignments.slice(0, 20)) { // Top 20
        console.log(`  ${pa.leaderName} -> ${pa.role} @ ${pa.targetName}: IPG=${pa.ipg.toFixed(2)} (${pa.details})`);
    }
    for (const pa of potentialAssignments) {
        // Skip if leader already assigned
        if (assignedLeaderIds.has(pa.leaderId))
            continue;
        // Skip if location already has assignment (for Governor roles)
        if ((pa.role === types_2.AILeaderRole.GOVERNOR || pa.role === types_2.AILeaderRole.STABILIZER) &&
            assignedLocations.has(pa.targetId)) {
            console.log(`  [SKIP-LOC] ${pa.leaderName} -> ${pa.role} @ ${pa.targetName}: location already has governor`);
            continue;
        }
        // Check constraints for Clandestine
        if (pa.role === types_2.AILeaderRole.CLANDESTINE) {
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
            targetLocationId: pa.role !== types_2.AILeaderRole.COMMANDER ? pa.targetId : undefined,
            targetArmyId: pa.role === types_2.AILeaderRole.COMMANDER ? pa.targetId : undefined,
            priority: Math.min(100, Math.floor(pa.ipg * 5)),
            reasoning: pa.details,
            assignedBudget: pa.role === types_2.AILeaderRole.CLANDESTINE ? pa.goldRequired : undefined,
            missionType: pa.missionType,
            targetActionId: pa.targetActionId
        });
        assignedLeaderIds.add(pa.leaderId);
        if (pa.role === types_2.AILeaderRole.GOVERNOR || pa.role === types_2.AILeaderRole.STABILIZER) {
            assignedLocations.add(pa.targetId);
        }
        if (pa.role === types_2.AILeaderRole.CLANDESTINE) {
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
                assignedRole: types_2.AILeaderRole.IDLE,
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
function getNearbyTerritories(currentLoc, territories) {
    const nearby = [];
    // Current location
    const current = territories.find(t => t.location.id === currentLoc.id);
    if (current)
        nearby.push(current);
    // Linked location
    if (currentLoc.linkedLocationId) {
        const linked = territories.find(t => t.location.id === currentLoc.linkedLocationId);
        if (linked)
            nearby.push(linked);
    }
    return nearby;
}
/**
 * Check if location needs urgent Governor action.
 * Returns the urgent policy type or null.
 */
function getUrgentGovernorPolicy(location, state, faction) {
    // HUNT_NETWORKS: Enemy agent detected
    const hasEnemyAgent = state.characters.some(c => c.faction !== faction &&
        c.faction !== types_1.FactionId.NEUTRAL &&
        c.status === types_1.CharacterStatus.UNDERCOVER &&
        c.locationId === location.id);
    if (hasEnemyAgent)
        return governorTypes_1.GovernorPolicy.HUNT_NETWORKS;
    // RATIONING: City cut off from rural with low food
    if (location.type === 'CITY') {
        const linkedRural = location.linkedLocationId
            ? state.locations.find(l => l.id === location.linkedLocationId)
            : null;
        if (linkedRural && linkedRural.faction !== faction && linkedRural.faction !== types_1.FactionId.NEUTRAL) {
            const foodStock = location.foodStock || 0;
            const foodDrain = Math.abs(location.foodIncome || 0);
            const turnsUntilEmpty = foodDrain > 0 ? Math.floor(foodStock / foodDrain) : 999;
            if (turnsUntilEmpty <= 2)
                return governorTypes_1.GovernorPolicy.RATIONING;
        }
    }
    // Critical stability
    if (location.stability < 30) {
        return governorTypes_1.GovernorPolicy.STABILIZE_REGION;
    }
    return null;
}
