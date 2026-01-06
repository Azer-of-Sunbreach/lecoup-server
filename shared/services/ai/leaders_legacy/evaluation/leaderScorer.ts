/**
 * Leader Scorer - Scores each leader for each possible role
 * 
 * Uses leader stats, abilities, and traits to calculate suitability scores
 * for different roles (Governor, Clandestine, Commander, etc.)
 * 
 * @see AI_LEADER_REFACTORING_SPECS.md Section 3-5
 */

import { Character, FactionId, Location, LocationType } from '../../../../types';
import { LeaderStatLevel, CharacterTrait } from '../../../../types/leaderTypes';
import {
    AILeaderRole,
    LeaderScoreBreakdown,
    LeaderSituation,
    FactionStrategy
} from '../types';
import { getLeaderProfile, getRoleScoreBonus, LeaderRole } from '../../leaders_config';

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

/**
 * Scores a leader for a specific role.
 * 
 * @param leader The leader to score
 * @param role The role to evaluate
 * @param situation Current situation analysis
 * @param strategy Faction strategy configuration
 * @returns Score breakdown with total and component scores
 */
export function scoreLeaderForRole(
    leader: Character,
    role: AILeaderRole,
    situation: LeaderSituation,
    strategy: FactionStrategy
): LeaderScoreBreakdown {
    const breakdown: LeaderScoreBreakdown = {
        baseScore: 0,
        statModifiers: {},
        abilityModifiers: {},
        traitModifiers: {},
        situationalModifiers: {},
        totalScore: 0
    };

    switch (role) {
        case AILeaderRole.GOVERNOR:
            calculateGovernorScore(leader, situation, strategy, breakdown);
            break;
        case AILeaderRole.CLANDESTINE:
            calculateClandestineScore(leader, situation, strategy, breakdown);
            break;
        case AILeaderRole.COMMANDER:
            calculateCommanderScore(leader, situation, breakdown);
            break;
        // case AILeaderRole.MANAGER: REMOVED / MERGED INTO GOVERNOR
        case AILeaderRole.STABILIZER:
            calculateStabilizerScore(leader, situation, breakdown);
            break;
        case AILeaderRole.PROTECTOR:
            calculateProtectorScore(leader, situation, breakdown);
            break;
        default:
            breakdown.baseScore = 0;
    }

    // Priority Role Bonus (from leaders_config user specs)
    const profile = getLeaderProfile(leader.name);
    if (profile) {
        // Map AILeaderRole to LeaderRole for config lookup
        let configRole: LeaderRole | undefined;
        switch (role) {
            case AILeaderRole.GOVERNOR: configRole = 'GOVERNOR'; break;
            case AILeaderRole.CLANDESTINE: configRole = 'AGENT'; break;
            case AILeaderRole.COMMANDER: configRole = 'COMMANDER'; break;
            case AILeaderRole.STABILIZER: configRole = 'STABILIZER'; break;
            case AILeaderRole.PROTECTOR: configRole = 'PROTECTOR'; break;
        }

        if (configRole) {
            const priorityBonus = getRoleScoreBonus(profile, configRole);
            if (priorityBonus !== 0) {
                breakdown.situationalModifiers['ROLE_PRIORITY'] = priorityBonus;
            }
        }
    }

    // VIP penalty for high-risk roles
    if (strategy.vipLeaders.includes(leader.id)) {
        if (role === AILeaderRole.CLANDESTINE) {
            breakdown.situationalModifiers['VIP_PROTECTION'] = -30;
        }
    }

    // Calculate total
    breakdown.totalScore = breakdown.baseScore
        + (Object.values(breakdown.statModifiers) as (number | undefined)[]).reduce((a, b) => (a || 0) + (b || 0), 0)
        + Object.values(breakdown.abilityModifiers).reduce((a, b) => (a || 0) + (b || 0), 0)
        + Object.values(breakdown.traitModifiers).reduce((a, b) => (a || 0) + (b || 0), 0)
        + Object.values(breakdown.situationalModifiers).reduce((a, b) => (a || 0) + (b || 0), 0);

    return breakdown;
}

// ============================================================================
// ROLE-SPECIFIC SCORING
// ============================================================================

/**
 * Scores a leader for the GOVERNOR role.
 */
