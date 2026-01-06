/**
 * Situation Analyzer - Analyzes GameState to produce LeaderSituation
 * 
 * Examines the current game state for each leader to determine:
 * - Territory context (enemy/friendly/neutral)
 * - Current risk level from clandestine operations
 * - Active threats (enemy agents, approaching armies, low stability)
 * - Available opportunities for each role
 * 
 * @see AI_LEADER_REFACTORING_SPECS.md Section 11
 */

import { GameState, FactionId, Character, Location, LocationType } from '../../../../types';
import { ClandestineActionId, ActiveClandestineAction } from '../../../../types/clandestineTypes';
import { GovernorPolicy } from '../../../../types/governorTypes';
import { calculateDetectionRisk } from '../../../domain/clandestine/detectionRisk';
import {
    LeaderSituation,
    ThreatInfo,
    RoleOpportunity,
    AILeaderRole,
    InsurrectionTarget,
    GRAND_INSURRECTION_PREP_TURNS
} from '../types';

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

export function analyzeSituation(
    state: GameState,
    faction: FactionId,
    leader: Character
): LeaderSituation {
    const currentLocation = state.locations.find(l => l.id === leader.locationId);

    if (!currentLocation) {
        return createTransitSituation(leader, state);
    }

    const isInEnemyTerritory = currentLocation.faction !== faction && currentLocation.faction !== FactionId.NEUTRAL;
    const isInFriendlyTerritory = currentLocation.faction === faction;
    const isInNeutralTerritory = currentLocation.faction === FactionId.NEUTRAL;
    const isUndercover = leader.status === 'UNDERCOVER';

    const activeActions = leader.activeClandestineActions || [];
    const currentRisk = calculateCurrentRisk(state, leader, currentLocation, activeActions);
    const budgetRemaining = leader.clandestineBudget || leader.budget || 0;

    const grandInsurrectionAction = activeActions.find(
        a => a.actionId === ClandestineActionId.PREPARE_GRAND_INSURRECTION
    );
    const isPreparingGrandInsurrection = !!grandInsurrectionAction;
    const grandInsurrectionTurnsRemaining = grandInsurrectionAction?.turnStarted != null
        ? Math.max(0, GRAND_INSURRECTION_PREP_TURNS - (state.turn - grandInsurrectionAction.turnStarted))
        : undefined;

    const nearbyThreats = detectThreats(state, faction, leader, currentLocation);
    const roleOpportunities = evaluateRoleOpportunities(
        state, faction, leader, currentLocation, isInEnemyTerritory
    );
    const currentRole = determineCurrentRole(leader, isUndercover, isInFriendlyTerritory);

    return {
        leader,
        currentLocation,
        isInEnemyTerritory,
        isInFriendlyTerritory,
        isInNeutralTerritory,
        isUndercover,
        currentRisk,
        budgetRemaining,
        activeActions,
        isPreparingGrandInsurrection,
        grandInsurrectionTurnsRemaining,
        nearbyThreats,
        roleOpportunities,
        currentRole,
        currentTargetLocationId: leader.locationId
    };
}

// ... existing code ...

function calculateCurrentRisk(
    state: GameState,
    leader: Character,
    location: Location,
    activeActions: ActiveClandestineAction[]
): number {
    if (location.faction === leader.faction || activeActions.length === 0) {
        return 0;
    }

    const governor = state.characters.find(c =>
        c.faction === location.faction &&
        c.locationId === location.id &&
        c.status === 'GOVERNING'
    );

    const isHuntActive = governor?.activeGovernorPolicies?.some(
        p => p === GovernorPolicy.HUNT_NETWORKS
    ) ?? false;

    return calculateDetectionRisk(
        location,
        activeActions,
        leader,
        state.armies,
        governor,
        isHuntActive
    );
}

// ... existing code ...

function determineCurrentRole(
    leader: Character,
    isUndercover: boolean,
    isInFriendlyTerritory: boolean
): AILeaderRole | undefined {
    if (isUndercover || (leader.activeClandestineActions?.length ?? 0) > 0) {
        return AILeaderRole.CLANDESTINE;
    }
    if (leader.activeGovernorPolicies && leader.activeGovernorPolicies.length > 0) {
        return AILeaderRole.GOVERNOR;
    }
    if (leader.assignedArmyId) {
        return AILeaderRole.COMMANDER;
    }
    if (isInFriendlyTerritory && leader.stats?.ability?.includes('MANAGER')) {
        return AILeaderRole.MANAGER; // Keeping this for now as per previous logic, MANAGER still in enum
    }
    return AILeaderRole.IDLE;
}

