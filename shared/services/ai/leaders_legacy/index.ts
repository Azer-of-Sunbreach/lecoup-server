/**
 * AI Leader System - Main Entry Point
 * 
 * Orchestrates the AI leader decision cycle:
 * 1. Strategic analysis (Role assignment)
 * 2. Tactical decision making (Per-role logic)
 * 3. Action execution (Movement, Policies, Operations)
 * 
 * Now shared between Client and Server.
 * 
 * @see AI_LEADER_REFACTORING_SPECS.md Section 11
 */

import { GameState, FactionId, Character, CharacterStatus, Location } from '../../../types';
import {
    AILeaderRole,
    LeaderSituation,
    FactionStrategy,
    RoleRecommendation
} from './types';
import { analyzeSituation } from './evaluation/situationAnalyzer';
import { generateRoleRecommendations } from './evaluation/roleRecommender';
import { getStrategyForFaction } from './strategies/factionStrategy';
import { makeGovernorDecisions, applyGovernorDecision } from './roles/governorAI';
import { makeClandestineDecisions, applyClandestineDecision } from './roles/clandestineAI';
import { makeCommanderDecisions, applyCommanderDecision } from './roles/commanderAI';
import { moveLeaderToLocation } from './tactics/movement';
import { calculateLeaderTravelTime } from '../../domain/leaders';

/**
 * Output of the AI processing cycle
 */
export interface AIProcessingResult {
    updatedCharacters: Character[];
    updatedLocations: Location[];
    logs: string[];
}

/**
 * Main function to process AI for a faction's leaders.
 * 
 * @param state Current game state
 * @param faction Faction to process
 * @returns Updated characters and decision logs
 */
