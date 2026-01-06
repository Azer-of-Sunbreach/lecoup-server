/**
 * Leader AI Processor - Main Orchestrator
 * 
 * Central processing unit for AI leader decisions.
 * Coordinates analysis, role assignment, and decision execution.
 * 
 * @module shared/services/ai/leaders/core
 */

import { GameState, FactionId, Character, Location, Army, CharacterStatus } from '../../../../types';
import { LeaderStateManager } from './LeaderStateManager';
import { AILogger } from './AILogger';
import {
    AILeaderRole,
    RoleAssignment,
    AILeaderProcessingResult,
    TerritoryStatus,
    ClandestineOpportunity,
    STABILITY_THRESHOLDS
} from '../types';
import { getStrategyForFaction } from '../strategies/factionStrategy';
import { makeGovernorDecisions, analyzeTerritoryForGovernor } from '../roles/GovernorRole';
import { makeClandestineDecisions, evaluateClandestineOpportunity } from '../roles/ClandestineRole';
import { getLeaderProfile, getRolePriority, isLeaderVIP } from '../utils/LeaderProfiles';
import { GovernorPolicy } from '../../../../types/governorTypes';
import { ClandestineActionId } from '../../../../types/clandestineTypes';
import { processUndercoverMissionTravel, calculateLeaderTravelTime } from '../../../domain/leaders/leaderPathfinding';
import { processClandestineAgent } from './ClandestineAgentProcessor';

// ============================================================================
// MAIN PROCESSING FUNCTION
// ============================================================================

/**
 * Process AI decisions for all leaders of a faction.
 * Entry point for the AI leader system.
 */