function calculateGovernorScore(
    leader: Character,
    situation: LeaderSituation,
    strategy: FactionStrategy,
    breakdown: LeaderScoreBreakdown
): void {
    breakdown.baseScore = 40;

    // Statesmanship is primary stat for governors
    const statesmanship = leader.stats?.statesmanship || LeaderStatLevel.CAPABLE;
    breakdown.statModifiers.statesmanship = (statesmanship - 3) * 15; // -30 to +30

    // Stability bonus contribution
    const stabilityBonus = leader.stats?.stabilityPerTurn || 0;
    if (stabilityBonus > 0) {
        breakdown.statModifiers['stabilityBonus'] = stabilityBonus * 5;
    } else if (stabilityBonus < 0) {
        breakdown.statModifiers['stabilityPenalty'] = stabilityBonus * 10; // Heavier penalty
    }

    // Ability modifiers
    if (leader.stats?.ability?.includes('MAN_OF_CHURCH')) {
        breakdown.abilityModifiers['MAN_OF_CHURCH'] = 20; // Free policies
    }
    if (leader.stats?.ability?.includes('PARANOID')) {
        breakdown.abilityModifiers['PARANOID'] = 15; // Better counter-espionage
    }
    if (leader.stats?.ability?.includes('LEGENDARY')) {
        breakdown.abilityModifiers['LEGENDARY'] = 25; // Blocks enemy insurrections
    }
    if (leader.stats?.ability?.includes('MANAGER')) {
        breakdown.abilityModifiers['MANAGER'] = 20; // +20 gold/turn in cities
    }

    // Governor Quality (from profile)
    const profile = getLeaderProfile(leader.name);
    if (profile) {
        if (profile.governorQuality === 'GREAT') breakdown.statModifiers['QUALITY_GREAT'] = 15;
        else if (profile.governorQuality === 'WEAK') breakdown.statModifiers['QUALITY_WEAK'] = -15;
    }

    // Trait modifiers
    if (leader.stats?.traits?.includes(CharacterTrait.IRON_FIST)) {
        // IRON_FIST forces MAKE_EXAMPLES - good if stability low, bad otherwise
        if (situation.currentLocation.stability < 50) {
            breakdown.traitModifiers['IRON_FIST'] = 10;
        } else {
            breakdown.traitModifiers['IRON_FIST'] = -15; // May hurt stability
        }
    }

    // Situational: Location needs governor
    const threats = situation.nearbyThreats.filter(t =>
        t.type === 'ENEMY_AGENT' || t.type === 'GRAND_INSURRECTION'
    );
    if (threats.length > 0) {
        breakdown.situationalModifiers['THREAT_RESPONSE'] = threats.length * 10;
    }

    // Situational: Already in position
    if (situation.isInFriendlyTerritory) {
        breakdown.situationalModifiers['IN_POSITION'] = 10;
    }
}

/**
 * Scores a leader for the CLANDESTINE role.
 */
function calculateClandestineScore(
    leader: Character,
    situation: LeaderSituation,
    strategy: FactionStrategy,
    breakdown: LeaderScoreBreakdown
): void {
    breakdown.baseScore = 35;

    // Clandestine Ops is primary stat
    const clandestineOps = leader.stats?.clandestineOps || LeaderStatLevel.CAPABLE;
    breakdown.statModifiers.clandestineOps = (clandestineOps - 3) * 15;

    // Discretion reduces risk
    const discretion = leader.stats?.discretion || LeaderStatLevel.CAPABLE;
    breakdown.statModifiers.discretion = (discretion - 3) * 10;

    // Ability modifiers
    if (leader.stats?.ability?.includes('FIREBRAND')) {
        breakdown.abilityModifiers['FIREBRAND'] = 20; // +33% insurgents
    }
    if (leader.stats?.ability?.includes('GHOST')) {
        breakdown.abilityModifiers['GHOST'] = 25; // Safe entry/exit
    }
    if (leader.stats?.ability?.includes('DAREDEVIL')) {
        breakdown.abilityModifiers['DAREDEVIL'] = 15; // Survival chance
    }

    // Trait modifiers
    if (leader.stats?.traits?.includes(CharacterTrait.SCORCHED_EARTH)) {
        // Forces destructive actions - risky but effective
        breakdown.traitModifiers['SCORCHED_EARTH'] = 5;
    }
    if (leader.stats?.traits?.includes(CharacterTrait.FAINT_HEARTED)) {
        // Cannot do assassinations or arson
        breakdown.traitModifiers['FAINT_HEARTED'] = -10;
    }

    // Stability penalty as clandestine - negative is actually good here
    // Leaders with negative stability effects are meant for clandestine work
    const stabilityBonus = leader.stats?.stabilityPerTurn || 0;
    if (stabilityBonus < 0) {
        breakdown.situationalModifiers['NATURAL_AGENT'] = Math.abs(stabilityBonus) * 3;
    }

    // Situational: Already undercover
    if (situation.isUndercover) {
        breakdown.situationalModifiers['ALREADY_UNDERCOVER'] = 20;
    }

    // Situational: Has budget
    if (situation.budgetRemaining > 100) {
        breakdown.situationalModifiers['HAS_BUDGET'] = 10;
    }

    // Situational: Low risk environment
    if (situation.currentRisk < strategy.riskThresholds.goDark) {
        breakdown.situationalModifiers['LOW_RISK'] = 15;
    }
}

/**
 * Scores a leader for the COMMANDER role.
 */
