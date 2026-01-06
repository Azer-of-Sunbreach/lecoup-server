/**
 * Commander AI - Decision logic for commander-assigned leaders
 * 
 * Determines leader-army assignments and movement based on:
 * - Active military missions (CAMPAIGN, DEFEND)
 * - Army strength and leader command bonus
 * - Pathfinding and reachability
 * 
 * Migrated from Application/services/ai/leaders.ts handleCommanderRole
 * 
 * @see AI_LEADER_REFACTORING_SPECS.md Section 11
 */

import { Character, GameState, FactionId, Army } from '../../../../types';
import {
    CommanderDecision,
    LeaderSituation,
    FactionStrategy
} from '../types';
import { findSafePath } from '../../utils';

// ============================================================================
// MAIN DECISION FUNCTION
// ============================================================================

/**
 * Makes commander role decisions for a leader.
 * 
 * @param leader The commander leader
 * @param situation Analyzed situation
 * @param strategy Faction strategy
 * @param state Current game state
 * @returns Decision with army assignment and movement
 */
export function makeCommanderDecisions(
    leader: Character,
    situation: LeaderSituation,
    strategy: FactionStrategy,
    state: GameState
): CommanderDecision {
    const faction = leader.faction;
    const reasoning: string[] = [];

    // Check if already commanding an army
    if (leader.assignedArmyId) {
        const army = state.armies.find(a => a.id === leader.assignedArmyId);
        if (army && army.strength > 500) {
            reasoning.push('Already commanding a viable army');
            return {
                leaderId: leader.id,
                armyId: leader.assignedArmyId,
                shouldDetach: false,
                reasoning
            };
        } else {
            // Army destroyed or too small, detach
            reasoning.push('Assigned army no longer viable - detaching');
            return {
                leaderId: leader.id,
                shouldDetach: true,
                reasoning
            };
        }
    }

    // Look for armies needing commanders
    const missions = state.aiState?.[faction]?.missions || [];
    const combatMissions = missions.filter((m: any) =>
        (m.type === 'CAMPAIGN' || m.type === 'DEFEND') &&
        m.status !== 'COMPLETED'
    );

    // Find the best army to command
    const armyAssignment = findBestArmyToCommand(
        leader,
        state,
        faction,
        combatMissions,
        state.characters.filter(c => c.faction === faction)
    );

    if (armyAssignment) {
        reasoning.push(`Assigning to army ${armyAssignment.armyId} - ${armyAssignment.reason}`);
        return {
            leaderId: leader.id,
            armyId: armyAssignment.armyId,
            targetLocationId: armyAssignment.targetLocationId,
            shouldDetach: false,
            reasoning
        };
    }

    // No suitable army found - stay available
    reasoning.push('No suitable army to command');
    return {
        leaderId: leader.id,
        shouldDetach: false,
        reasoning
    };
}

// ============================================================================
// ARMY ASSIGNMENT LOGIC
// ============================================================================

interface ArmyAssignmentResult {
    armyId: string;
    targetLocationId?: string;
    reason: string;
}

/**
 * Finds the best army for a leader to command.
 */
function findBestArmyToCommand(
    leader: Character,
    state: GameState,
    faction: FactionId,
    missions: any[],
    factionCharacters: Character[]
): ArmyAssignmentResult | null {
    // Get armies already with commanders
    const armiesWithCommanders = new Set(
        factionCharacters
            .filter(c => c.assignedArmyId && c.id !== leader.id)
            .map(c => c.assignedArmyId)
    );

    // Get faction armies without commanders
    const availableArmies = state.armies.filter(a =>
        a.faction === faction &&
        a.strength > 1000 && // Only significant armies
        !armiesWithCommanders.has(a.id)
    );

    if (availableArmies.length === 0) return null;

    // Score each army based on mission relevance and reachability
    const scoredArmies: Array<{
        army: Army;
        score: number;
        missionTargetId?: string;
        turnsToReach: number;
    }> = [];

    for (const army of availableArmies) {
        let score = 0;
        let missionTargetId: string | undefined;

        // Base score from army strength (bigger = more important)
        score += army.strength / 500;

        // Check if army is assigned to a mission
        for (const mission of missions) {
            if (mission.assignedArmyIds?.includes(army.id)) {
                score += mission.priority / 2;
                missionTargetId = mission.targetId;
                break;
            }

            // Check if army is at or heading to mission target
            if (army.locationId === mission.targetId || army.destinationId === mission.targetId) {
                score += 20;
                missionTargetId = mission.targetId;
                break;
            }

            // Check staging area
            if (mission.data?.stagingId &&
                (army.locationId === mission.data.stagingId || army.destinationId === mission.data.stagingId)) {
                score += 15;
                missionTargetId = mission.data.stagingId;
                break;
            }
        }

        // Reachability check
        const path = findSafePath(leader.locationId!, army.locationId, state, faction);
        const turnsToReach = path ? path.length : 999;

        // Penalty for distance
        if (turnsToReach <= 1) {
            score += 30; // Immediate access
        } else if (turnsToReach <= 2) {
            score += 15;
        } else if (turnsToReach <= 3) {
            score += 5;
        } else {
            score -= 20; // Too far
        }

        scoredArmies.push({
            army,
            score,
            missionTargetId,
            turnsToReach
        });
    }

    // Sort by score
    scoredArmies.sort((a, b) => b.score - a.score);

    const best = scoredArmies[0];
    if (best && best.score > 10) {
        return {
            armyId: best.army.id,
            targetLocationId: best.missionTargetId || best.army.locationId,
            reason: `Army strength ${best.army.strength}, score ${best.score.toFixed(0)}`
        };
    }

    return null;
}

// ============================================================================
// APPLY DECISIONS
// ============================================================================

/**
 * Applies commander decisions to the game state.
 * Returns updated characters and armies.
 */
export function applyCommanderDecision(
    state: GameState,
    decision: CommanderDecision
): { characters: Character[]; } {
    const characters = state.characters.map(c => {
        if (c.id !== decision.leaderId) return c;

        if (decision.shouldDetach) {
            return {
                ...c,
                assignedArmyId: undefined,
                status: 'AVAILABLE' as any
            };
        }

        if (decision.armyId) {
            const army = state.armies.find(a => a.id === decision.armyId);

            // Check if at army location or need to move
            if (army && c.locationId === army.locationId) {
                return {
                    ...c,
                    assignedArmyId: decision.armyId,
                    status: 'AVAILABLE' as any // Commanding
                };
            }

            // Need to move to army
            if (decision.targetLocationId && c.locationId !== decision.targetLocationId) {
                // Calculation of travel time would require utils, simplified here
                // It will be updated by the game engine anyway
                return {
                    ...c,
                    status: 'MOVING' as any,
                    destinationId: decision.targetLocationId,
                    turnsUntilArrival: 3 // Placeholder, should be calculated
                };
            }
        }

        return c;
    });

    return { characters };
}
