/**
 * Governor Role - AI decision logic for territory governance
 * 
 * Handles policy selection for governors based on:
 * - Territory stability and threats
 * - Economic conditions
 * - Enemy agent presence
 * - Leader capabilities (MANAGER, MAN_OF_CHURCH, PARANOID, IRON_FIST)
 * 
 * @module shared/services/ai/leaders/roles
 */

import { Character, Location, FactionId } from '../../../../types';
import { GovernorPolicy, GOVERNOR_POLICY_COSTS, FULL_TIME_POLICIES } from '../../../../types/governorTypes';
import { GovernorDecision, FactionStrategy, TerritoryStatus, STABILITY_THRESHOLDS } from '../types';

// ============================================================================
// TYPES
// ============================================================================

interface GovernorContext {
    leader: Character;
    location: Location;
    territory: TerritoryStatus;
    strategy: FactionStrategy;
    availableGold: number;
    availableFood: number;
    turn: number;
}

interface PolicyScore {
    policy: GovernorPolicy;
    score: number;
    reasoning: string;
    goldCost: number;
    foodCost: number;
    isFullTime: boolean;
}

// ============================================================================
// MAIN DECISION FUNCTION
// ============================================================================

/**
 * Generate governor decisions for a leader at a location.
 */
export function makeGovernorDecisions(
    leader: Character,
    location: Location,
    territory: TerritoryStatus,
    strategy: FactionStrategy,
    availableGold: number,
    availableFood: number,
    turn: number
): GovernorDecision {
    const context: GovernorContext = {
        leader,
        location,
        territory,
        strategy,
        availableGold,
        availableFood,
        turn
    };

    const currentPolicies = leader.activeGovernorPolicies || [];
    const reasoning: string[] = [];

    // 1. Identify mandatory policies (from traits)
    const mandatoryPolicies = getMandatoryPolicies(leader);

    // 2. Score all available policies
    const policyScores = scoreAllPolicies(context, currentPolicies);

    // 3. Select best policies within constraints
    const selectedPolicies = selectOptimalPolicies(
        context,
        policyScores,
        mandatoryPolicies,
        currentPolicies
    );

    // 4. Determine which policies to activate/deactivate
    const policiesToActivate: GovernorPolicy[] = [];
    const policiesToDeactivate: GovernorPolicy[] = [];

    for (const policy of selectedPolicies) {
        if (!currentPolicies.includes(policy)) {
            policiesToActivate.push(policy);
            const scoreInfo = policyScores.find(p => p.policy === policy);
            reasoning.push(`Activate ${policy}: ${scoreInfo?.reasoning || 'Optimal choice'}`);
        }
    }

    for (const policy of currentPolicies) {
        if (!selectedPolicies.includes(policy) && !mandatoryPolicies.includes(policy)) {
            policiesToDeactivate.push(policy);
            reasoning.push(`Deactivate ${policy}: No longer optimal or affordable`);
        }
    }

    // 5. Calculate estimated stability gain
    const stabilityGain = estimateStabilityGain(selectedPolicies, leader, location);

    return {
        leaderId: leader.id,
        targetLocationId: location.id,
        policiesToActivate,
        policiesToDeactivate,
        reasoning,
        estimatedStabilityGain: stabilityGain
    };
}

// ============================================================================
// POLICY SCORING
// ============================================================================

/**
 * Get policies that are mandatory due to leader traits.
 */
function getMandatoryPolicies(leader: Character): GovernorPolicy[] {
    const mandatory: GovernorPolicy[] = [];

    // IRON_FIST trait forces MAKE_EXAMPLES
    if (leader.stats?.traits?.includes('IRON_FIST')) {
        mandatory.push(GovernorPolicy.MAKE_EXAMPLES);
    }

    return mandatory;
}

/**
 * Score all available policies for the current context.
 */