export function processLeaderAI(
    state: GameState,
    faction: FactionId,
    turn: number,
    debugMode: boolean = false
): AILeaderProcessingResult {
    const logger = new AILogger(turn, faction, debugMode);
    const stateManager = new LeaderStateManager(state.characters, state.locations);
    const strategy = getStrategyForFaction(faction);

    // =========================================================================
    // PHASE 0: Process Ongoing Travel (Realistic Travel)
    // =========================================================================
    // Advance traveling undercover agents and update their positions
    const travelResult = processUndercoverMissionTravel(
        stateManager.getUpdatedCharacters(),
        stateManager.getUpdatedLocations(),
        state.armies,
        turn
    );

    // Sync travel results back into state manager
    for (const updatedChar of travelResult.characters) {
        stateManager.updateCharacter(updatedChar);
    }
    for (const log of travelResult.logs) {
        logger.logEvent('SYSTEM', 'Travel', typeof log === 'string' ? log : log.message);
    }

    // 1. Normalize budgets for all leaders (fix starting agents)
    normalizeAllBudgets(stateManager, faction);

    // =========================================================================
    // PHASE 1.5: Process Existing UNDERCOVER Agents
    // =========================================================================
    // This ensures UNDERCOVER agents with budget > 0 take actions each turn
    const allCharacters = stateManager.getUpdatedCharacters();
    const undercoverAgents = allCharacters.filter(c =>
        c.faction === faction &&
        c.status === CharacterStatus.UNDERCOVER &&
        (c.clandestineBudget || 0) > 0
    );

    const clandestineLogs: string[] = [];
    for (const agent of undercoverAgents) {
        console.log(`[AI LEADER ${faction}] Processing UNDERCOVER agent ${agent.name}`);
        const result = processClandestineAgent(
            agent,
            stateManager.getUpdatedLocations(),
            state.armies,
            turn,
            faction,
            clandestineLogs,
            allCharacters
        );
        stateManager.updateCharacter(result.character);
    }

    // Log clandestine activity
    for (const log of clandestineLogs) {
        logger.logEvent('SYSTEM', 'Clandestine', log);
    }

    // 2. Analyze all territories
    const ownedTerritories = analyzeOwnedTerritories(
        stateManager,
        state.armies,
        faction,
        state.logs || []
    );

    // 2.5 Detect and evacuate stranded leaders in enemy/neutral territory
    const ownedTerritoryIds = new Set(ownedTerritories.map(t => t.location.id));
    const allFactionLeaders = stateManager.getAvailableLeaders(faction);

    // DEBUG: Log all available leaders and their locations
    console.log(`[AI LEADER ${faction}] === STRANDED LEADER CHECK ===`);
    console.log(`[AI LEADER ${faction}] Owned territory IDs: ${Array.from(ownedTerritoryIds).join(', ')}`);
    console.log(`[AI LEADER ${faction}] All available leaders (${allFactionLeaders.length}):`);
    for (const leader of allFactionLeaders) {
        const inOwned = ownedTerritoryIds.has(leader.locationId || '');
        console.log(`[AI LEADER ${faction}]   - ${leader.name}: status=${leader.status}, location=${leader.locationId}, inOwned=${inOwned}, budget=${leader.clandestineBudget || 0}`);
    }

    const strandedLeaders = detectStrandedLeaders(allFactionLeaders, ownedTerritoryIds, faction);
    console.log(`[AI LEADER ${faction}] Stranded leaders detected: ${strandedLeaders.length}`);
    for (const leader of strandedLeaders) {
        console.log(`[AI LEADER ${faction}]   -> STRANDED: ${leader.name} at ${leader.locationId}`);
    }

    if (strandedLeaders.length > 0) {
        logger.logEvent('SYSTEM', 'Stranded Leaders', `Found ${strandedLeaders.length} stranded leaders - initiating evacuation`);
        handleStrandedLeaders(strandedLeaders, ownedTerritories, stateManager, state, turn, logger);
    }

    // 3. Find clandestine opportunities
    const opportunities = findClandestineOpportunities(
        stateManager,
        state.armies,
        faction
    );

    // 4. Get available leaders and assign roles
    const leaders = stateManager.getAvailableLeaders(faction);
    const roleAssignments = assignRoles(
        leaders,
        ownedTerritories,
        opportunities,
        strategy,
        stateManager
    );

    // 5. Execute decisions for each role
    const result: AILeaderProcessingResult = {
        updatedCharacters: [],
        updatedLocations: [],
        decisions: {
            roleAssignments: [],
            governorDecisions: [],
            clandestineDecisions: [],
            commanderDecisions: []
        },
        logs: []
    };

    for (const assignment of roleAssignments) {
        const leader = stateManager.getCharacter(assignment.leaderId);
        if (!leader) continue;

        logger.logRoleAssignment(
            leader.id,
            leader.name,
            assignment.assignedRole,
            assignment.targetLocationId,
            assignment.reasoning
        );

        switch (assignment.assignedRole) {
            case AILeaderRole.GOVERNOR:
            case AILeaderRole.STABILIZER:
                executeGovernorRole(
                    leader,
                    assignment,
                    ownedTerritories,
                    strategy,
                    stateManager,
                    state,
                    logger,
                    result
                );
                break;

            case AILeaderRole.CLANDESTINE:
                executeClandestineRole(
                    leader,
                    assignment,
                    opportunities,
                    strategy,
                    stateManager,
                    state,
                    turn,
                    logger,
                    result
                );
                break;

            case AILeaderRole.PROTECTOR:
                executeProtectorRole(
                    leader,
                    assignment,
                    ownedTerritories,
                    stateManager,
                    logger
                );
                break;

            case AILeaderRole.COMMANDER:
                // Commander logic - for now, just log
                logger.logEvent(leader.id, leader.name, 'COMMANDER role - army management TBD');
                break;

            case AILeaderRole.IDLE:
                // If idle and at a friendly location, become fallback governor
                handleIdleLeader(leader, ownedTerritories, stateManager, logger);
                break;
        }

        result.decisions.roleAssignments.push(assignment);
    }

    // 6. Compile results
    result.updatedCharacters = stateManager.getUpdatedCharacters();
    result.updatedLocations = stateManager.getUpdatedLocations();
    result.logs = logger.getLogs();

    return result;
}

