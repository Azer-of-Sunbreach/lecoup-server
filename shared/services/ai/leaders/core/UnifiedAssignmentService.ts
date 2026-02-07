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
import { ClandestineActionId } from '../../../../types/clandestineTypes';
import { GovernorPolicy } from '../../../../types/governorTypes';
import {
    calculateGovernorIPG,
    calculateGrandIPG,
    calculateNeutralIPG,
    calculateMinorIPG,
    calculateManagerOpportunityCost,
    calculateCommanderValue,
    getFactionIPGMultiplier,
    getEffectiveIPGFloor,
    getDetectionThreshold,
    calculateNeutralMissionBudget,
    applyDistancePenalty,
    getResentmentAgainst,
    ManagerOpportunityCostOptions
} from '../utils/IPGCalculator';
import { calculateLeaderTravelTime } from '../../../domain/leaders/leaderPathfinding';
import { LocationType } from '../../../../types';

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
    targetActionId?: ClandestineActionId;
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

    // Build set of owned territory IDs for validation
    const ownedTerritoryIds = new Set(territories.map(t => t.location.id));

    // =========================================================================
    // PHASE 0: Reserve Fixed Roles
    // =========================================================================

    // FIX: Pre-validate GOVERNING leaders - check territory ownership + uniqueness
    const governorsInEnemyTerritory: string[] = [];
    for (const leader of leaders) {
        if (leader.status === CharacterStatus.GOVERNING && leader.locationId) {
            // FIX #1: Check if location is still controlled by leader's faction
            if (!ownedTerritoryIds.has(leader.locationId)) {
                governorsInEnemyTerritory.push(leader.id);
                console.log(`[AI GOVERNOR FIX] ${leader.name}: Location ${leader.locationId} no longer friendly - will be evacuated`);
                continue;
            }
            
            // FIX #2: Check uniqueness - only one governor per location
            if (assignedLocations.has(leader.locationId)) {
                console.log(`[AI GOVERNOR FIX] ${leader.name}: Duplicate governor at ${leader.locationId} - demoting to IDLE`);
                continue;
            }
            
            // Valid governor - reserve location to prevent duplicates
            assignedLocations.add(leader.locationId);
        }
    }

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
                    // MAN_OF_ACTION: Only allow HUNT_NETWORKS, MAKE_EXAMPLES, and RATIONING
                    const hasManOfAction = leader.stats?.traits?.includes('MAN_OF_ACTION') ?? false;
                    const allowedForManOfAction = [GovernorPolicy.HUNT_NETWORKS, GovernorPolicy.MAKE_EXAMPLES, GovernorPolicy.RATIONING];

                    if (hasManOfAction && !allowedForManOfAction.includes(urgentPolicy)) {
                        // Skip this MAN_OF_ACTION leader for non-allowed urgent policies
                        console.log(`[AI UNIFIED ${faction}] ${leader.name}: Skipped for urgent ${urgentPolicy} (MAN_OF_ACTION)`);
                    } else {
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
    }

    // =========================================================================
    // PHASE 0.5: Handle Army-Attached Leaders
    // =========================================================================
    // Leaders attached to armies can be detached if a better assignment exists.
    // Exception: Cannot detach if army is on a road.

    const commanderIPGs = new Map<string, number>(); // leaderId -> commanderIPG
    const pendingDetachLeaders = new Set<string>(); // leaderId -> should be detached

    for (const leader of leaders) {
        const armyId = (leader as any).assignedArmyId || leader.armyId;
        if (!armyId) continue;

        const army = armies.find(a => a.id === armyId);
        if (!army) continue;

        // Cannot detach if army is on a road
        if (army.roadId || army.locationType === 'ROAD') {
            assignedLeaderIds.add(leader.id);
            console.log(`[AI UNIFIED] ${leader.name}: Reserved (Commander on road)`);
            continue;
        }

        const commandBonus = leader.stats?.commandBonus || 0;

        // Auto-detach leaders with 0% command bonus (no value as commander)
        if (commandBonus === 0) {
            pendingDetachLeaders.add(leader.id);
            console.log(`[AI UNIFIED] ${leader.name}: Marked for IMMEDIATE detachment (0% command bonus)`);
            
            // Create an IDLE assignment with detachment flag to ensure they get detached
            // even if no better role is found
            assignments.push({
                leaderId: leader.id,
                assignedRole: AILeaderRole.IDLE,
                targetLocationId: leader.locationId,
                priority: 1, // Very low priority - will be replaced if a better role exists
                reasoning: 'Detached from army (0% command bonus)',
                shouldDetachFromArmy: true
            });
            // Don't reserve - let Phase 1 potentially find better assignments
            continue;
        }

        // Calculate current commander IPG for comparison
        const commanderResult = calculateCommanderValue(leader, army, context.isCampaignActive);
        commanderIPGs.set(leader.id, commanderResult.value);
        console.log(`[AI UNIFIED] ${leader.name}: Commander IPG=${commanderResult.value.toFixed(2)} (${commanderResult.details})`);
        // Don't reserve yet - let Phase 1 generate alternatives and Phase 2 will compare
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
        // MAN_OF_ACTION: Skip for governor IPG assignments (cannot stabilize, only HUNT_NETWORKS/MAKE_EXAMPLES/RATIONING)
        const hasManOfAction = leader.stats?.traits?.includes('MAN_OF_ACTION') ?? false;
        if (!hasManOfAction && currentLoc && currentLoc.faction === faction) {
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
        } else if (hasManOfAction && currentLoc && currentLoc.faction === faction) {
            console.log(`[PHASE1] ${leader.name}: SKIP governor IPG (MAN_OF_ACTION)`);
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
            // Check for leader abilities (respecting Internal Factions: granted and disabled abilities)
            const disabledAbilities = leader.disabledAbilities || [];
            const grantedAbilities = leader.grantedAbilities || [];
            const hasEliteNetworks = (
                (leader.stats?.ability?.includes('ELITE_NETWORKS') ?? false) ||
                grantedAbilities.includes('ELITE_NETWORKS')
            ) && !disabledAbilities.includes('ELITE_NETWORKS');
            const hasAgitationalNetworks = (
                (leader.stats?.ability?.includes('AGITATIONAL_NETWORKS') ?? false) ||
                grantedAbilities.includes('AGITATIONAL_NETWORKS')
            ) && !disabledAbilities.includes('AGITATIONAL_NETWORKS');

            // ELITE_NETWORKS: If we have ANY target with resentment < 50, skip targets with resentment >= 50 for MINOR missions
            let validMinorTargets = enemyLocations;
            if (hasEliteNetworks) {
                const lowResentmentTargets = enemyLocations.filter(loc =>
                    getResentmentAgainst(loc, faction) < 50
                );

                if (lowResentmentTargets.length > 0) {
                    // Filter down to only low resentment targets for minor missions
                    // "Un leader avec ELITE_NETWORKS pourrait se rendre en mission mineure dans un territoire 
                    // où le ressentiment est < à 50... cherche la zone ennemie avec l'IPG... le plus élevé"
                    validMinorTargets = lowResentmentTargets;
                    console.log(`[AI ABILITY] ${leader.name} has ELITE_NETWORKS - restricting MINOR missions to ${lowResentmentTargets.length} low-resentment targets`);
                }
            }

            for (const enemy of enemyLocations) {
                const resentment = getResentmentAgainst(enemy, faction);

                // MANAGER opportunity cost: check if leader is in a friendly CITY
                // Applied to ALL clandestine mission types (Grand, Neutral, Minor)
                const hasManagerAbility = leader.stats?.ability?.includes('MANAGER') ?? false;
                const isInFriendlyCity = currentLoc &&
                    currentLoc.faction === faction &&
                    currentLoc.type === LocationType.CITY;

                // 3a. Grand Insurrection (Major, min 300g)
                // BASELINE: Calculate potential using standard 400g investment for comparison
                let grandIPG = calculateGrandIPG(enemy, ops, 400, faction) * factionMultiplier;

                // MANAGER opportunity cost for Grand Insurrection
                // Grand Insurrection prep time = 4 turns
                const GRAND_INSURRECTION_PREP_TURNS = 4;
                const grandTravelTime = calculateLeaderTravelTime(leader.locationId || '', enemy.id, state.locations, state.roads);
                let managerGrandCost = 0;
                let managerGrandDetails = '';
                if (hasManagerAbility && isInFriendlyCity) {
                    managerGrandCost = calculateManagerOpportunityCost(GRAND_INSURRECTION_PREP_TURNS, grandTravelTime);
                    // Convert IPG reduction: cost in soldiers / gold invested
                    const grandIPGReduction = managerGrandCost / 400; // 400g standard investment
                    grandIPG = Math.max(0, grandIPG - grandIPGReduction);
                    managerGrandDetails = ` [MGR-COST:${managerGrandCost}]`;
                }

                // ELITE_NETWORKS: Add minor mission IPG bonus if resentment < 50
                // "Lorsque l'IA calcule l'IPG d'une mission d'insurrection... si la région a un ressentiment < à 50... 
                // elle peut ajouter la valeur d'IPG d'une mission mineure à l'IPG de la mission majeure."
                let eliteBonus = 0;
                let eliteBonusDetails = '';
                if (hasEliteNetworks && resentment < 50) {
                    const minorResult = calculateMinorIPG(enemy, ops, faction, leader.stats?.discretion ?? 3, faction);
                    // Add the raw IPG value (normalized for duration)
                    eliteBonus = minorResult.ipg * factionMultiplier;
                    eliteBonusDetails = ` + EliteBonus(${eliteBonus.toFixed(2)})`;
                }

                if (grandIPG + eliteBonus > 0) {
                    // Determine actual gold to assign based on available budget
                    // AGITATIONAL_NETWORKS: Allow 200g budget if resentment < 60
                    let minGoldRequired = 300;
                    if (hasAgitationalNetworks && resentment < 60) {
                        minGoldRequired = 200; // +200g bonus on arrival
                    }

                    let goldToAssign = minGoldRequired;
                    if (budget >= 500) goldToAssign = 500;
                    else if (budget >= 400) goldToAssign = 400;
                    // Ensure we assign at least the calculated minimum
                    else if (budget >= minGoldRequired) goldToAssign = minGoldRequired;

                    potentialAssignments.push({
                        leaderId: leader.id,
                        leaderName: leader.name,
                        role: AILeaderRole.CLANDESTINE,
                        targetId: enemy.id,
                        targetName: enemy.name,
                        ipg: applyDistancePenalty(grandIPG + eliteBonus, grandTravelTime),
                        missionType: 'MAJOR',
                        targetActionId: ClandestineActionId.PREPARE_GRAND_INSURRECTION,
                        goldRequired: goldToAssign, // Assign dynamic amount based on wealth/ability
                        travelTime: grandTravelTime,
                        details: `Grand @ ${enemy.name}: IPG=${grandIPG.toFixed(2)}${eliteBonusDetails}${managerGrandDetails} (Dist: ${grandTravelTime}) [Alloc: ${goldToAssign}g]`
                    });
                }

                // 3b. Incite Neutral (Major, budget based on discretion)
                const discretion = leader.stats?.discretion ?? 3;
                const neutralMinBudget = calculateNeutralMissionBudget(discretion);
                let neutralIPG = calculateNeutralIPG(enemy, ops, faction, discretion) * factionMultiplier;

                // MANAGER opportunity cost for Neutral Insurrection
                // Neutral duration = (threshold - 10) / 10 turns + 1 prep turn
                const neutralTravelTime = calculateLeaderTravelTime(leader.locationId || '', enemy.id, state.locations, state.roads);
                const threshold = getDetectionThreshold(discretion);
                const neutralActiveTurns = (threshold - 10) / 10 + 1; // +1 for prep
                let managerNeutralCost = 0;
                let managerNeutralDetails = '';
                if (hasManagerAbility && isInFriendlyCity) {
                    managerNeutralCost = calculateManagerOpportunityCost(neutralActiveTurns, neutralTravelTime);
                    const neutralIPGReduction = managerNeutralCost / neutralMinBudget;
                    neutralIPG = Math.max(0, neutralIPG - neutralIPGReduction);
                    managerNeutralDetails = ` [MGR-COST:${managerNeutralCost}]`;
                }

                // ELITE_NETWORKS applies to Neutral Insurrection too
                // "ELITE_NETWORKS augmente également la valeur des GRAND_INSURRECTION et INCITE_NEUTRAL"
                const totalNeutralIPG = neutralIPG + eliteBonus;

                if (totalNeutralIPG > 0) {
                    potentialAssignments.push({
                        leaderId: leader.id,
                        leaderName: leader.name,
                        role: AILeaderRole.CLANDESTINE,
                        targetId: enemy.id,
                        targetName: enemy.name,
                        ipg: applyDistancePenalty(totalNeutralIPG, neutralTravelTime),
                        missionType: 'MAJOR',
                        targetActionId: ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS,
                        goldRequired: neutralMinBudget,
                        travelTime: neutralTravelTime,
                        details: `Neutral @ ${enemy.name}: IPG=${neutralIPG.toFixed(2)}${eliteBonusDetails}${managerNeutralDetails} (Dist: ${neutralTravelTime})`
                    });
                }

                // 3c. Undermine (Minor)
                // Filter check: Is this target valid for minor mission given Elite Networks constraint?
                const isValidMinorTarget = validMinorTargets.some(t => t.id === enemy.id);

                if (isValidMinorTarget) {
                    // SCORCHED_EARTH leaders need 200g minimum to cover destructive actions
                    const hasScorchedEarth = leader.stats?.traits?.includes('SCORCHED_EARTH') ?? false;
                    const minorMinBudget = hasScorchedEarth ? 200 : 100;
                    const leaderDiscretion = leader.stats?.discretion ?? 3;

                    // Calculate travel time first (needed for MANAGER opportunity cost)
                    const travelTime = calculateLeaderTravelTime(leader.locationId || '', enemy.id, state.locations, state.roads);

                    // MANAGER opportunity cost: if leader is in a friendly CITY, account for lost gold production
                    const hasManagerAbility = leader.stats?.ability?.includes('MANAGER') ?? false;
                    const isInFriendlyCity = currentLoc &&
                        currentLoc.faction === faction &&
                        currentLoc.type === LocationType.CITY;

                    const managerOptions: ManagerOpportunityCostOptions | undefined = hasManagerAbility ? {
                        hasManagerAbility: true,
                        isInFriendlyLocation: !!isInFriendlyCity,
                        travelTurns: travelTime
                    } : undefined;

                    const minorResult = calculateMinorIPG(enemy, ops, faction, leaderDiscretion, faction, managerOptions);
                    const minorIPG = minorResult.ipg * factionMultiplier;

                    if (minorResult.ipg > 0) {
                        potentialAssignments.push({
                            leaderId: leader.id,
                            leaderName: leader.name,
                            role: AILeaderRole.CLANDESTINE,
                            targetId: enemy.id,
                            targetName: enemy.name,
                            ipg: applyDistancePenalty(minorIPG, travelTime),
                            missionType: 'MINOR',
                            targetActionId: ClandestineActionId.UNDERMINE_AUTHORITIES, // Default for minor, will pick up others too
                            goldRequired: minorMinBudget,
                            travelTime: travelTime,
                            details: `Minor @ ${enemy.name}: ${minorResult.details}${hasScorchedEarth ? ' [SCORCHED]' : ''}${hasManagerAbility && isInFriendlyCity ? ' [MGR-COST]' : ''} (Dist: ${travelTime})`
                        });
                    }
                }
            }
        }

        // 6. Commander
        if ((leader.stats?.commandBonus || 0) > 0) {
            const needyArmies = armies.filter(a =>
                a.faction === faction &&
                a.strength > 1000 &&
                a.locationId !== null && // Leaders can only travel to locations, not roads
                !state.characters.some(c => (c as any).assignedArmyId === a.id)
            );

            for (const army of needyArmies) {
                // Resolve army location name (handle both location and road-based armies)
                let armyLocationName = 'Unknown';
                if (army.locationId) {
                    const loc = state.locations.find(l => l.id === army.locationId);
                    armyLocationName = loc?.name || army.locationId;
                } else if (army.roadId) {
                    const road = state.roads.find(r => r.id === army.roadId);
                    if (road && army.stageIndex >= 0 && army.stageIndex < road.stages.length) {
                        armyLocationName = road.stages[army.stageIndex].name || `Road Stage ${army.stageIndex}`;
                    } else {
                        armyLocationName = `Road ${army.roadId}`;
                    }
                }

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

        // Check if leader is currently commanding an army - require +5 IPG to detach
        // (Skip this check for COMMANDER assignments - they're keeping the leader as commander)
        if (pa.role !== AILeaderRole.COMMANDER) {
            const currentCommanderIPG = commanderIPGs.get(pa.leaderId);
            if (currentCommanderIPG !== undefined && currentCommanderIPG > 0) {
                const requiredIPG = currentCommanderIPG + 5;
                if (pa.ipg < requiredIPG) {
                    console.log(`  [REJECTED] ${pa.leaderName} -> ${pa.role}: IPG ${pa.ipg.toFixed(2)} < commander ${currentCommanderIPG.toFixed(2)} + 5`);
                    continue;
                }
                // IPG is high enough - mark for detachment
                pendingDetachLeaders.add(pa.leaderId);
                console.log(`  [DETACH] ${pa.leaderName}: New mission IPG ${pa.ipg.toFixed(2)} >= commander ${currentCommanderIPG.toFixed(2)} + 5, will detach`);
            }
        }

        // ASSIGN!
        const shouldDetach = pendingDetachLeaders.has(pa.leaderId);
        assignments.push({
            leaderId: pa.leaderId,
            assignedRole: pa.role,
            targetLocationId: pa.role !== AILeaderRole.COMMANDER ? pa.targetId : undefined,
            targetArmyId: pa.role === AILeaderRole.COMMANDER ? pa.targetId : undefined,
            priority: Math.min(100, Math.floor(pa.ipg * 5)),
            reasoning: pa.details,
            assignedBudget: pa.role === AILeaderRole.CLANDESTINE ? pa.goldRequired : undefined,
            missionType: pa.missionType,
            targetActionId: pa.targetActionId,
            shouldDetachFromArmy: shouldDetach // New field for execution layer
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

    // =========================================================================
    // PHASE 2.5: MANAGER Rural-to-City Check
    // =========================================================================
    // MANAGER leaders in rural areas cannot generate their 20g/turn bonus.
    // If they would be IDLE and their linkedLocation is a friendly city, move them there.

    for (const leader of availableLeaders) {
        if (assignedLeaderIds.has(leader.id)) continue; // Already assigned

        const hasManagerAbility = leader.stats?.ability?.includes('MANAGER') ?? false;
        if (!hasManagerAbility) continue;

        const currentLoc = state.locations.find(l => l.id === leader.locationId);
        if (!currentLoc) continue;

        // Only process if leader is in a RURAL area controlled by their faction
        if (currentLoc.type !== LocationType.RURAL) continue;
        if (currentLoc.faction !== faction) continue;

        // Check if linkedLocation is a city controlled by our faction
        const linkedCity = currentLoc.linkedLocationId
            ? state.locations.find(l => l.id === currentLoc.linkedLocationId)
            : null;

        if (linkedCity && linkedCity.faction === faction && linkedCity.type === LocationType.CITY) {
            // Create an assignment to move to the linked city
            assignments.push({
                leaderId: leader.id,
                assignedRole: AILeaderRole.IDLE, // Will move, then be available
                targetLocationId: linkedCity.id,
                priority: 20, // Low priority but should still happen
                reasoning: `MANAGER ${leader.name} moving from rural ${currentLoc.name} to city ${linkedCity.name} for gold bonus`
            });
            assignedLeaderIds.add(leader.id);
            console.log(`  [MANAGER] ${leader.name}: Moving from rural ${currentLoc.name} to city ${linkedCity.name} (gold bonus)`);
        }
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
    // HUNT_NETWORKS: Enemy agent detected - but only if they represent a threat
    // Exception: Don't hunt agents with budget=0 AND detectionLevel < baseThreshold/2
    // (They can't do anything and HUNT_NETWORKS won't help catch them)
    const hasThreateningAgent = state.characters.some(c => {
        // Must be enemy agent UNDERCOVER in this location
        if (c.faction === faction || c.faction === FactionId.NEUTRAL) return false;
        if (c.status !== CharacterStatus.UNDERCOVER) return false;
        if (c.locationId !== location.id) return false;

        // Check if agent is threatening
        const budget = c.clandestineBudget || c.budget || 0;
        const detectionLevel = c.detectionLevel || 0;

        // Calculate base threshold: 20 + (10 × discretion)
        const discretion = c.stealthLevel ?? c.stats?.discretion ?? 2;
        const baseThreshold = 20 + (10 * discretion);
        const halfThreshold = Math.floor(baseThreshold / 2);

        // Non-threatening: budget=0 AND detectionLevel < halfThreshold
        if (budget === 0 && detectionLevel < halfThreshold) {
            console.log(`[AI HUNT_NETWORKS] Skipping ${c.name}: non-threatening (budget=${budget}, detection=${detectionLevel} < halfThreshold=${halfThreshold})`);
            return false;
        }

        return true; // Threatening agent
    });
    if (hasThreateningAgent) return GovernorPolicy.HUNT_NETWORKS;

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