function scoreAllPolicies(
    context: GovernorContext,
    currentPolicies: GovernorPolicy[]
): PolicyScore[] {
    const scores: PolicyScore[] = [];
    const { leader, location, territory, strategy } = context;

    // Get leader stat modifiers
    const statesmanship = leader.stats?.statesmanship || 3;
    const hasManager = leader.stats?.ability?.includes('MANAGER') || false;
    const hasChurch = leader.stats?.ability?.includes('MAN_OF_CHURCH') || false;
    const hasParanoid = leader.stats?.ability?.includes('PARANOID') || false;
    const isCity = location.type === 'CITY';

    // =========================================================================
    // STABILIZE_REGION - Increase stability
    // =========================================================================
    {
        let score = 0;
        let reasoning = '';
        const goldCost = GOVERNOR_POLICY_COSTS[GovernorPolicy.STABILIZE_REGION] || 10;

        // Higher priority if stability is low
        if (territory.stability < STABILITY_THRESHOLDS.CRITICAL) {
            score = 100;
            reasoning = 'Critical stability - urgent';
        } else if (territory.stability < STABILITY_THRESHOLDS.LOW) {
            score = 80;
            reasoning = 'Low stability - high priority';
        } else if (territory.stability < STABILITY_THRESHOLDS.STABLE) {
            score = 50;
            reasoning = 'Moderate stability - maintain';
        } else {
            score = 20;
            reasoning = 'Stable - low priority';
        }

        // Bonus for high statesmanship (more effective)
        score += (statesmanship - 3) * 10;

        // Cost check
        if (context.availableGold < goldCost) {
            score = -100;
            reasoning = 'Cannot afford';
        }

        // Free for MAN_OF_CHURCH
        if (hasChurch) {
            score += 20;
            reasoning += ' (free for Man of Church)';
        }

        scores.push({
            policy: GovernorPolicy.STABILIZE_REGION,
            score,
            reasoning,
            goldCost: hasChurch ? 0 : goldCost,
            foodCost: 0,
            isFullTime: false
        });
    }

    // =========================================================================
    // APPEASE_MINDS - Reduce resentment
    // =========================================================================
    {
        let score = 0;
        let reasoning = '';
        const foodCost = calculateAppeaseMindsFood(location.population);

        // Priority based on resentment against our faction
        const resentment = (location.resentment && leader.faction !== FactionId.NEUTRAL)
            ? (location.resentment[leader.faction as keyof typeof location.resentment] || 0)
            : 0;

        if (resentment > 70) {
            score = 70;
            reasoning = 'High resentment - urgent';
        } else if (resentment > 50) {
            score = 50;
            reasoning = 'Moderate resentment';
        } else if (resentment > 30) {
            score = 30;
            reasoning = 'Low resentment';
        } else {
            score = 10;
            reasoning = 'Minimal resentment';
        }

        // Strategy preference
        if (strategy.preferAppeasement) {
            score += 20;
        }

        // Cost check
        if (context.availableFood < foodCost) {
            score = -100;
            reasoning = 'Cannot afford (food)';
        }

        // Free for MAN_OF_CHURCH
        if (hasChurch) {
            score += 20;
            reasoning += ' (free for Man of Church)';
        }

        scores.push({
            policy: GovernorPolicy.APPEASE_MINDS,
            score,
            reasoning,
            goldCost: 0,
            foodCost: hasChurch ? 0 : foodCost,
            isFullTime: false
        });
    }

    // =========================================================================
    // DENOUNCE_ENEMIES - Increase resentment against enemies
    // =========================================================================
    {
        let score = 0;
        let reasoning = '';
        const goldCost = GOVERNOR_POLICY_COSTS[GovernorPolicy.DENOUNCE_ENEMIES] || 10;

        // Priority: lower enemy resentment = more room to increase
        // This is typically a secondary action
        score = 30;
        reasoning = 'Baseline propaganda';

        // Boost if enemy agent detected
        if (territory.hasEnemyAgent) {
            score += 30;
            reasoning = 'Counter enemy propaganda';
        }

        // Cost check
        if (context.availableGold < goldCost) {
            score = -100;
            reasoning = 'Cannot afford';
        }

        scores.push({
            policy: GovernorPolicy.DENOUNCE_ENEMIES,
            score,
            reasoning,
            goldCost,
            foodCost: 0,
            isFullTime: false
        });
    }

    // =========================================================================
    // MAKE_EXAMPLES - Toggle deterrent (controversial)
    // =========================================================================
    {
        let score = 0;
        let reasoning = '';

        // Strategy preference
        if (strategy.preferMakeExamples) {
            // Nobles: toggle based on stability threshold
            if (territory.stability < STABILITY_THRESHOLDS.LOW) {
                score = 60;
                reasoning = 'Low stability - deterrent needed';
            } else if (territory.stability >= STABILITY_THRESHOLDS.LOW) {
                score = -20; // Actively want to disable
                reasoning = 'Stability restored - reduce brutality';
            }
        } else {
            // Non-Nobles: generally avoid unless necessary
            if (territory.hasEnemyAgent && territory.enemyAgentConfidence === 'CONFIRMED') {
                score = 40;
                reasoning = 'Confirmed enemy agent - deter insurrections';
            } else {
                score = -50; // Actively avoid
                reasoning = 'Generates resentment - avoid';
            }
        }

        scores.push({
            policy: GovernorPolicy.MAKE_EXAMPLES,
            score,
            reasoning,
            goldCost: 0,
            foodCost: 0,
            isFullTime: false
        });
    }

    // =========================================================================
    // HUNT_NETWORKS - Counter-espionage (FULL-TIME)
    // =========================================================================
    {
        let score = 0;
        let reasoning = '';
        const goldCost = GOVERNOR_POLICY_COSTS[GovernorPolicy.HUNT_NETWORKS] || 20;

        // Priority: based on enemy agent presence
        if (territory.hasEnemyAgent) {
            if (territory.enemyAgentConfidence === 'CONFIRMED') {
                score = 100;
                reasoning = 'Confirmed enemy agent - hunt actively';
            } else {
                score = 70;
                reasoning = 'Suspected enemy agent';
            }
        } else {
            score = 10;
            reasoning = 'No known threats - low priority';
        }

        // Bonus for PARANOID leaders
        if (hasParanoid) {
            score += 30;
            reasoning += ' (PARANOID bonus)';
        }

        // Cost check
        if (context.availableGold < goldCost) {
            score = -100;
            reasoning = 'Cannot afford';
        }

        scores.push({
            policy: GovernorPolicy.HUNT_NETWORKS,
            score,
            reasoning,
            goldCost,
            foodCost: 0,
            isFullTime: true
        });
    }

    // =========================================================================
    // IMPROVE_ECONOMY - Economic boost (FULL-TIME)
    // =========================================================================
    {
        let score = 0;
        let reasoning = '';

        // Priority based on economic situation
        if (territory.economicDamage.severity === 'MAJOR') {
            score = 60;
            reasoning = 'Major economic damage - rebuild priority';
        } else if (territory.economicDamage.severity === 'MINOR') {
            score = 40;
            reasoning = 'Minor economic damage';
        } else {
            // Default productivity boost
            score = 50;
            reasoning = 'Economic optimization';
        }

        // MANAGER bonus in cities
        if (hasManager && isCity) {
            score += 30;
            reasoning += ' (MANAGER +20g/turn)';
        }

        // Lower priority if stability is critical
        if (territory.stability < STABILITY_THRESHOLDS.CRITICAL) {
            score -= 30;
            reasoning += ' (but stability is critical)';
        }

        scores.push({
            policy: GovernorPolicy.IMPROVE_ECONOMY,
            score,
            reasoning,
            goldCost: 0,
            foodCost: 0,
            isFullTime: true
        });
    }

    // =========================================================================
    // RATIONING - Emergency food conservation (City only)
    // =========================================================================
    if (isCity) {
        let score = 0;
        let reasoning = '';

        if (territory.isFamineRisk) {
            score = 90;
            reasoning = 'Famine imminent - rationing critical';
        } else {
            score = -50; // Actively avoid (hurts stability/resentment)
            reasoning = 'No famine risk - avoid rationing';
        }

        scores.push({
            policy: GovernorPolicy.RATIONING,
            score,
            reasoning,
            goldCost: 0,
            foodCost: 0,
            isFullTime: false
        });
    }

    // =========================================================================
    // REBUILD_REGION - Fix economic damage
    // =========================================================================
    {
        let score = 0;
        let reasoning = '';
        const goldCost = GOVERNOR_POLICY_COSTS[GovernorPolicy.REBUILD_REGION] || 10;

        if (territory.economicDamage.burned) {
            if (territory.economicDamage.severity === 'MAJOR') {
                score = 80;
                reasoning = 'Major damage - rebuild urgently';
            } else {
                score = 50;
                reasoning = 'Minor damage - rebuild when possible';
            }
        } else {
            score = -100; // Nothing to rebuild
            reasoning = 'No damage to rebuild';
        }

        // Cost check
        if (context.availableGold < goldCost) {
            score = -100;
            reasoning = 'Cannot afford';
        }

        scores.push({
            policy: GovernorPolicy.REBUILD_REGION,
            score,
            reasoning,
            goldCost,
            foodCost: 0,
            isFullTime: false
        });
    }

    return scores.sort((a, b) => b.score - a.score);
}