// ============================================================================
// BUDGET NORMALIZATION
// ============================================================================

/**
 * Normalize budgets for all leaders of a faction.
 * Converts legacy `budget` field to `clandestineBudget`.
 */
function normalizeAllBudgets(stateManager: LeaderStateManager, faction: FactionId): void {
    const agents = stateManager.getUndercoverAgents(faction);
    for (const agent of agents) {
        stateManager.normalizeBudget(agent.id);
    }
}

// ============================================================================
// STRANDED LEADER HANDLING
// ============================================================================

/**
 * Detect leaders stranded in non-friendly territory.
 * 
 * Excludes:
 * - Leaders with MOVING status (already traveling)
 * - Leaders with ON_MISSION status (preparing grand insurrection)
 * - UNDERCOVER leaders with clandestineBudget > 0 (actively operating)
 */
function detectStrandedLeaders(
    leaders: Character[],
    ownedTerritoryIds: Set<string>,
    faction: FactionId
): Character[] {
    return leaders.filter(leader => {
        // Skip if not in a location
        if (!leader.locationId) return false;

        // Skip if already moving
        if (leader.status === CharacterStatus.MOVING) return false;

        // Skip if on mission (e.g., preparing grand insurrection)
        if ((leader.status as any) === 'ON_MISSION') return false;

        // Skip if UNDERCOVER with active budget
        if (leader.status === CharacterStatus.UNDERCOVER &&
            (leader.clandestineBudget || 0) > 0) return false;

        // Check if location is NOT in owned territories
        return !ownedTerritoryIds.has(leader.locationId);
    });
}

/**
 * Handle stranded leaders by evacuating them to nearest friendly territory.
 * Uses existing pathfinding system.
 */
function handleStrandedLeaders(
    strandedLeaders: Character[],
    territories: TerritoryStatus[],
    stateManager: LeaderStateManager,
    state: GameState,
    turn: number,
    logger: AILogger
): void {
    if (strandedLeaders.length === 0) return;

    const locations = stateManager.getUpdatedLocations();
    const roads = state.roads;

    // Get list of friendly territory IDs with priority scoring
    const friendlyTargets: { locationId: string; priority: number; name: string }[] = [];

    for (const territory of territories) {
        let priority = 10; // Base priority

        // Higher priority for territories needing a governor
        if (territory.needsGovernor) priority += 30;

        // Higher priority for low stability territories
        if (territory.stability < 50) priority += 20;
        if (territory.stability < 30) priority += 20;

        // Higher priority for cities
        if (territory.location.type === 'CITY') priority += 10;

        friendlyTargets.push({
            locationId: territory.location.id,
            priority,
            name: territory.location.name
        });
    }

    // Sort by priority descending
    friendlyTargets.sort((a, b) => b.priority - a.priority);

    for (const leader of strandedLeaders) {
        if (!leader.locationId) continue;

        // Find best destination considering both priority and travel time
        let bestTarget: { locationId: string; name: string; travelTime: number } | null = null;
        let bestScore = -Infinity;

        for (const target of friendlyTargets) {
            const travelTime = calculateLeaderTravelTime(
                leader.locationId,
                target.locationId,
                locations,
                roads
            );

            if (travelTime >= 999) continue; // Unreachable

            // Score = priority - travel time penalty
            const score = target.priority - (travelTime * 5);

            if (score > bestScore) {
                bestScore = score;
                bestTarget = {
                    locationId: target.locationId,
                    name: target.name,
                    travelTime
                };
            }
        }

        if (bestTarget && bestTarget.travelTime > 0) {
            // Start evacuation using existing movement system
            stateManager.startMovement(leader.id, bestTarget.locationId, bestTarget.travelTime, turn);

            logger.logEvent(
                leader.id,
                leader.name,
                `EVACUATING from enemy territory to ${bestTarget.name} (${bestTarget.travelTime} turns)`
            );
        } else if (bestTarget && bestTarget.travelTime === 0) {
            // Instant arrival (adjacent location) - just update status to AVAILABLE at destination
            const updatedLeader = {
                ...leader,
                locationId: bestTarget.locationId,
                status: CharacterStatus.AVAILABLE
            };
            stateManager.updateCharacter(updatedLeader);

            logger.logEvent(
                leader.id,
                leader.name,
                `Fled to nearby ${bestTarget.name}`
            );
        }
    }
}

