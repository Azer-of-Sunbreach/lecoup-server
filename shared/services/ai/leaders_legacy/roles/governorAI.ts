/**
 * Governor AI - Decision logic for governor-assigned leaders
 * 
 * Determines which governor policies to activate/deactivate based on:
 * - Faction strategy priorities
 * - Current situation (stability, threats, resources)
 * - Leader traits (IRON_FIST forces MAKE_EXAMPLES)
 * - Abilities (MAN_OF_CHURCH reduces costs)
 * 
 * @see AI_LEADER_REFACTORING_SPECS.md Section 7
 */

import { Character, GameState, FactionId, Location, LocationType } from '../../../../types';
import { GovernorPolicy, FULL_TIME_POLICIES, GOVERNOR_POLICY_COSTS } from '../../../../types/governorTypes';
import { CharacterTrait } from '../../../../types/leaderTypes';
import {
    GovernorDecision,
    LeaderSituation,
    FactionStrategy,
    ThreatInfo
} from '../types';

// ============================================================================
// MAIN DECISION FUNCTION
// ============================================================================

/**
 * Makes governor role decisions for a leader.
 * 
 * Determines which policies to activate based on:
 * - Faction strategy priorities
 * - Current situation (stability, threats)
 * - Leader traits (IRON_FIST forces MAKE_EXAMPLES)
 * 
 * @param leader The governor leader
 * @param situation Analyzed situation
 * @param strategy Faction strategy
 * @param state Current game state
 * @returns Decision with policies to activate/deactivate
 */
export function makeGovernorDecisions(
    leader: Character,
    situation: LeaderSituation,
    strategy: FactionStrategy,
    state: GameState
): GovernorDecision {
    const location = situation.currentLocation;
    const currentPolicies = new Set(leader.activeGovernorPolicies || []);
    const policiesToActivate: GovernorPolicy[] = [];
    const policiesToDeactivate: GovernorPolicy[] = [];
    const reasoning: string[] = [];

    // Check for IRON_FIST trait - forces MAKE_EXAMPLES
    const hasIronFist = leader.stats?.traits?.includes(CharacterTrait.IRON_FIST);
    if (hasIronFist && !currentPolicies.has(GovernorPolicy.MAKE_EXAMPLES)) {
        policiesToActivate.push(GovernorPolicy.MAKE_EXAMPLES);
        reasoning.push('IRON_FIST trait forces MAKE_EXAMPLES');
    }

    // Handle MAKE_EXAMPLES toggle based on strategy
    if (strategy.makeExamplesToggle && !hasIronFist) {
        const stability = location.stability;
        if (stability < strategy.makeExamplesToggle.enableBelow && !currentPolicies.has(GovernorPolicy.MAKE_EXAMPLES)) {
            policiesToActivate.push(GovernorPolicy.MAKE_EXAMPLES);
            reasoning.push(`Low stability (${stability}%) - enabling MAKE_EXAMPLES`);
        } else if (stability > strategy.makeExamplesToggle.disableAbove && currentPolicies.has(GovernorPolicy.MAKE_EXAMPLES)) {
            policiesToDeactivate.push(GovernorPolicy.MAKE_EXAMPLES);
            reasoning.push(`High stability (${stability}%) - disabling MAKE_EXAMPLES`);
        }
    }

    // Activate priority policies based on faction strategy
    for (const policy of strategy.governorPriorityPolicies) {
        if (currentPolicies.has(policy)) continue;
        if (strategy.avoidPolicies?.includes(policy)) continue;

        // Check cost
        const cost = GOVERNOR_POLICY_COSTS[policy] || 0;
        // For now, assume we can afford - actual budget check would need faction gold

        // Detect if enemy agent is present
        const hasEnemyAgent = situation.nearbyThreats.some(t => t.type === 'ENEMY_AGENT');

        // Only activate if not a full-time policy or we have room
        if (FULL_TIME_POLICIES.includes(policy)) {
            // IMPROVE_ECONOMY: Activate freely unless there's an enemy agent
            if (policy === GovernorPolicy.IMPROVE_ECONOMY && !hasEnemyAgent) {
                policiesToActivate.push(policy);
                reasoning.push(`Activating ${policy} for economic growth`);
            }
            // HUNT_NETWORKS: Activate proactively when enemy agent detected
            else if (policy === GovernorPolicy.HUNT_NETWORKS && hasEnemyAgent) {
                policiesToActivate.push(policy);
                reasoning.push(`Enemy agent detected - activating HUNT_NETWORKS`);
            }
            // Other full-time policies: Only on CRITICAL threat
            else if (situation.nearbyThreats.some(t => t.severity === 'CRITICAL')) {
                policiesToActivate.push(policy);
                reasoning.push(`Critical threat detected - activating ${policy}`);
            }
        } else {
            policiesToActivate.push(policy);
            reasoning.push(`Activating priority policy: ${policy}`);
        }

        // Limit to 2 new policies per turn
        if (policiesToActivate.length >= 2) break;
    }

    return {
        leaderId: leader.id,
        locationId: location.id,
        policiesToActivate,
        policiesToDeactivate,
        reasoning
    };
}

// ============================================================================
// APPLY DECISIONS
// ============================================================================

export interface GovernorDecisionResult {
    characters: Character[];
    locations: Location[];
}

export function applyGovernorDecision(
    state: GameState,
    decision: GovernorDecision
): GovernorDecisionResult {
    let updatedLocations = [...state.locations];

    const characters = state.characters.map(c => {
        // Enforce exclusivity: Demote other governors in same location
        if (c.locationId === decision.locationId && c.id !== decision.leaderId && c.status === 'GOVERNING') {
            return {
                ...c,
                status: 'AVAILABLE' as any,
                activeGovernorPolicies: []
            };
        }

        if (c.id !== decision.leaderId) return c;

        const currentPolicies = new Set(c.activeGovernorPolicies || []);

        for (const policy of decision.policiesToDeactivate) {
            currentPolicies.delete(policy);
        }

        for (const policy of decision.policiesToActivate) {
            currentPolicies.add(policy);
        }

        // Logic Check: Can keep army ONLY if army is at the same location
        let finalArmyId = c.assignedArmyId;
        if (finalArmyId) {
            const army = state.armies.find(a => a.id === finalArmyId);
            // If army not found or not in the same city, detach
            if (!army || army!.locationId !== decision.locationId) {
                finalArmyId = undefined;
            }
        }

        const updatedPoliciesArray = Array.from(currentPolicies);

        // Sync to location.governorPolicies
        updatedLocations = updatedLocations.map(loc => {
            if (loc.id !== decision.locationId) return loc;

            // Convert array to Record<GovernorPolicy, boolean>
            const policiesRecord: Partial<Record<GovernorPolicy, boolean>> = {};
            for (const p of updatedPoliciesArray) {
                policiesRecord[p] = true;
            }

            return {
                ...loc,
                governorPolicies: policiesRecord
            };
        });

        return {
            ...c,
            activeGovernorPolicies: updatedPoliciesArray,
            status: 'GOVERNING' as any,
            assignedArmyId: finalArmyId
        };
    });

    return { characters, locations: updatedLocations };
}