export function getAvailableLeaders(state: GameState, faction: FactionId): Character[] {
    return state.characters.filter(c =>
        c.faction === faction &&
        (c.status === 'AVAILABLE' || c.status === 'UNDERCOVER') &&
        !c.isDead
    );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createTransitSituation(leader: Character, state: GameState): LeaderSituation {
    const dummyLocation = {
        id: leader.locationId || 'unknown',
        name: 'In Transit',
        type: 'RURAL' as const,
        linkedLocationId: null,
        faction: FactionId.NEUTRAL,
        population: 0,
        goldIncome: 0,
        foodIncome: 0,
        foodStock: 0,
        stability: 50,
        defense: 0,
        fortificationLevel: 0,
        position: { x: 0, y: 0 }
    } as Location;

    return {
        leader,
        currentLocation: dummyLocation,
        isInEnemyTerritory: false,
        isInFriendlyTerritory: false,
        isInNeutralTerritory: true,
        isUndercover: false,
        currentRisk: 0,
        budgetRemaining: leader.clandestineBudget || leader.budget || 0,
        activeActions: [],
        isPreparingGrandInsurrection: false,
        nearbyThreats: [],
        roleOpportunities: [],
        currentRole: AILeaderRole.IDLE
    };
}



function detectThreats(
    state: GameState,
    faction: FactionId,
    leader: Character,
    location: Location
): ThreatInfo[] {
    const threats: ThreatInfo[] = [];

    if (location.faction === faction && location.stability < 50) {
        threats.push({
            type: 'LOW_STABILITY',
            locationId: location.id,
            severity: location.stability < 30 ? 'CRITICAL' : location.stability < 40 ? 'HIGH' : 'MEDIUM',
            detectedTurn: state.turn
        });
    }

    const allLogs = state.logs || [];
    const recentLogs = allLogs.filter((log: any) =>
        log.turn >= state.turn - 2 &&
        (log.baseSeverity === 'WARNING' || log.baseSeverity === 'CRITICAL') &&
        isClandestineRelatedLog(log)
    );

    for (const log of recentLogs) {
        const targetLocationId = log.highlightTarget?.type === 'LOCATION' ? log.highlightTarget.id : undefined;
        if (targetLocationId && !threats.some(t => t.type === 'ENEMY_AGENT' && t.locationId === targetLocationId)) {
            threats.push({
                type: 'ENEMY_AGENT',
                locationId: targetLocationId,
                severity: log.baseSeverity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
                detectedTurn: log.turn,
                sourceLogId: log.id
            });
        }
    }

    const grandInsurrectionLogs = allLogs.filter((log: any) =>
        log.turn >= state.turn - 4 &&
        log.message?.toLowerCase().includes('grand insurrection')
    );

    for (const log of grandInsurrectionLogs) {
        const targetLocationId = log.highlightTarget?.type === 'LOCATION' ? log.highlightTarget.id : undefined;
        if (targetLocationId && state.locations.find(l => l.id === targetLocationId)?.faction === faction) {
            threats.push({
                type: 'GRAND_INSURRECTION',
                locationId: targetLocationId,
                severity: 'CRITICAL',
                detectedTurn: log.turn,
                sourceLogId: log.id
            });
        }
    }

    const controlledLocations = state.locations.filter(l => l.faction === faction);
    for (const loc of controlledLocations) {
        const nearbyEnemyArmies = state.armies.filter(a =>
            a.faction !== faction &&
            a.faction !== FactionId.NEUTRAL &&
            isArmyNearLocation(a, loc, state)
        );

        if (nearbyEnemyArmies.length > 0) {
            const totalStrength = nearbyEnemyArmies.reduce((sum, a) => sum + a.strength, 0);
            threats.push({
                type: 'ARMY_APPROACHING',
                locationId: loc.id,
                severity: totalStrength > 5000 ? 'CRITICAL' : totalStrength > 2000 ? 'HIGH' : 'MEDIUM',
                detectedTurn: state.turn
            });
        }
    }

    return threats;
}

function isClandestineRelatedLog(log: any): boolean {
    const keywords = [
        'undermine', 'pamphlet', 'propaganda', 'insurrection',
        'arson', 'fire', 'convoy', 'granary', 'agent', 'spy'
    ];
    const message = (log.message || '').toLowerCase();
    return keywords.some(k => message.includes(k));
}

function isArmyNearLocation(army: any, location: Location, state: GameState): boolean {
    const connectedLocations = getConnectedLocationIds(state, location.id);
    if (connectedLocations.includes(army.locationId)) {
        return true;
    }
    for (const connId of connectedLocations) {
        const nextConnections = getConnectedLocationIds(state, connId);
        if (nextConnections.includes(army.locationId)) {
            return true;
        }
    }
    return false;
}

function getConnectedLocationIds(state: GameState, locationId: string): string[] {
    const connectedIds: string[] = [];
    for (const road of state.roads || []) {
        if (road.from === locationId) {
            connectedIds.push(road.to);
        } else if (road.to === locationId) {
            connectedIds.push(road.from);
        }
    }
    return connectedIds;
}

function evaluateRoleOpportunities(
    state: GameState,
    faction: FactionId,
    leader: Character,
    currentLocation: Location,
    isInEnemyTerritory: boolean
): RoleOpportunity[] {
    const opportunities: RoleOpportunity[] = [];

    // 1. Check current location (if relevant)
    if (isInEnemyTerritory || leader.status === 'UNDERCOVER') {
        const insurrectionScore = evaluateInsurrectionTarget(state, faction, leader, currentLocation);
        if (insurrectionScore > 0) {
            opportunities.push({
                role: AILeaderRole.CLANDESTINE,
                targetLocationId: currentLocation.id,
                score: insurrectionScore,
                turnsToReach: 0,
                budgetRequired: calculateInsurrectionBudget(currentLocation),
                reasoning: `Status quo: Continue operations in ${currentLocation.name}`
            });
        }
    } else {
        // 2. Scan for NEW targets in enemy territory (Crucial fix for "Rare Assignments")
        const potentialTargets = evaluateAllInsurrectionTargets(state, faction);
        // Only consider top 3 targets to avoid spamming opportunities
        for (const target of potentialTargets.slice(0, 3)) {
            const turnsToReach = estimateTravelTime(state, leader.locationId, target.locationId);
            // Lower travel penalty for clandestine ops to encourage projection (2 per turn instead of 5)
            const travelPenalty = turnsToReach * 2;

            // Boost score slightly to encourage action over idling
            const actionBias = 10;

            if (target.score > 0) {
                opportunities.push({
                    role: AILeaderRole.CLANDESTINE,
                    targetLocationId: target.locationId,
                    score: target.score + actionBias - travelPenalty,
                    turnsToReach,
                    budgetRequired: target.goldRequired,
                    reasoning: `Deploy to ${target.location.name} (Risk: Low, Pot: High)`
                });
            }
        }
    }

    const ownedLocations = state.locations.filter(l =>
        l.faction === faction && (l.type === LocationType.CITY || l.type === 'RURAL')
    );

    for (const loc of ownedLocations) {
        const hasGovernor = state.characters.some(c =>
            c.faction === faction &&
            c.locationId === loc.id &&
            c.activeGovernorPolicies && c.activeGovernorPolicies.length > 0
        );

        if (!hasGovernor && loc.stability < 70) {
            const turnsToReach = estimateTravelTime(state, leader.locationId, loc.id);
            const score = calculateGovernorScore(loc, leader);
            // Reduced travel penalty from 5 to 2 to encourage governing neighbors (like Saltcraw)
            opportunities.push({
                role: AILeaderRole.GOVERNOR,
                targetLocationId: loc.id,
                score: score - (turnsToReach * 2),
                turnsToReach,
                reasoning: `${loc.name} needs governor (stability: ${loc.stability}%)`
            });
        }
    }

    const unstableLocations = ownedLocations.filter(l => l.stability < 60);
    for (const loc of unstableLocations) {
        const turnsToReach = estimateTravelTime(state, leader.locationId, loc.id);
        const stabilityBonus = leader.stats?.stabilityPerTurn || 0;
        if (stabilityBonus > 0) {
            opportunities.push({
                role: AILeaderRole.STABILIZER,
                targetLocationId: loc.id,
                score: (60 - loc.stability) + (stabilityBonus * 5) - (turnsToReach * 3),
                turnsToReach,
                reasoning: `Stabilize ${loc.name} (+${stabilityBonus}/turn)`
            });
        }
    }

    if (leader.stats?.ability?.includes('MANAGER')) {
        const cities = ownedLocations.filter(l => l.type === LocationType.CITY);
        for (const city of cities) {
            const hasManager = state.characters.some(c =>
                c.faction === faction && c.locationId === city.id && c.stats?.ability?.includes('MANAGER')
            );
            if (!hasManager) {
                const turnsToReach = estimateTravelTime(state, leader.locationId, city.id);
                opportunities.push({
                    role: AILeaderRole.MANAGER,
                    targetLocationId: city.id,
                    score: 50 - (turnsToReach * 5),
                    turnsToReach,
                    reasoning: `Generate +20 gold in ${city.name}`
                });
            }
        }
    }

    if (leader.stats?.ability?.includes('LEGENDARY')) {
        const threatenedLocations = ownedLocations.filter(l => l.stability < 50);
        for (const loc of threatenedLocations) {
            const hasProtector = state.characters.some(c =>
                c.faction === faction && c.locationId === loc.id && c.stats?.ability?.includes('LEGENDARY')
            );
            if (!hasProtector) {
                const turnsToReach = estimateTravelTime(state, leader.locationId, loc.id);
                opportunities.push({
                    role: AILeaderRole.PROTECTOR,
                    targetLocationId: loc.id,
                    score: (60 - loc.stability) * 2 - (turnsToReach * 4),
                    turnsToReach,
                    reasoning: `Block insurrections in ${loc.name}`
                });
            }
        }
    }

    return opportunities.sort((a, b) => b.score - a.score);
}

function evaluateInsurrectionTarget(
    state: GameState,
    faction: FactionId,
    leader: Character,
    location: Location
): number {
    const hasLegendary = state.characters.some(c =>
        c.faction === location.faction &&
        c.locationId === location.id &&
        c.stats?.ability?.includes('LEGENDARY')
    );
    if (hasLegendary) return 0;

    let score = (100 - location.stability) * 0.5;
    score += location.population / 10000;

    // Fix FactionId index error by checking property existence or using 'unknown' based access if key is unknown
    const resentment = location.resentment ? (location.resentment as any)[location.faction] || 0 : 0;
    score += resentment * 0.3;

    if (leader.stats?.ability?.includes('FIREBRAND')) {
        score *= 1.2;
    }
    if (location.stability > 60) {
        score *= 0.5;
    }
    return score;
}

function calculateInsurrectionBudget(location: Location): number {
    const base = 100;
    const populationFactor = Math.min(300, location.population / 2000);
    return Math.floor(base + populationFactor);
}

function calculateGovernorScore(location: Location, leader: Character): number {
    let score = 50;
    const statesmanship = leader.stats?.statesmanship || 3;
    score += statesmanship * 10;
    score += (70 - location.stability) * 0.5;
    if (location.type === LocationType.CITY && leader.stats?.ability?.includes('MANAGER')) {
        score += 20;
    }
    return score;
}

function estimateTravelTime(state: GameState, fromId: string, toId: string): number {
    if (fromId === toId) return 0;
    const connectedToFrom = getConnectedLocationIds(state, fromId);
    if (!connectedToFrom.length) return 5;
    if (connectedToFrom.includes(toId)) return 1;
    for (const connId of connectedToFrom) {
        const nextConnected = getConnectedLocationIds(state, connId);
        if (nextConnected.includes(toId)) return 2;
    }
    return 4;
}





export function evaluateAllInsurrectionTargets(
    state: GameState,
    faction: FactionId
): InsurrectionTarget[] {
    const targets: InsurrectionTarget[] = [];
    const enemyLocations = state.locations.filter(l =>
        l.faction !== faction &&
        l.faction !== FactionId.NEUTRAL &&
        (l.type === LocationType.CITY || l.type === 'RURAL')
    );

    for (const location of enemyLocations) {
        const hasLegendary = state.characters.some(c =>
            c.faction === location.faction && c.locationId === location.id && c.stats?.ability?.includes('LEGENDARY')
        );
        const governor = state.characters.find(c =>
            c.faction === location.faction && c.locationId === location.id && c.activeGovernorPolicies?.some(p => p === GovernorPolicy.MAKE_EXAMPLES)
        );
        const goldInvested = 200;
        const stabilityFactor = 100 - location.stability;
        const estimatedInsurgents = Math.floor(
            (goldInvested / 25) * (location.population / 100000) * stabilityFactor + 100
        );
        let score = estimatedInsurgents / 20;
        score += (100 - location.stability) * 0.5;
        if (location.type === LocationType.CITY) score += 25;
        if (hasLegendary) score = 0;

        targets.push({
            locationId: location.id,
            location,
            estimatedInsurgents,
            stabilityShockPotential: 20,
            goldRequired: calculateInsurrectionBudget(location),
            currentRisk: 0,
            score,
            blockedByLegendary: hasLegendary,
            blockedByMakeExamples: !!governor
        });
    }

    return targets.sort((a, b) => b.score - a.score);
}