// ============================================================================
// TERRITORY ANALYSIS
// ============================================================================

/**
 * Analyze all territories owned by a faction.
 */
function analyzeOwnedTerritories(
    stateManager: LeaderStateManager,
    armies: Army[],
    faction: FactionId,
    logs: { message: string; turn: number; baseSeverity: string }[]
): TerritoryStatus[] {
    const territories: TerritoryStatus[] = [];
    const ownedLocations = stateManager.getFactionLocations(faction);
    const allCharacters = stateManager.getUpdatedCharacters();

    for (const location of ownedLocations) {
        const garrison = armies
            .filter(a => a.locationId === location.id && a.faction === faction)
            .reduce((sum, a) => sum + a.strength, 0);

        const status = analyzeTerritoryForGovernor(
            location,
            allCharacters,
            faction,
            garrison,
            logs
        );

        territories.push(status);
    }

    // Sort by urgency (critical stability first)
    territories.sort((a, b) => a.stability - b.stability);

    return territories;
}

// ============================================================================
// CLANDESTINE OPPORTUNITIES
// ============================================================================

/**
 * Find and evaluate clandestine opportunities in enemy territory.
 */
function findClandestineOpportunities(
    stateManager: LeaderStateManager,
    armies: Army[],
    faction: FactionId
): ClandestineOpportunity[] {
    const opportunities: ClandestineOpportunity[] = [];
    const enemyLocations = stateManager.getEnemyLocations(faction);
    const allCharacters = stateManager.getUpdatedCharacters();
    const agents = stateManager.getUndercoverAgents(faction);

    // Get best agent for evaluation (or a dummy for now)
    const evaluationAgent = agents[0] || allCharacters.find(c => c.faction === faction && !c.isDead);
    if (!evaluationAgent) return opportunities;

    for (const location of enemyLocations) {
        const opportunity = evaluateClandestineOpportunity(
            location,
            evaluationAgent,
            armies,
            allCharacters,
            faction
        );

        if (opportunity.score > 0) {
            opportunities.push(opportunity);
        }
    }

    // Sort by score (best opportunities first)
    opportunities.sort((a, b) => b.score - a.score);

    return opportunities;
}

// ============================================================================
// ROLE ASSIGNMENT
// ============================================================================

/**
 * Assign roles to all available leaders.
 */
