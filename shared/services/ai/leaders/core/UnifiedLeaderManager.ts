/**
 * Unified Leader Manager
 * 
 * Single entry point for AI leader management across both solo and multiplayer modes.
 * Uses IPG-based assignment system from UnifiedAssignmentService.
 * 
 * This replaces the legacy processLeaderAI function with a unified approach.
 * 
 * @module shared/services/ai/leaders/core
 */

import { GameState, FactionId, CharacterStatus, Character, Location, LocationType, RepublicanInternalFaction } from '../../../../types';
import { generateUnifiedAssignments, AssignmentContext } from './UnifiedAssignmentService';
import { processStrandedLeaders } from './StrandedLeaderService';
import { processClandestineAgent } from './ClandestineAgentProcessor';
import { analyzeTerritoryForGovernor } from '../roles/GovernorRole';
import { AILeaderRole, TerritoryStatus } from '../types';
import { GovernorPolicy } from '../../../../types/governorTypes';
import { ClandestineActionId } from '../../../../types/clandestineTypes';
import { executeSendUndercoverMission } from '../../../domain/politics/undercoverMission';
import { calculateLeaderTravelTime } from '../../../domain/leaders/leaderPathfinding';
import {
    processRepublicanInternalFaction,
    applyInternalFactionResult,
    INTERNAL_FACTION_MIN_TURN
} from '../recruitment/AIRepublicansInternalFactions';

// ============================================================================
// TYPES
// ============================================================================