export function processLeaderAI(
    state: GameState,
    faction: FactionId
): AIProcessingResult {
    let updatedCharacters = [...state.characters];
    let updatedLocations = [...state.locations];
    const logs: string[] = [];
    const strategy = getStrategyForFaction(faction);

    // 1. Generate Role Recommendations
    const recommendations = generateRoleRecommendations(state, faction, strategy);
    const roleMap = new Map<string, RoleRecommendation>();
    recommendations.forEach(r => roleMap.set(r.leader.id, r));

    // 2. Process each leader
    const factionLeaders = updatedCharacters.filter(c => c.faction === faction && !c.isDead);

    for (const leader of factionLeaders) {
        // Skip busy leaders (captured, wounded, dead - statuses inferred or specific)
        // Note: CharacterStatus.CAPTURED/WOUNDED removed as they don't exist in shared types yet.
        // We rely on isDead check or possibly location checks if needed.
        if (leader.isDead) { // Redundant but explicit
            continue;
        }

        // Get current situation and recommendation
        const situation = analyzeSituation(state, faction, leader);
        const recommendation = roleMap.get(leader.id);
        const targetRole = recommendation?.recommendedRole || AILeaderRole.IDLE;
        const targetLocationId = recommendation?.targetLocationId;

        // Log significant role changes or actions? verbose for now
        logs.push(`Processing ${leader.name}: Assigned ${targetRole} at ${targetLocationId || 'current loc'}`);

        // 3. Tactial Execution based on Role
        let updatedLeader = { ...leader };

        // === MOVEMENT LOGIC FOR STATIONARY ROLES ===
        // Roles that require being at a specific location
        const needsLocation = [
            AILeaderRole.GOVERNOR,
            AILeaderRole.STABILIZER,
            AILeaderRole.PROTECTOR,
            AILeaderRole.MANAGER
        ];

        if (needsLocation.includes(targetRole) && targetLocationId) {
            // If not at target, MOVE instead of acting
            if (leader.locationId !== targetLocationId) {
                const moveResult = moveLeaderToLocation(
                    updatedLeader,
                    targetLocationId,
                    state,
                    `Moving to ${targetLocationId} for ${targetRole}`
                );

                if (moveResult) {
                    // Update leader state to moving
                    updatedLeader = moveResult;
                    // Persist changes
                    updatedCharacters = updatedCharacters.map(c =>
                        c.id === updatedLeader.id ? updatedLeader : c
                    );
                    logs.push(`${leader.name} moving to ${targetLocationId} for assignment.`);
                    continue; // End turn for this leader
                }
            }
        }

        // === ROLE SPECIFIC LOGIC ===

        if (targetRole === AILeaderRole.CLANDESTINE) {
            // If agent needs to move to enemy territory, start an undercover mission
            if (targetLocationId && leader.locationId !== targetLocationId &&
                leader.status !== CharacterStatus.UNDERCOVER) {

                const targetLocation = state.locations.find(l => l.id === targetLocationId);
                const isTargetEnemy = targetLocation &&
                    targetLocation.faction !== leader.faction &&
                    targetLocation.faction !== 'NEUTRAL';

                if (isTargetEnemy) {
                    // Start undercover mission (infiltration)
                    const travelTime = calculateLeaderTravelTime(
                        leader.locationId!,
                        targetLocationId,
                        state.locations,
                        state.roads
                    );

                    updatedLeader = {
                        ...updatedLeader,
                        status: CharacterStatus.MOVING,
                        undercoverMission: {
                            destinationId: targetLocationId,
                            turnsRemaining: travelTime || 1
                        }
                    };
                    updatedCharacters = updatedCharacters.map(c => c.id === updatedLeader.id ? updatedLeader : c);
                    logs.push(`${leader.name} infiltrating ${targetLocation?.name || targetLocationId}`);
                    continue;
                } else {
                    // Regular movement to friendly/neutral territory
                    const moveResult = moveLeaderToLocation(
                        updatedLeader,
                        targetLocationId,
                        state,
                        'Moving to target for Clandestine Ops'
                    );
                    if (moveResult) {
                        updatedLeader = moveResult;
                        updatedCharacters = updatedCharacters.map(c => c.id === updatedLeader.id ? updatedLeader : c);
                        logs.push(`${leader.name} moving to target for ops.`);
                        continue;
                    }
                }
            }

            const decision = makeClandestineDecisions(updatedLeader, situation, strategy, state);
            const batchUpdate = applyClandestineDecision({
                ...state,
                characters: updatedCharacters // Use currently updated state
            }, decision);
            updatedCharacters = batchUpdate;
            if (decision.reasoning.length) {
                logs.push(`  -> Agent Actions: ${decision.reasoning.join(', ')}`);
            }

        } else if (targetRole === AILeaderRole.GOVERNOR) {
            // Only act if at location
            if (leader.locationId === targetLocationId || !targetLocationId || updatedLeader.locationId === situation.currentLocation.id) {
                const decision = makeGovernorDecisions(updatedLeader, situation, strategy, state);
                const { characters, locations } = applyGovernorDecision({
                    ...state,
                    characters: updatedCharacters,
                    locations: updatedLocations
                }, decision);
                updatedCharacters = characters;
                updatedLocations = locations;
                if (decision.reasoning.length) {
                    logs.push(`  -> Governor Policies: ${decision.reasoning.join(', ')}`);
                }
            }

        } else if (targetRole === AILeaderRole.COMMANDER) {
            // Commander AI handles its own movement/assignments
            const decision = makeCommanderDecisions(updatedLeader, situation, strategy, state);
            const { characters } = applyCommanderDecision({
                ...state,
                characters: updatedCharacters
            }, decision);
            updatedCharacters = characters;
            if (decision.reasoning.length) {
                logs.push(`  -> Commander Orders: ${decision.reasoning.join(', ')}`);
            }

        } else if (targetRole === AILeaderRole.STABILIZER || targetRole === AILeaderRole.PROTECTOR) {
            // Passive roles, mainly just stay put and provide bonuses.
            // Logic handled by engine stats, but we ensure they are at location.
            // If we are here, we are already at location (movement check passed).
            // logs.push(`  -> Standing by as ${targetRole}`);
        } else if (targetRole === AILeaderRole.MANAGER) {
            // Manager simply exists at location
            // logs.push(`  -> Managing economy`);
        }
    }

    return {
        updatedCharacters,
        updatedLocations,
        logs
    };
}