function assignRoles(
    leaders: Character[],
    territories: TerritoryStatus[],
    opportunities: ClandestineOpportunity[],
    strategy: any,
    stateManager: LeaderStateManager
): RoleAssignment[] {
    const assignments: RoleAssignment[] = [];
    const assignedLeaderIds = new Set<string>();
    const assignedGovernorLocations = new Set<string>();
    const assignedClandestineLocations = new Set<string>();

    // Phase 0: Handle leaders ALREADY in a role (GOVERNING, UNDERCOVER)
    // These should NOT be reassigned - they continue their current mission
    for (const leader of leaders) {
        if (leader.status === CharacterStatus.GOVERNING) {
            // Already governing - mark as assigned and track location
            assignments.push({
                leaderId: leader.id,
                assignedRole: AILeaderRole.GOVERNOR,
                targetLocationId: leader.locationId,
                priority: 100,
                reasoning: 'Continue governing current territory'
            });
            assignedLeaderIds.add(leader.id);
            if (leader.locationId) {
                assignedGovernorLocations.add(leader.locationId);
            }
        } else if (leader.status === CharacterStatus.UNDERCOVER) {
            // Already undercover - continue mission
            assignments.push({
                leaderId: leader.id,
                assignedRole: AILeaderRole.CLANDESTINE,
                targetLocationId: leader.locationId,
                priority: 100,
                reasoning: 'Continue undercover mission'
            });
            assignedLeaderIds.add(leader.id);
            if (leader.locationId) {
                assignedClandestineLocations.add(leader.locationId);
            }
        }
    }


    // Phase 2: Assign STABILIZERS to critical territories
    const criticalTerritories = territories.filter(t => t.stability < STABILITY_THRESHOLDS.CRITICAL);
    for (const territory of criticalTerritories) {
        const stabilizer = findBestLeaderForRole(
            leaders,
            AILeaderRole.STABILIZER,
            assignedLeaderIds,
            territory.location.id,
            stateManager
        );

        if (stabilizer) {
            assignments.push({
                leaderId: stabilizer.id,
                assignedRole: AILeaderRole.STABILIZER,
                targetLocationId: territory.location.id,
                priority: 95,
                reasoning: `Critical stability at ${territory.location.name} (${territory.stability}%)`
            });
            assignedLeaderIds.add(stabilizer.id);
            assignedGovernorLocations.add(territory.location.id);
        }
    }

    // Phase 3: Assign PROTECTORS to high-risk territories
    for (const territory of territories) {
        if (territory.needsProtector && territory.stability < STABILITY_THRESHOLDS.LOW) {
            const protector = findBestLeaderForRole(
                leaders,
                AILeaderRole.PROTECTOR,
                assignedLeaderIds,
                territory.location.id,
                stateManager
            );

            if (protector) {
                assignments.push({
                    leaderId: protector.id,
                    assignedRole: AILeaderRole.PROTECTOR,
                    targetLocationId: territory.location.id,
                    priority: 90,
                    reasoning: `Protect ${territory.location.name} from enemy insurrection`
                });
                assignedLeaderIds.add(protector.id);
            }
        }
    }

    // Phase 4: Assign GOVERNORS to territories that need them
    for (const territory of territories) {
        if (territory.needsGovernor && !assignedGovernorLocations.has(territory.location.id)) {
            const governor = findBestLeaderForRole(
                leaders,
                AILeaderRole.GOVERNOR,
                assignedLeaderIds,
                territory.location.id,
                stateManager
            );

            if (governor) {
                assignments.push({
                    leaderId: governor.id,
                    assignedRole: AILeaderRole.GOVERNOR,
                    targetLocationId: territory.location.id,
                    priority: 80,
                    reasoning: `Govern ${territory.location.name}`
                });
                assignedLeaderIds.add(governor.id);
                assignedGovernorLocations.add(territory.location.id);
            }
        }
    }

    // Phase 5: Assign CLANDESTINE agents to best opportunities
    for (const opportunity of opportunities.slice(0, 3)) { // Top 3 opportunities
        if (assignedClandestineLocations.has(opportunity.locationId)) continue;
        if (opportunity.blockedByLegendary) continue;

        const agent = findBestLeaderForRole(
            leaders,
            AILeaderRole.CLANDESTINE,
            assignedLeaderIds,
            opportunity.locationId,
            stateManager
        );

        if (agent) {
            assignments.push({
                leaderId: agent.id,
                assignedRole: AILeaderRole.CLANDESTINE,
                targetLocationId: opportunity.locationId,
                priority: 70 + Math.min(30, opportunity.score / 5),
                reasoning: `Infiltrate ${opportunity.locationName} - ${opportunity.estimatedInsurgents} insurgents potential`
            });
            assignedLeaderIds.add(agent.id);
            assignedClandestineLocations.add(opportunity.locationId);
        }
    }

    // Phase 6: Remaining leaders become IDLE (will be assigned fallback governor)
    for (const leader of leaders) {
        if (!assignedLeaderIds.has(leader.id)) {
            assignments.push({
                leaderId: leader.id,
                assignedRole: AILeaderRole.IDLE,
                targetLocationId: leader.locationId,
                priority: 10,
                reasoning: 'No priority assignment - fallback to local governance'
            });
        }
    }

    return assignments.sort((a, b) => b.priority - a.priority);
}