function calculateCommanderScore(
    leader: Character,
    situation: LeaderSituation,
    breakdown: LeaderScoreBreakdown
): void {
    breakdown.baseScore = 30;

    // Command bonus is primary
    const commandBonus = leader.stats?.commandBonus || 0;
    breakdown.statModifiers.commandBonus = commandBonus * 2; // +0% to +60%

    // Abilities that help in combat
    if (leader.stats?.ability?.includes('LEGENDARY')) {
        breakdown.abilityModifiers['LEGENDARY'] = 10; // Morale boost
    }

    // Negative stability is bad for commander (destabilizes liberated areas)
    const stabilityBonus = leader.stats?.stabilityPerTurn || 0;
    if (stabilityBonus < 0) {
        breakdown.traitModifiers['DESTABILIZER'] = stabilityBonus * 3;
    }

    // Situational: Already leading army
    if (leader.assignedArmyId) {
        breakdown.situationalModifiers['HAS_ARMY'] = 15;
    }

    // Situational: Near friendly armies
    const armyNearby = situation.roleOpportunities.some(
        r => r.role === AILeaderRole.COMMANDER && r.turnsToReach <= 1
    );
    if (armyNearby) {
        breakdown.situationalModifiers['ARMY_NEARBY'] = 10;
    }
}

/**
 * Scores a leader for the MANAGER role.
 */
// calculateManagerScore removed - logic merged into Governor

/**
 * Scores a leader for the STABILIZER role.
 */
function calculateStabilizerScore(
    leader: Character,
    situation: LeaderSituation,
    breakdown: LeaderScoreBreakdown
): void {
    const stabilityBonus = leader.stats?.stabilityPerTurn || 0;

    // Positive stability bonus is required
    if (stabilityBonus <= 0) {
        breakdown.baseScore = -100; // Disqualify
        return;
    }

    breakdown.baseScore = 40;
    breakdown.statModifiers['stabilityBonus'] = stabilityBonus * 8;

    // Statesmanship helps
    const statesmanship = leader.stats?.statesmanship || LeaderStatLevel.CAPABLE;
    breakdown.statModifiers.statesmanship = (statesmanship - 3) * 5;

    // Situational: Unstable area nearby
    const unstableThreats = situation.nearbyThreats.filter(t => t.type === 'LOW_STABILITY');
    if (unstableThreats.length > 0) {
        breakdown.situationalModifiers['NEEDED'] = unstableThreats.length * 15;
    }
}

/**
 * Scores a leader for the PROTECTOR role.
 */
function calculateProtectorScore(
    leader: Character,
    situation: LeaderSituation,
    breakdown: LeaderScoreBreakdown
): void {
    // LEGENDARY ability is required
    if (!leader.stats?.ability?.includes('LEGENDARY')) {
        breakdown.baseScore = -100; // Disqualify
        return;
    }

    breakdown.baseScore = 50;

    // Also has FIREBRAND - good for counter-insurrection combat
    if (leader.stats?.ability?.includes('FIREBRAND')) {
        breakdown.abilityModifiers['FIREBRAND'] = 10;
    }

    // Positive stability helps
    const stabilityBonus = leader.stats?.stabilityPerTurn || 0;
    if (stabilityBonus > 0) {
        breakdown.statModifiers['stabilityBonus'] = stabilityBonus * 5;
    }

    // Situational: Insurrection threat detected
    const insurrectionThreats = situation.nearbyThreats.filter(
        t => t.type === 'GRAND_INSURRECTION' || t.type === 'ENEMY_AGENT'
    );
    if (insurrectionThreats.length > 0) {
        breakdown.situationalModifiers['THREAT_DETECTED'] = insurrectionThreats.length * 20;
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Gets the best role for a leader based on scores.
 */
export function getBestRole(
    leader: Character,
    situation: LeaderSituation,
    strategy: FactionStrategy,
    availableRoles: AILeaderRole[] = Object.values(AILeaderRole).filter(r => r !== AILeaderRole.IDLE)
): { role: AILeaderRole; score: number; breakdown: LeaderScoreBreakdown } {
    let bestRole = AILeaderRole.IDLE;
    let bestScore = -Infinity;
    let bestBreakdown: LeaderScoreBreakdown = {
        baseScore: 0,
        statModifiers: {},
        abilityModifiers: {},
        traitModifiers: {},
        situationalModifiers: {},
        totalScore: 0
    };

    for (const role of availableRoles) {
        const breakdown = scoreLeaderForRole(leader, role, situation, strategy);
        if (breakdown.totalScore > bestScore) {
            bestScore = breakdown.totalScore;
            bestRole = role;
            bestBreakdown = breakdown;
        }
    }

    return { role: bestRole, score: bestScore, breakdown: bestBreakdown };
}

/**
 * Ranks all leaders for a specific role.
 */
export function rankLeadersForRole(
    leaders: Character[],
    role: AILeaderRole,
    situations: Map<string, LeaderSituation>,
    strategy: FactionStrategy
): Array<{ leader: Character; score: number; breakdown: LeaderScoreBreakdown }> {
    return leaders
        .map(leader => {
            const situation = situations.get(leader.id);
            if (!situation) return null;

            const breakdown = scoreLeaderForRole(leader, role, situation, strategy);
            return { leader, score: breakdown.totalScore, breakdown };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null && r.score > 0)
        .sort((a, b) => b.score - a.score);
}