export interface UnifiedLeaderResult {
    characters: Character[];
    locations: Location[];
    resources: any;
    chosenInternalFaction?: RepublicanInternalFaction;
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Manage leaders using unified IPG-based assignment.
 * 
 * This is the single entry point for AI leader management,
 * used by both solo (Application) and multiplayer (Server) modes.
 * 
 * @param state Current game state
 * @param faction Faction to process
 * @param clandestineBudget Available budget for clandestine operations
 * @param turn Current turn number
 * @returns Partial game state with updated characters and locations
 */
export function manageLeadersUnified(
    state: GameState,
    faction: FactionId,
    clandestineBudget: number = 0,
    turn: number = 1
): Partial<UnifiedLeaderResult> {
    console.log(`\n[AI UNIFIED ${faction}] === Turn ${turn} Leader Assignment ===`);
    console.log(`[AI UNIFIED ${faction}] Clandestine Budget: ${clandestineBudget}g`);

    // =========================================================================
    // PHASE 0: REPUBLICANS Internal Faction Decision (Turn 6+)
    // =========================================================================
    let workingState = state;
    if (faction === FactionId.REPUBLICANS && turn >= INTERNAL_FACTION_MIN_TURN && !state.chosenInternalFaction) {
        console.log(`[AI UNIFIED ${faction}] Processing Internal Faction decision...`);
        const internalFactionResult = processRepublicanInternalFaction(state, faction, turn);

        if (internalFactionResult.choiceMade) {
            workingState = applyInternalFactionResult(state, internalFactionResult);
            console.log(`[AI UNIFIED ${faction}] Chose: ${internalFactionResult.chosenOption} (cost: ${internalFactionResult.goldCost}g)`);
        } else if (internalFactionResult.inSavingsMode) {
            console.log(`[AI UNIFIED ${faction}] Saving for ${internalFactionResult.savingsTarget}`);
        } else {
            console.log(`[AI UNIFIED ${faction}] No internal faction conditions met yet`);
        }
    }

    // Prepare context
    const context: AssignmentContext = {
        state: workingState,
        faction,
        budget: clandestineBudget,
        turn,
        isCampaignActive: detectActiveCampaign(workingState, faction)
    };

    // =========================================================================
    // PHASE 0.5: Stranded Leader Evacuation
    // =========================================================================
    const strandedResult = processStrandedLeaders(workingState, faction);
    if (strandedResult.evacuatedLeaderIds.length > 0) {
        console.log(`[AI UNIFIED ${faction}] Stranded leaders evacuated: ${strandedResult.evacuatedLeaderIds.length}`);
        for (const log of strandedResult.logs) {
            console.log(`[AI UNIFIED ${faction}] ${log}`);
        }
        workingState = {
            ...workingState,
            characters: strandedResult.updatedCharacters
        };
    }

    // =========================================================================
    // PHASE 1: Analyze Territories
    // =========================================================================
    const ownedLocations = workingState.locations.filter(l => l.faction === faction);
    const territories: TerritoryStatus[] = ownedLocations.map(location =>
        analyzeTerritoryForGovernor(
            location,
            workingState.characters,
            faction,
            getGarrisonStrength(workingState, location.id, faction),
            workingState.logs || []
        )
    );

    console.log(`[AI UNIFIED ${faction}] Owned territories: ${ownedLocations.map(l => l.name).join(', ')} (${ownedLocations.length} total)`);

    const enemyLocations = workingState.locations.filter(l =>
        l.faction !== faction && l.faction !== FactionId.NEUTRAL
    );

    // =========================================================================
    // PHASE 2: Generate Unified Assignments
    // =========================================================================
    const assignments = generateUnifiedAssignments(
        context,
        territories,
        enemyLocations,
        workingState.armies
    );

    console.log(`[AI UNIFIED ${faction}] Generated ${assignments.length} assignments`);

    // =========================================================================
    // PHASE 3: Execute Assignments
    // =========================================================================
    let updatedCharacters = [...workingState.characters];
    let updatedLocations = [...workingState.locations];
    let updatedResources = { ...workingState.resources, [faction]: { ...workingState.resources[faction] } };

    const assignedGovernorLocations = new Set<string>();
    
    // Build set of owned territory IDs for validation
    const ownedTerritoryIds = new Set(ownedLocations.map(l => l.id));

    // =========================================================================
    // PHASE 3.0: Validate existing GOVERNING leaders
    // =========================================================================
    // FIX: Detect governors in enemy territory and reset their status
    for (let i = 0; i < updatedCharacters.length; i++) {
        const leader = updatedCharacters[i];
        if (leader.faction !== faction) continue;
        if (leader.status !== CharacterStatus.GOVERNING) continue;
        if (!leader.locationId) continue;
        
        // FIX #1: Check if location is still controlled by leader's faction
        if (!ownedTerritoryIds.has(leader.locationId)) {
            console.log(`[AI GOVERNOR FIX] ${leader.name}: Location ${leader.locationId} no longer friendly - resetting status for evacuation`);
            updatedCharacters[i] = {
                ...leader,
                status: CharacterStatus.AVAILABLE,
                activeGovernorPolicies: []
            };
            continue;
        }
        
        // FIX #2: Check uniqueness - only one governor per location
        if (assignedGovernorLocations.has(leader.locationId)) {
            console.log(`[AI GOVERNOR FIX] ${leader.name}: Duplicate governor at ${leader.locationId} - demoting to AVAILABLE`);
            updatedCharacters[i] = {
                ...leader,
                status: CharacterStatus.AVAILABLE,
                activeGovernorPolicies: []
            };
            continue;
        }
        
        // Valid governor - track location
        assignedGovernorLocations.add(leader.locationId);
    }

    // PHASE A: Process existing UNDERCOVER agents
    const clandestineLogs: string[] = [];

    for (let i = 0; i < updatedCharacters.length; i++) {
        const leader = updatedCharacters[i];
        if (leader.faction !== faction) continue;
        if (leader.status !== CharacterStatus.UNDERCOVER) continue;
        if ((leader.clandestineBudget || 0) <= 0) continue;

        console.log(`[AI UNIFIED ${faction}] Processing UNDERCOVER agent ${leader.name}`);
        const result = processClandestineAgent(
            leader,
            updatedLocations,
            state.armies,
            turn,
            faction,
            clandestineLogs,
            updatedCharacters
        );
        updatedCharacters[i] = result.character;
    }

    for (const log of clandestineLogs) {
        console.log(`[AI UNIFIED ${faction}] ${log}`);
    }

    // PHASE B: Execute role assignments
    for (const assignment of assignments) {
        const charIndex = updatedCharacters.findIndex(c => c.id === assignment.leaderId);
        if (charIndex === -1) continue;

        let leader = updatedCharacters[charIndex];

        // Detach from army if marked
        if (assignment.shouldDetachFromArmy) {
            console.log(`[AI UNIFIED] ${leader.name}: Detaching from army (0% combat or better mission found)`);
            leader = {
                ...leader,
                armyId: null
            };
            (leader as any).assignedArmyId = undefined;
            updatedCharacters[charIndex] = leader;
        }

        switch (assignment.assignedRole) {
            case AILeaderRole.GOVERNOR:
            case AILeaderRole.STABILIZER: {
                const targetLocId = assignment.targetLocationId || leader.locationId || '';
                if (assignedGovernorLocations.has(targetLocId)) {
                    console.log(`[AI UNIFIED] ${leader.name}: SKIPPED - ${targetLocId} already has governor`);
                    break;
                }
                executeGovernorAssignment(
                    leader,
                    targetLocId,
                    updatedCharacters,
                    updatedLocations,
                    workingState,
                    charIndex
                );
                assignedGovernorLocations.add(targetLocId);
                break;
            }

            case AILeaderRole.CLANDESTINE:
                executeClandestineAssignment(
                    leader,
                    assignment.targetLocationId || '',
                    updatedCharacters,
                    updatedLocations,
                    updatedResources,
                    workingState,
                    faction,
                    charIndex,
                    assignment.assignedBudget,
                    assignment.targetActionId
                );
                break;

            case AILeaderRole.COMMANDER:
                executeCommanderAssignment(
                    leader,
                    assignment.targetArmyId || '',
                    updatedCharacters,
                    workingState,
                    charIndex
                );
                break;

            case AILeaderRole.IDLE:
                // FIX: Check that location doesn't already have a governor
                if (leader.locationId && ownedLocations.some(l => l.id === leader.locationId)) {
                    if (assignedGovernorLocations.has(leader.locationId)) {
                        console.log(`[AI UNIFIED ${faction}] ${leader.name}: IDLE - location ${leader.locationId} already has governor`);
                        break;
                    }
                    if (leader.status !== CharacterStatus.GOVERNING) {
                        (updatedCharacters[charIndex] as any) = {
                            ...leader,
                            status: CharacterStatus.GOVERNING,
                            activeGovernorPolicies: []
                        };
                        assignedGovernorLocations.add(leader.locationId);
                        console.log(`[AI UNIFIED ${faction}] ${leader.name}: Fallback Governor at ${leader.locationId}`);
                    }
                }
                break;
        }
    }

    return {
        characters: updatedCharacters,
        locations: updatedLocations,
        resources: updatedResources,
        chosenInternalFaction: workingState.chosenInternalFaction
    };
}

// ============================================================================
// ASSIGNMENT EXECUTION
// ============================================================================

function executeGovernorAssignment(
    leader: Character,
    targetLocationId: string,
    characters: Character[],
    locations: Location[],
    state: GameState,
    charIndex: number
): void {
    if (leader.locationId === targetLocationId) {
        const policies = selectGovernorPolicies(leader, targetLocationId, state);
        characters[charIndex] = {
            ...leader,
            status: CharacterStatus.GOVERNING,
            activeGovernorPolicies: policies
        } as Character;

        const locationIdx = locations.findIndex(l => l.id === targetLocationId);
        if (locationIdx !== -1) {
            const location = locations[locationIdx];
            const newGovernorPolicies: Partial<Record<GovernorPolicy, boolean>> = {};

            for (const policy of policies) {
                newGovernorPolicies[policy] = true;
            }

            locations[locationIdx] = {
                ...location,
                governorPolicies: newGovernorPolicies
            };

            if (policies.length > 0) {
                console.log(`[AI UNIFIED] ${leader.name}: GOVERNING at ${targetLocationId} with policies: ${policies.join(', ')}`);
            } else {
                console.log(`[AI UNIFIED] ${leader.name}: GOVERNING at ${targetLocationId}`);
            }
        }
    } else {
        const currentLoc = state.locations.find(l => l.id === leader.locationId);
        const isLinkedLocation = currentLoc?.linkedLocationId === targetLocationId;

        if (isLinkedLocation) {
            const policies = selectGovernorPolicies(leader, targetLocationId, state);
            characters[charIndex] = {
                ...leader,
                status: CharacterStatus.GOVERNING,
                locationId: targetLocationId,
                activeGovernorPolicies: policies
            } as Character;

            const locationIdx = locations.findIndex(l => l.id === targetLocationId);
            if (locationIdx !== -1) {
                const location = locations[locationIdx];
                const newGovernorPolicies: Partial<Record<GovernorPolicy, boolean>> = {};
                for (const policy of policies) {
                    newGovernorPolicies[policy] = true;
                }
                locations[locationIdx] = {
                    ...location,
                    governorPolicies: newGovernorPolicies
                };
            }

            console.log(`[AI UNIFIED] ${leader.name}: GOVERNING at ${targetLocationId} (linked)`);
        } else {
            const travelTime = calculateLeaderTravelTime(
                leader.locationId || '',
                targetLocationId,
                state.locations,
                state.roads
            );

            if (travelTime > 0 && travelTime < 999) {
                characters[charIndex] = {
                    ...leader,
                    status: CharacterStatus.MOVING,
                    destinationId: targetLocationId,
                    turnsUntilArrival: travelTime
                } as Character;
                console.log(`[AI UNIFIED] ${leader.name}: Moving to ${targetLocationId} (${travelTime} turns)`);
            }
        }
    }
}

function executeClandestineAssignment(
    leader: Character,
    targetLocationId: string,
    characters: Character[],
    locations: Location[],
    resources: any,
    state: GameState,
    faction: FactionId,
    charIndex: number,
    budgetOverride?: number,
    targetActionId?: ClandestineActionId
): void {
    const maxAvailable = resources[faction]?.gold || 0;
    const budgetToAllocate = budgetOverride
        ? Math.min(budgetOverride, maxAvailable)
        : Math.min(400, maxAvailable);

    if (budgetToAllocate < 100) {
        console.log(`[AI UNIFIED] ${leader.name}: Insufficient budget for clandestine (${budgetToAllocate}g)`);
        return;
    }

    const tempState: GameState = {
        ...state,
        characters,
        locations,
        resources
    };

    const result = executeSendUndercoverMission(
        tempState,
        targetLocationId,
        leader.id,
        budgetToAllocate,
        faction
    );

    if (result.success && result.newState) {
        const updatedLeader = result.newState.characters?.find(c => c.id === leader.id);
        if (updatedLeader) {
            if (targetActionId) {
                updatedLeader.plannedMissionAction = targetActionId;
            }
            characters[charIndex] = updatedLeader;
            console.log(`[AI UNIFIED] ${leader.name}: Dispatched to ${targetLocationId} (${budgetToAllocate}g) [Plan: ${targetActionId || 'Generic'}]`);
        }

        if (result.newState.resources) {
            Object.assign(resources, result.newState.resources);
        }
    } else {
        console.log(`[AI UNIFIED] ${leader.name}: Failed to dispatch - ${result.error}`);
    }
}

function executeCommanderAssignment(
    leader: Character,
    targetArmyId: string,
    characters: Character[],
    state: GameState,
    charIndex: number
): void {
    const army = state.armies.find(a => a.id === targetArmyId);
    if (!army) return;

    if (leader.locationId === army.locationId) {
        characters[charIndex] = {
            ...leader,
            assignedArmyId: targetArmyId,
            status: CharacterStatus.AVAILABLE
        } as Character;
        console.log(`[AI UNIFIED] ${leader.name}: COMMANDER of Army ${targetArmyId}`);
    } else {
        const travelTime = calculateLeaderTravelTime(
            leader.locationId || '',
            army.locationId || '',
            state.locations,
            state.roads
        );

        if (travelTime > 0 && travelTime < 999) {
            characters[charIndex] = {
                ...leader,
                status: CharacterStatus.MOVING,
                destinationId: army.locationId,
                turnsUntilArrival: travelTime
            } as Character;
            console.log(`[AI UNIFIED] ${leader.name}: Moving to Army at ${army.locationId} (${travelTime} turns)`);
        }
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function detectActiveCampaign(state: GameState, faction: FactionId): boolean {
    const missions = state.aiState?.[faction]?.missions || [];
    return missions.some(m =>
        m.type === 'CAMPAIGN' &&
        ['GATHERING', 'MOVING', 'SIEGING', 'ASSAULTING'].includes(m.stage)
    );
}

function getGarrisonStrength(state: GameState, locationId: string, faction: FactionId): number {
    return state.armies
        .filter(a => a.locationId === locationId && a.faction === faction)
        .reduce((sum, a) => sum + a.strength, 0);
}

function selectGovernorPolicies(
    leader: Character,
    locationId: string,
    state: GameState
): GovernorPolicy[] {
    const location = state.locations.find(l => l.id === locationId);
    if (!location) return [];

    const policies: GovernorPolicy[] = [];
    const isManOfChurch = leader.stats?.ability?.includes('MAN_OF_CHURCH') || false;

    // Check for enemy agents (HUNT_NETWORKS)
    const hasEnemyAgent = state.characters.some(c =>
        c.faction !== leader.faction &&
        c.faction !== FactionId.NEUTRAL &&
        c.status === CharacterStatus.UNDERCOVER &&
        c.locationId === locationId
    );

    if (hasEnemyAgent) {
        policies.push(GovernorPolicy.HUNT_NETWORKS);
        return policies;
    }

    // Stability check
    if (isManOfChurch || location.stability < 70 || (leader.stats?.stabilityPerTurn || 0) < 0) {
        policies.push(GovernorPolicy.STABILIZE_REGION);
    }

    // Appease minds
    const hasPositiveFoodFlow = (location.foodIncome || 0) > 0;
    if (hasPositiveFoodFlow && location.stability < 50) {
        if (isManOfChurch || policies.includes(GovernorPolicy.STABILIZE_REGION)) {
            policies.push(GovernorPolicy.APPEASE_MINDS);
        }
    }

    // MAN_OF_CHURCH bonuses
    if (isManOfChurch) {
        policies.push(GovernorPolicy.DENOUNCE_ENEMIES);
    } else if (location.stability < 40) {
        policies.push(GovernorPolicy.DENOUNCE_ENEMIES);
    }

    // Fallback
    if (policies.length === 0) {
        policies.push(GovernorPolicy.IMPROVE_ECONOMY);
    }

    return policies;
}