/**
 * Find the best leader for a specific role.
 */
function findBestLeaderForRole(
    leaders: Character[],
    role: AILeaderRole,
    alreadyAssigned: Set<string>,
    targetLocationId: string,
    stateManager: LeaderStateManager
): Character | null {
    const available = leaders.filter(l => !alreadyAssigned.has(l.id));
    if (available.length === 0) return null;

    let bestLeader: Character | null = null;
    let bestScore = -Infinity;

    for (const leader of available) {
        let score = 0;

        // Role priority from profile
        const rolePriority = getRolePriority(leader.id.toLowerCase().replace(/\s+/g, '_'), role);
        if (rolePriority === 0) {
            score -= 50; // Not recommended role
        } else {
            score += (5 - rolePriority) * 20; // Primary = 80, Secondary = 60, etc.
        }

        // Already at target location bonus
        if (leader.locationId === targetLocationId) {
            score += 40;
        }

        // VIP penalty for clandestine
        if (role === AILeaderRole.CLANDESTINE && isLeaderVIP(leader.id)) {
            score -= 100; // Heavy penalty
        }

        // Stat bonuses for specific roles
        if (role === AILeaderRole.GOVERNOR) {
            // Statesmanship is CRITICAL for governors - weight heavily
            // Inept (1) = -30, Poor (2) = -15, Average (3) = 0, Good (4) = +15, Excellent (5) = +30
            const statesmanship = leader.stats?.statesmanship || 3;
            score += (statesmanship - 3) * 15;

            // Heavy penalty for Inept governors (stat = 1)
            if (statesmanship <= 1) {
                score -= 50;
            }

            if (leader.stats?.ability?.includes('MANAGER')) score += 20;
            if (leader.stats?.ability?.includes('MAN_OF_CHURCH')) score += 10;
        } else if (role === AILeaderRole.CLANDESTINE) {
            score += (leader.stats?.clandestineOps || 3) * 10;
            score += (leader.stats?.discretion || 3) * 5;
            if (leader.stats?.ability?.includes('FIREBRAND')) score += 20;
            if (leader.stats?.ability?.includes('DAREDEVIL')) score += 15;
            if (leader.stats?.ability?.includes('GHOST')) score += 15;
        } else if (role === AILeaderRole.STABILIZER) {
            score += (leader.stats?.stabilityPerTurn || 0) * 30;
        } else if (role === AILeaderRole.PROTECTOR) {
            if (leader.stats?.ability?.includes('LEGENDARY')) score += 100;
            else score -= 200; // Must have LEGENDARY
        } else if (role === AILeaderRole.COMMANDER) {
            score += (leader.stats?.commandBonus || 0) / 5;
        }

        if (score > bestScore) {
            bestScore = score;
            bestLeader = leader;
        }
    }

    return bestLeader;
}

// ============================================================================
// ROLE EXECUTION
// ============================================================================

/**
 * Execute governor/stabilizer role decisions.
 */
