/**
 * Role Recommender - Recommends optimal role assignments for leaders
 * 
 * Combines leader scoring with strategic needs to produce role recommendations.
 * Ensures proper distribution of roles across available leaders.
 * 
 * @see AI_LEADER_REFACTORING_SPECS.md Section 11
 */

import { Character, FactionId, GameState } from '../../../../types';
import {
    AILeaderRole,
    RoleRecommendation,
    LeaderSituation,
    FactionStrategy,
    RoleOpportunity
} from '../types';
import { scoreLeaderForRole, getBestRole } from './leaderScorer';
import { analyzeSituation, getAvailableLeaders } from './situationAnalyzer';

// ============================================================================
// MAIN RECOMMENDATION FUNCTION
// ============================================================================

/**
 * Generates role recommendations for all available leaders of a faction.
 */
export function generateRoleRecommendations(
    state: GameState,
    faction: FactionId,
    strategy: FactionStrategy
): RoleRecommendation[] {
    const leaders = getAvailableLeaders(state, faction);
    const recommendations: RoleRecommendation[] = [];

    // Build situation map for all leaders
    const situationMap = new Map<string, LeaderSituation>();
    for (const leader of leaders) {
        situationMap.set(leader.id, analyzeSituation(state, faction, leader));
    }

    // Track assignments
    const assignedGovernorLocations = new Set<string>();
    const assignedProtectorLocations = new Set<string>();
    // assignedManagerLocations removed

    // Phase 1: Continue existing assignments
    for (const leader of leaders) {
        const situation = situationMap.get(leader.id)!;

        if (situation.isPreparingGrandInsurrection) {
            recommendations.push(createRecommendation(
                leader, AILeaderRole.CLANDESTINE, situation, strategy,
                situation.currentLocation.id, 'Continuing GRAND_INSURRECTION preparation'
            ));
            continue;
        }

        if (situation.currentRole === AILeaderRole.CLANDESTINE && situation.activeActions.length > 0) {
            recommendations.push(createRecommendation(
                leader, AILeaderRole.CLANDESTINE, situation, strategy,
                situation.currentLocation.id, 'Continuing active clandestine operations'
            ));
            continue;
        }
    }

    // Phase 2: Assign roles based on priority
    const unassignedLeaders = leaders.filter((l: Character) =>
        !recommendations.some(r => r.leader.id === l.id)
    );

    // 2a. Handle UNDERCOVER leaders first (track them to avoid reassignment)
    const assignedUndercoverIds = new Set<string>();
    for (const leader of unassignedLeaders) {
        const situation = situationMap.get(leader.id)!;
        if (situation.isUndercover && situation.budgetRemaining > 0) {
            recommendations.push(createRecommendation(
                leader, AILeaderRole.CLANDESTINE, situation, strategy,
                situation.currentLocation.id, 'UNDERCOVER agent with budget - continue operations'
            ));
            assignedUndercoverIds.add(leader.id);
        }
    }

    // === BUG #2 FIX: Track occupied locations EARLY to prevent duplicate agent assignments ===
    // Includes leaders already UNDERCOVER, already MOVING to infiltrate
    const occupiedTargetLocations = new Set<string>();
    state.characters.filter(c => c.faction === faction).forEach(c => {
        if (c.status === 'UNDERCOVER') {
            occupiedTargetLocations.add(c.locationId!);
        }
        if (c.status === 'MOVING' && c.undercoverMission?.destinationId) {
            occupiedTargetLocations.add(c.undercoverMission.destinationId);
        }
    });
    // Add Phase 1 and Phase 2a recommendations
    recommendations.forEach(r => {
        if (r.recommendedRole === AILeaderRole.CLANDESTINE && r.targetLocationId) {
            occupiedTargetLocations.add(r.targetLocationId);
        }
    });

    // Filter out already assigned UNDERCOVER leaders for subsequent phases
    const unassignedNonUndercover = unassignedLeaders.filter(
        (l: Character) => !assignedUndercoverIds.has(l.id)
    );

    // 2b. Fill critical STABILIZER needs
    const stabilityThreats = collectStabilityThreats(state, faction, situationMap);
    for (const threat of stabilityThreats) {
        if (recommendations.length >= leaders.length) break;

        const bestStabilizer = findBestLeaderForRole(
            unassignedLeaders.filter((l: Character) => !recommendations.some(r => r.leader.id === l.id)),
            AILeaderRole.STABILIZER, situationMap, strategy, threat.locationId
        );

        if (bestStabilizer && bestStabilizer.score > 20) {
            recommendations.push(createRecommendation(
                bestStabilizer.leader, AILeaderRole.STABILIZER, situationMap.get(bestStabilizer.leader.id)!,
                strategy, threat.locationId, `Stabilize ${threat.locationName} (${threat.stability}% stability)`
            ));
        }
    }

    // 2c. Fill PROTECTOR needs
    const insurrectionThreats = collectInsurrectionThreats(state, faction, situationMap);
    for (const threat of insurrectionThreats) {
        if (assignedProtectorLocations.has(threat.locationId)) continue;
        const bestProtector = findBestLeaderForRole(
            unassignedLeaders.filter((l: Character) => !recommendations.some(r => r.leader.id === l.id)),
            AILeaderRole.PROTECTOR, situationMap, strategy, threat.locationId
        );
        if (bestProtector && bestProtector.score > 30) {
            recommendations.push(createRecommendation(
                bestProtector.leader, AILeaderRole.PROTECTOR, situationMap.get(bestProtector.leader.id)!,
                strategy, threat.locationId, `Protect ${threat.locationName} from insurrections`
            ));
            assignedProtectorLocations.add(threat.locationId);
        }
    }

    // 2d. Assign GOVERNORS
    // NOTE: STABILIZER and GOVERNOR roles are compatible at the same location.
    // A leader assigned as STABILIZER can also serve as GOVERNOR.
    const governorNeeds = collectGovernorNeeds(state, faction);
    for (const need of governorNeeds) {
        if (assignedGovernorLocations.has(need.locationId)) continue;

        // Allow STABILIZER leaders at this location to be considered for GOVERNOR
        const candidates = unassignedLeaders.filter((l: Character) => {
            // Already assigned to a different role at a different location? Exclude.
            const existingRec = recommendations.find(r => r.leader.id === l.id);
            if (!existingRec) return true; // Not assigned yet, include

            // If already STABILIZER at same location, allow combined role
            if (existingRec.recommendedRole === AILeaderRole.STABILIZER &&
                existingRec.targetLocationId === need.locationId) {
                return true;
            }
            return false; // Assigned to different role/location
        });

        const bestGovernor = findBestLeaderForRole(
            candidates,
            AILeaderRole.GOVERNOR, situationMap, strategy, need.locationId
        );
        if (bestGovernor && bestGovernor.score > 25) {
            // Update existing STABILIZER recommendation to GOVERNOR (includes stabilization)
            const existingStabIdx = recommendations.findIndex(r =>
                r.leader.id === bestGovernor.leader.id &&
                r.recommendedRole === AILeaderRole.STABILIZER
            );
            if (existingStabIdx >= 0) {
                // Upgrade STABILIZER to GOVERNOR (GOVERNOR will also stabilize)
                recommendations[existingStabIdx] = createRecommendation(
                    bestGovernor.leader, AILeaderRole.GOVERNOR, situationMap.get(bestGovernor.leader.id)!,
                    strategy, need.locationId, `Govern & Stabilize ${need.locationName}`
                );
            } else {
                recommendations.push(createRecommendation(
                    bestGovernor.leader, AILeaderRole.GOVERNOR, situationMap.get(bestGovernor.leader.id)!,
                    strategy, need.locationId, `Govern ${need.locationName}`
                ));
            }
            assignedGovernorLocations.add(need.locationId);
        }
    }

    // 2e. Assign CLANDESTINE agents for GRAND_INSURRECTION
    const insurrectionOpportunities = collectInsurrectionOpportunities(state, faction, strategy);
    for (const opportunity of insurrectionOpportunities) {
        // BUG #2 FIX: Skip if location already has an agent assigned
        if (occupiedTargetLocations.has(opportunity.locationId)) {
            continue;
        }

        const bestAgent = findBestLeaderForRole(
            unassignedLeaders.filter((l: Character) => !recommendations.some(r => r.leader.id === l.id)),
            AILeaderRole.CLANDESTINE, situationMap, strategy, opportunity.locationId
        );
        // Lowered threshold from 40 to 20 to allow infiltration assignments
        if (bestAgent && bestAgent.score > 20) {
            recommendations.push(createRecommendation(
                bestAgent.leader, AILeaderRole.CLANDESTINE, situationMap.get(bestAgent.leader.id)!,
                strategy, opportunity.locationId, `Initiate GRAND_INSURRECTION in ${opportunity.locationName}`
            ));
            // Mark location as occupied
            occupiedTargetLocations.add(opportunity.locationId);
        }
    }

    // 2f. Assign MANAGERS - REMOVED (Merged into Governor)


    // NOTE: occupiedTargetLocations is now initialized earlier (after Phase 2a)

    // 2g. Fill CLANDESTINE Roles (Strategic Deployment)
    // Limit new deployments per turn to prevent spam
    let newDeploymentsCount = 0;
    const MAX_NEW_DEPLOYMENTS = 2; // Strict limit per turn

    // Helper function `getBestOpportunitiesForRole` is not provided, so this line will cause a compilation error.
    // Assuming it's meant to be a conceptual placeholder or a function that needs to be added elsewhere.
    // For now, commenting it out to maintain syntactical correctness based on the provided snippet.
    // const clandestineOpportunities = getBestOpportunitiesForRole(leaders, situationMap, AILeaderRole.CLANDESTINE, strategy);

    // Sort logic handled in helper, but we iterate candidates
    // We need to match unassigned leaders to best opportunities

    for (const leader of unassignedLeaders.filter((l: Character) => !recommendations.some(r => r.leader.id === l.id))) {
        if (newDeploymentsCount >= MAX_NEW_DEPLOYMENTS) break;

        const situation = situationMap.get(leader.id)!;
        const bestRole = getBestRole(leader, situation, strategy);

        if (bestRole.role === AILeaderRole.CLANDESTINE && bestRole.score > 20) {
            const opportunity = situation.roleOpportunities.find(o => o.role === AILeaderRole.CLANDESTINE);
            const targetId = opportunity?.targetLocationId || situation.currentLocation.id;

            // CHECK: Is target already occupied by another agent?
            const isNewDeployment = leader.locationId !== targetId;

            if (occupiedTargetLocations.has(targetId)) {
                // If I am NOT the one occupying it (e.g. I am not already there/undercover), skip
                // But wait, if I am already there (Phase 1), I should have been handled.
                // If I am in Phase 2g, I am unassigned. So if location is occupied, it's SOMEONE ELSE.
                continue;
            }

            recommendations.push(createRecommendation(
                leader, AILeaderRole.CLANDESTINE, situation, strategy,
                targetId,
                isNewDeployment ? 'Deploying to high value target' : 'Continuing local operations'
            ));

            if (isNewDeployment) {
                newDeploymentsCount++;
            }
            occupiedTargetLocations.add(targetId); // Mark taken
        }
    }

    // 2h. Fill remaining leaders
    const stillUnassigned = unassignedLeaders.filter((l: Character) =>
        !recommendations.some(r => r.leader.id === l.id)
    );

    for (const leader of stillUnassigned) {
        const situation = situationMap.get(leader.id)!;
        const bestRole = getBestRole(leader, situation, strategy);

        if (bestRole.score > 10) {
            const targetOpportunity = situation.roleOpportunities.find(o => o.role === bestRole.role);
            // Safety check for clandestine spam in fallback
            if (bestRole.role === AILeaderRole.CLANDESTINE) {
                const targetId = targetOpportunity?.targetLocationId || situation.currentLocation.id;
                if (leader.locationId !== targetId && (newDeploymentsCount >= MAX_NEW_DEPLOYMENTS || occupiedTargetLocations.has(targetId))) {
                    continue; // Skip this role if limits hit
                }
                if (leader.locationId !== targetId) {
                    newDeploymentsCount++;
                    occupiedTargetLocations.add(targetId);
                }
            }

            recommendations.push(createRecommendation(
                leader, bestRole.role, situation, strategy,
                targetOpportunity?.targetLocationId || situation.currentLocation.id,
                `Best available role`
            ));
        }
    }

    return recommendations.sort((a, b) => b.score - a.score);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createRecommendation(
    leader: Character,
    role: AILeaderRole,
    situation: LeaderSituation,
    strategy: FactionStrategy,
    targetLocationId: string,
    reasoning: string
): RoleRecommendation {
    const breakdown = scoreLeaderForRole(leader, role, situation, strategy);
    const alternatives: Array<{ role: AILeaderRole; score: number; targetLocationId?: string }> = [];
    const otherRoles = Object.values(AILeaderRole).filter(r => r !== role && r !== AILeaderRole.IDLE);

    for (const altRole of otherRoles) {
        const altBreakdown = scoreLeaderForRole(leader, altRole, situation, strategy);
        if (altBreakdown.totalScore > 0) {
            const altOpportunity = situation.roleOpportunities.find((o: RoleOpportunity) => o.role === altRole);
            alternatives.push({
                role: altRole,
                score: altBreakdown.totalScore,
                targetLocationId: altOpportunity?.targetLocationId
            });
        }
    }

    return {
        leader,
        recommendedRole: role,
        targetLocationId,
        score: breakdown.totalScore,
        breakdown,
        alternativeRoles: alternatives.sort((a, b) => b.score - a.score).slice(0, 3)
    };
}

function findBestLeaderForRole(
    candidates: Character[],
    role: AILeaderRole,
    situationMap: Map<string, LeaderSituation>,
    strategy: FactionStrategy,
    targetLocationId?: string
): { leader: Character; score: number } | null {
    let bestLeader: Character | null = null;
    let bestScore = -Infinity;

    for (const leader of candidates) {
        const situation = situationMap.get(leader.id);
        if (!situation) continue;
        const breakdown = scoreLeaderForRole(leader, role, situation, strategy);
        let score = breakdown.totalScore;

        // OPPORTUNITY COST LOGIC
        if (targetLocationId) {
            if (leader.locationId === targetLocationId) {
                score += 25; // Bonus for already being there
            } else {
                const opportunity = situation.roleOpportunities.find(
                    (o: RoleOpportunity) => o.targetLocationId === targetLocationId && o.role === role
                );

                // LINKED LOCATION BONUS: Treat linked locations almost as "being there"
                // This encourages leaders to take roles in attached rural areas
                if (situation.currentLocation?.linkedLocationId === targetLocationId) {
                    score += 20; // Nearly as good as being there (25)
                }

                const turnsToReach = opportunity ? opportunity.turnsToReach : 10; // Default penalty if no path found

                // 1. STRICT CAP for Stationary Roles (Governor, Stabilizer, Protector)
                const MAX_STATIONARY_TRAVEL = 4;
                const isStationaryRole = role === AILeaderRole.GOVERNOR ||
                    role === AILeaderRole.STABILIZER ||
                    role === AILeaderRole.PROTECTOR;

                if (isStationaryRole && turnsToReach > MAX_STATIONARY_TRAVEL) {
                    score -= 5000; // Effectively ban
                }

                // 2. OPPORTUNITY COST CALCULATION
                // "What could I do HERE instead of traveling?"
                // Value of local action = Best score achievable at current location

                // Get best role AT CURRENT LOCATION (turns=0)
                const bestLocalRole = getBestRole(leader, situation, strategy);

                // If the best local role is IDLE, value is low (e.g. 10). If it's a great Governorship, value is high (e.g. 80).
                // We assume the leader would start acting immediately if they stayed.
                // We assume travel is "dead time" (no value).
                // Cost = (Turns Traveling * Local Value Per Turn)

                const localValuePerTurn = Math.max(10, bestLocalRole.score);
                // Clandestine missions have reduced opportunity cost (strategic value)
                const oppCostMultiplier = role === AILeaderRole.CLANDESTINE ? 0.3 : 1.0;
                const opportunityCost = turnsToReach * localValuePerTurn * oppCostMultiplier;

                // Add travel expense (gold/logistics conceptual cost)
                const travelExpense = turnsToReach * 5;

                score -= (opportunityCost + travelExpense);

                // 3. COMMANDER SPECIFIC LOGIC
                if (role === AILeaderRole.COMMANDER) {
                    // Commanders should generally stay with their army or move to a front line
                    // If they are traveling long distance without an army, it's suspicious unless they are a hero unit
                    if (turnsToReach > 4 && !leader.armyId && !leader.stats.ability.includes('LEGENDARY')) {
                        score -= 50; // Discourage solo travel across map for commanders
                    }
                }
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestLeader = leader;
        }
    }

    return bestLeader ? { leader: bestLeader, score: bestScore } : null;
}

function collectStabilityThreats(
    state: GameState,
    faction: FactionId,
    situationMap: Map<string, LeaderSituation>
): Array<{ locationId: string; locationName: string; stability: number }> {
    return state.locations
        .filter(l => l.faction === faction && l.stability < 60)
        .map(l => ({ locationId: l.id, locationName: l.name, stability: l.stability }))
        .sort((a, b) => a.stability - b.stability);
}

function collectInsurrectionThreats(
    state: GameState,
    faction: FactionId,
    situationMap: Map<string, LeaderSituation>
): Array<{ locationId: string; locationName: string }> {
    const threats: Array<{ locationId: string; locationName: string }> = [];
    for (const [, situation] of situationMap) {
        for (const threat of situation.nearbyThreats) {
            if (threat.type === 'GRAND_INSURRECTION' || threat.type === 'ENEMY_AGENT') {
                const loc = state.locations.find(l => l.id === threat.locationId);
                if (loc && loc.faction === faction) {
                    threats.push({ locationId: loc.id, locationName: loc.name });
                }
            }
        }
    }
    return threats;
}

function collectGovernorNeeds(
    state: GameState,
    faction: FactionId
): Array<{ locationId: string; locationName: string; stability: number }> {
    const governedLocations = new Set(
        state.characters
            .filter(c => c.faction === faction && c.status === 'GOVERNING')
            .map(c => c.locationId)
    );
    return state.locations
        .filter(l =>
            l.faction === faction &&
            !governedLocations.has(l.id) &&
            (l.type === 'CITY' || l.type === 'RURAL')
        )
        .map(l => ({ locationId: l.id, locationName: l.name, stability: l.stability }))
        .sort((a, b) => a.stability - b.stability);
}

function collectInsurrectionOpportunities(
    state: GameState,
    faction: FactionId,
    strategy: FactionStrategy
): Array<{ locationId: string; locationName: string; score: number }> {
    return state.locations
        .filter(l =>
            l.faction !== faction &&
            l.faction !== FactionId.NEUTRAL &&
            l.stability < 70 &&
            !hasLegendaryBlocker(state, l.id)
        )
        .map(l => ({
            locationId: l.id,
            locationName: l.name,
            score: (100 - l.stability) + (l.population / 10000)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
}

// collectManagerNeeds REMOVED

function hasLegendaryBlocker(state: GameState, locationId: string): boolean {
    const location = state.locations.find(l => l.id === locationId);
    if (!location) return false;
    return state.characters.some(c =>
        c.faction === location.faction &&
        c.locationId === locationId &&
        c.stats?.ability?.includes('LEGENDARY')
    );
}

export function recommendRoleForLeader(
    state: GameState,
    faction: FactionId,
    leader: Character,
    strategy: FactionStrategy
): RoleRecommendation {
    const situation = analyzeSituation(state, faction, leader);
    const bestRole = getBestRole(leader, situation, strategy);
    const targetOpportunity = situation.roleOpportunities.find(
        (o: RoleOpportunity) => o.role === bestRole.role
    );

    return createRecommendation(
        leader,
        bestRole.role,
        situation,
        strategy,
        targetOpportunity?.targetLocationId || situation.currentLocation.id,
        'Optimal role based on current situation'
    );
}