/**
 * Select optimal policies respecting constraints.
 */
function selectOptimalPolicies(
    context: GovernorContext,
    policyScores: PolicyScore[],
    mandatoryPolicies: GovernorPolicy[],
    currentPolicies: GovernorPolicy[]
): GovernorPolicy[] {
    const selected: GovernorPolicy[] = [...mandatoryPolicies];
    let remainingGold = context.availableGold;
    let remainingFood = context.availableFood;
    let hasFullTime = false;

    // Check if we already have a full-time policy that we want to keep
    for (const policy of currentPolicies) {
        if (FULL_TIME_POLICIES.includes(policy)) {
            const scoreInfo = policyScores.find(p => p.policy === policy);
            if (scoreInfo && scoreInfo.score > 0) {
                // Keep the current full-time if still positive
                if (!selected.includes(policy)) {
                    selected.push(policy);
                }
                hasFullTime = true;
            }
        }
    }

    // Add policies by score
    for (const scoreInfo of policyScores) {
        if (scoreInfo.score <= 0) continue;
        if (selected.includes(scoreInfo.policy)) continue;

        // Check full-time constraint
        if (scoreInfo.isFullTime) {
            if (hasFullTime) continue; // Already have a full-time policy
        }

        // Check cost constraints
        if (scoreInfo.goldCost > remainingGold) continue;
        if (scoreInfo.foodCost > remainingFood) continue;

        // Add the policy
        selected.push(scoreInfo.policy);
        remainingGold -= scoreInfo.goldCost;
        remainingFood -= scoreInfo.foodCost;

        if (scoreInfo.isFullTime) {
            hasFullTime = true;
        }
    }

    return selected;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate food cost for APPEASE_MINDS based on population.
 */
function calculateAppeaseMindsFood(population: number): number {
    if (population < 25000) return 1;
    if (population <= 70000) return 2;
    if (population <= 120000) return 4;
    if (population <= 300000) return 6;
    if (population <= 500000) return 8;
    return 10;
}

/**
 * Estimate stability gain from selected policies.
 */
function estimateStabilityGain(
    policies: GovernorPolicy[],
    leader: Character,
    location: Location
): number {
    let gain = 0;
    const statesmanship = leader.stats?.statesmanship || 3;

    // Passive stability from leader
    gain += leader.stats?.stabilityPerTurn || 0;

    // Policy effects
    if (policies.includes(GovernorPolicy.STABILIZE_REGION)) {
        gain += statesmanship; // +1 per statesmanship level
    }

    // MAKE_EXAMPLES has complex effects - can help short-term but generate resentment
    if (policies.includes(GovernorPolicy.MAKE_EXAMPLES)) {
        gain += 1; // Small immediate benefit but long-term resentment cost
    }

    // RATIONING hurts stability
    if (policies.includes(GovernorPolicy.RATIONING)) {
        gain -= 2;
    }

    return gain;
}

// ============================================================================
// TERRITORY ANALYSIS
// ============================================================================

/**
 * Analyze a territory for governor AI decisions.
 */
export function analyzeTerritoryForGovernor(
    location: Location,
    characters: Character[],
    faction: FactionId,
    garrisonStrength: number,
    logs: { message: string; turn: number; baseSeverity: string }[]
): TerritoryStatus {
    // Check for ACTUAL enemy UNDERCOVER agents in territory or linked location
    // This replaces the unreliable log-based detection logs
    const enemyAgents = characters.filter(c =>
        c.faction !== faction &&
        c.faction !== FactionId.NEUTRAL &&
        c.status === 'UNDERCOVER' &&
        (c.locationId === location.id) // Note: Linked location check is done in Processor for movement
    );

    const hasEnemyAgent = enemyAgents.length > 0;
    const enemyAgentConfidence = hasEnemyAgent ? 'CONFIRMED' as const : 'NONE' as const;

    // Check stability trend (simplified - could track history)
    let stabilityTrend: 'RISING' | 'STABLE' | 'FALLING' | 'CRITICAL' = 'STABLE';
    if (location.stability < 30) {
        stabilityTrend = 'CRITICAL';
    } else if (location.stability < 50) {
        stabilityTrend = 'FALLING';
    }

    // Check for economic damage (burned buildings/crops)
    const burnedFields = location.burnedFields || 0;
    const burnedDistricts = location.burnedDistricts || 0;
    const hasBurnDamage = burnedFields > 0 || burnedDistricts > 0;

    let burnSeverity = 'NONE';
    if (burnedFields > 1 || burnedDistricts > 1) {
        burnSeverity = 'MAJOR';
    } else if (hasBurnDamage) {
        burnSeverity = 'MINOR';
    }

    // Check for famine risk (city with low food)
    const isFamineRisk = location.type === 'CITY' && (location.foodStock || 0) < 10;

    // Check if needs governor
    const hasGovernor = characters.some(c =>
        c.faction === faction &&
        c.locationId === location.id &&
        c.status === 'GOVERNING'
    );

    // Check if needs protector
    const hasLegendary = characters.some(c =>
        c.faction === faction &&
        c.locationId === location.id &&
        c.stats?.ability?.includes('LEGENDARY')
    );

    // Check if needs stabilizer
    const hasStabilizer = characters.some(c =>
        c.faction === faction &&
        c.locationId === location.id &&
        (c.stats?.stabilityPerTurn || 0) > 0
    );

    return {
        location,
        stability: location.stability,
        stabilityTrend,
        hasEnemyAgent,
        enemyAgentConfidence,
        garrisonStrength,
        isUnderSiege: false, // Would need siege state check
        isFamineRisk,
        economicDamage: {
            burned: hasBurnDamage,
            severity: burnSeverity as 'NONE' | 'MINOR' | 'MAJOR'
        },
        needsGovernor: !hasGovernor,
        needsProtector: !hasLegendary && location.stability < 50,
        needsStabilizer: !hasStabilizer && location.stability < 60
    };
}

/**
 * Check if a log message is related to clandestine activity.
 */
function isClandestineLog(message: string): boolean {
    const keywords = [
        'undermine', 'pamphlet', 'propaganda', 'insurrection',
        'arson', 'fire', 'convoy', 'granary', 'agent', 'spy',
        'burned', 'sabotage'
    ];
    const lowerMessage = message.toLowerCase();
    return keywords.some(k => lowerMessage.includes(k));
}