function executeGovernorRole(
    leader: Character,
    assignment: RoleAssignment,
    territories: TerritoryStatus[],
    strategy: any,
    stateManager: LeaderStateManager,
    state: GameState,
    logger: AILogger,
    result: AILeaderProcessingResult
): void {
    const location = stateManager.getLocation(assignment.targetLocationId || leader.locationId);
    if (!location) return;

    const territory = territories.find(t => t.location.id === location.id);
    if (!territory) return;

    // Check if leader needs to move
    // PRIORITY 1: Move to linked location if there's an enemy UNDERCOVER agent there (for HUNT_NETWORKS)
    if (leader.locationId === location.id) {
        // Only check if we are currently at the assigned location
        // Check linked locations for enemy agents
        const enemyInLinked = state.characters.find(c =>
            c.faction !== leader.faction &&
            c.faction !== FactionId.NEUTRAL &&
            c.status === CharacterStatus.UNDERCOVER &&
            c.locationId !== location.id &&
            // Check if connected by road (travel time > 0 and <= 1 usually for neighbors)
            calculateLeaderTravelTime(leader.locationId, c.locationId!, stateManager.getUpdatedLocations(), state.roads) <= 1
        );

        if (enemyInLinked && enemyInLinked.locationId) {
            // Move to intercept
            logger.logMovement(leader.id, leader.name, leader.locationId, enemyInLinked.locationId, 'HUNT_NETWORKS intercept');
            const travelTime = calculateLeaderTravelTime(leader.locationId, enemyInLinked.locationId, stateManager.getUpdatedLocations(), state.roads);
            if (travelTime > 0) {
                stateManager.startMovement(leader.id, enemyInLinked.locationId, travelTime);
            } else {
                stateManager.moveToLocation(leader.id, enemyInLinked.locationId);
            }
            return;
        }
    }

    if (leader.locationId !== location.id) {
        // Calculate travel time
        const travelTime = calculateLeaderTravelTime(
            leader.locationId,
            location.id,
            stateManager.getUpdatedLocations(),
            state.roads
        );

        if (travelTime > 0) {
            // Start movement with MOVING status
            stateManager.startMovement(leader.id, location.id, travelTime);
            logger.logMovement(leader.id, leader.name, leader.locationId, location.id, `Travel (${travelTime} turns)`);
        } else {
            // Instant movement (local road)
            stateManager.moveToLocation(leader.id, location.id);
            logger.logMovement(leader.id, leader.name, leader.locationId, location.id, 'Instant local move');
        }
        return;
    }

    // Get faction resources
    const availableGold = state.resources[leader.faction]?.gold || 0;
    const availableFood = (state.resources as Record<string, { gold?: number; food?: number }>)[leader.faction]?.food || 0;

    // Make governor decisions
    const decision = makeGovernorDecisions(
        leader,
        location,
        territory,
        strategy,
        availableGold,
        availableFood,
        state.turn
    );

    // Apply policies
    if (decision.policiesToActivate.length > 0 || decision.policiesToDeactivate.length > 0) {
        const currentPolicies = leader.activeGovernorPolicies || [];
        let newPolicies = currentPolicies.filter(p => !decision.policiesToDeactivate.includes(p));
        newPolicies = [...newPolicies, ...decision.policiesToActivate];

        stateManager.assignAsGovernor(leader.id, location.id, newPolicies);

        logger.logGovernorAction(
            leader.id,
            leader.name,
            location.name,
            newPolicies,
            decision.reasoning.join('; ')
        );
    } else if (leader.status !== CharacterStatus.GOVERNING) {
        // Just assign as governor with no policies yet
        stateManager.assignAsGovernor(leader.id, location.id, []);
    }

    result.decisions.governorDecisions.push(decision);
}

/**
 * Execute clandestine role decisions.
 */
function executeClandestineRole(
    leader: Character,
    assignment: RoleAssignment,
    opportunities: ClandestineOpportunity[],
    strategy: any,
    stateManager: LeaderStateManager,
    state: GameState,
    turn: number,
    logger: AILogger,
    result: AILeaderProcessingResult
): void {
    const location = stateManager.getLocation(assignment.targetLocationId || leader.locationId);
    if (!location) return;

    // Check if already undercover at location
    if (leader.status !== CharacterStatus.UNDERCOVER || leader.locationId !== location.id) {
        // Need to infiltrate - start undercover mission with travel
        if (leader.status !== CharacterStatus.UNDERCOVER) {
            // Calculate travel time
            const travelTime = calculateLeaderTravelTime(
                leader.locationId,
                location.id,
                stateManager.getUpdatedLocations(),
                state.roads
            );

            if (travelTime > 0) {
                // Start movement with MOVING status towards target
                stateManager.startMovement(leader.id, location.id, travelTime, turn);
                logger.logEvent(leader.id, leader.name, `Dispatched to ${location.name} (${travelTime} turns)`);
            } else {
                // Instant infiltration (local)
                stateManager.assignAsAgent(leader.id, location.id);
                logger.logEvent(leader.id, leader.name, `Infiltrated ${location.name} (instant)`);
            }
            return;
        }
    }

    // Get opportunity for this location
    const opportunity = opportunities.find(o => o.locationId === location.id);

    // Get budget
    const budget = stateManager.getEffectiveBudget(leader.id);

    // Make clandestine decisions
    const decision = makeClandestineDecisions(
        leader,
        location,
        leader.faction,
        strategy,
        budget,
        turn,
        state.armies,
        state.characters,
        opportunity
    );

    // Handle exfiltration
    if (decision.shouldExfiltrate) {
        const safeLocation = stateManager.getFactionLocations(leader.faction)[0];
        if (safeLocation) {
            stateManager.exfiltrateAgent(leader.id, safeLocation.id);
            logger.logEvent(leader.id, leader.name, `EXFILTRATING to ${safeLocation.name}`);
        }
    } else {
        // Apply action changes
        const currentActions = leader.activeClandestineActions || [];

        // Add new actions
        for (const actionId of decision.actionsToStart) {
            stateManager.addClandestineAction(
                leader.id,
                actionId,
                turn,
                decision.goldToAllocate,
                // CRITICAL: For PREPARE_GRAND_INSURRECTION, pass undefined turnStarted
                // This triggers the preparation log in clandestineProcessor.ts
                actionId === ClandestineActionId.PREPARE_GRAND_INSURRECTION ? undefined : turn
            );
        }

        // Remove stopped actions
        for (const actionId of decision.actionsToStop) {
            stateManager.removeClandestineAction(leader.id, actionId);
        }

        // Ensure agent status
        stateManager.assignAsAgent(leader.id, location.id);

        logger.logClandestineAction(
            leader.id,
            leader.name,
            location.name,
            [...decision.actionsToStart],
            0, // Would need to recalculate
            decision.reasoning.join('; ')
        );
    }

    result.decisions.clandestineDecisions.push(decision);
}

/**
 * Execute protector role (LEGENDARY leader blocking insurrections).
 */
function executeProtectorRole(
    leader: Character,
    assignment: RoleAssignment,
    territories: TerritoryStatus[],
    stateManager: LeaderStateManager,
    logger: AILogger
): void {
    const targetId = assignment.targetLocationId;
    if (!targetId) return;

    // Check if leader needs to move
    if (leader.locationId !== targetId) {
        logger.logMovement(leader.id, leader.name, leader.locationId, targetId, 'Protect territory');
        // TODO: Initiate movement
        return;
    }

    // Just being present blocks insurrections
    logger.logEvent(leader.id, leader.name, 'LEGENDARY protection active');
}

/**
 * Handle idle leaders - assign as fallback governor.
 */
function handleIdleLeader(
    leader: Character,
    territories: TerritoryStatus[],
    stateManager: LeaderStateManager,
    logger: AILogger
): void {
    // If at a friendly location, become a basic governor (IMPROVE_ECONOMY)
    const currentLocation = stateManager.getLocation(leader.locationId);
    if (currentLocation && territories.some(t => t.location.id === currentLocation.id)) {
        stateManager.assignAsGovernor(leader.id, currentLocation.id, [GovernorPolicy.IMPROVE_ECONOMY]);
        logger.logGovernorAction(
            leader.id,
            leader.name,
            currentLocation.name,
            [GovernorPolicy.IMPROVE_ECONOMY],
            'Fallback governance - economic focus'
        );
    }
}
