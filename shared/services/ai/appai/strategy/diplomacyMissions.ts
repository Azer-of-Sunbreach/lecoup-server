// Diplomacy Missions Module - INSURRECTION, NEGOTIATE, STABILIZE missions
//
// DEPRECATED: Legacy insurrection system - replaced by leaders/clandestineAI.ts
// The new system uses GRAND_INSURRECTION through the clandestine agent mechanism
// instead of the mission-based approach. Set flag to false to rollback.
const LEGACY_INSURRECTION_DISABLED = true;

import { GameState, FactionId, AIMission } from '../../../../types';
import { AITheater, FactionPersonality } from '../types';
import { INSURRECTION_PRIORITIES } from './types';

/**
 * Generate diplomacy-related missions: INSURRECTION, NEGOTIATE, STABILIZE.
 * 
 * @param state - Current game state
 * @param faction - Faction to generate for
 * @param theaters - Analyzed theaters
 * @param profile - Faction personality
 * @param activeMissions - Current active missions (modified in place)
 */
export function generateDiplomacyMissions(
    state: GameState,
    faction: FactionId,
    theaters: AITheater[],
    profile: FactionPersonality,
    activeMissions: AIMission[]
): void {
    const activeDiplomacy = activeMissions.filter(m =>
        m.type === 'INSURRECTION' || m.type === 'NEGOTIATE'
    );

    // Cap at 12 diplomatic missions
    if (activeDiplomacy.length >= 12) return;

    if (profile.subversiveness > 0.3) {
        generateInsurrectionMissions(state, faction, profile, activeMissions);
        generateNegotiateMissions(state, faction, theaters, profile, activeMissions);
    }

    generateStabilizeMissions(state, faction, activeMissions);
}

/**
 * Generate INSURRECTION missions against enemy factions.
 * 
 * Strategy:
 * - Cooldown: 4 turns per target per faction
 * - Softening: Bonus for targets already destabilized (40-60% stability)
 * - Firebrands: Should be used on targets already softened (< 50% stability)
 * 
 * Republicans can generate up to 2 per turn (their specialty).
 */
function generateInsurrectionMissions(
    state: GameState,
    faction: FactionId,
    profile: FactionPersonality,
    activeMissions: AIMission[]
): void {
    // Guard: Skip legacy insurrection generation if new system is active
    if (LEGACY_INSURRECTION_DISABLED) {
        console.log(`[AI ${faction}] Legacy insurrection disabled - using new leader AI`);
        return;
    }

    // FIX BUG IA 1: All factions can prepare up to 2 insurrections per turn
    const maxNew = 2;

    // Count how many we've already created this turn
    let newInsurrectionsThisTurn = activeMissions.filter(m =>
        m.type === 'INSURRECTION' &&
        parseInt(m.id.split('_').pop() || '0') === state.turn
    ).length;

    // Loop to generate up to maxNew insurrections
    while (newInsurrectionsThisTurn < maxNew) {
        console.log(`[AI INSURRECTION ${faction}] Generating insurrection ${newInsurrectionsThisTurn + 1}/${maxNew} for turn ${state.turn}`);

        // Find valid targets with cooldown check
        const targets = state.locations.filter(l => {
            if (l.faction === faction || l.faction === 'NEUTRAL') return false;
            if (l.stability >= 70) return false;
            if (activeMissions.some(m => m.targetId === l.id && m.type === 'INSURRECTION')) return false;

            // COOLDOWN CHECK: 4 turns between insurrections on same target by same faction
            const lastInsurrectionTurn = getLastInsurrectionTurn(state, faction, l.id);
            if (lastInsurrectionTurn >= 0 && state.turn - lastInsurrectionTurn < 4) {
                return false; // Still in cooldown
            }

            return true;
        });

        if (targets.length === 0) break; // No more valid targets

        // Calculate defensive pressure (for scoring malus)
        const myTotalStrength = state.armies
            .filter(a => a.faction === faction)
            .reduce((s, a) => s + a.strength, 0);
        const enemyThreat = state.armies
            .filter(a => a.faction !== faction && a.faction !== FactionId.NEUTRAL)
            .reduce((s, a) => s + a.strength, 0);
        const defensivePressure = enemyThreat > myTotalStrength * 1.2 ? 1 : 0; // Under threat

        // Get average leader insurrection impact for estimation
        // Leaders reduce stability by their insurrectionValue when preparing insurrection
        const availableLeaders = state.characters.filter(c =>
            c.faction === faction &&
            c.status === 'AVAILABLE'
        );
        const avgInsurrectionValue = availableLeaders.length > 0
            ? availableLeaders.reduce((sum, l) => sum + (l.stats?.insurrectionValue || 20), 0) / availableLeaders.length
            : 20;

        // Score targets with ENHANCED strategy
        const scoredTargets = targets.map(t => {
            let score = 0;

            // --- 1. INSURGENT COUNT ESTIMATION ---
            // Formula: (Gold * 25) * (Population / 100000) * (100 - Stability) + 100
            // Estimate with 300 gold investment (typical)
            const estimatedGold = 300;
            const estimatedStabilityAfterLeader = Math.max(0, t.stability - avgInsurrectionValue);
            const estimatedInsurgents = Math.floor(
                (estimatedGold * 25) * (t.population / 100000) * ((100 - estimatedStabilityAfterLeader) / 100) + 100
            );

            // Scale insurgent count to score (1000 insurgents = 50 points)
            score += estimatedInsurgents / 20;

            // --- 2. BASE INSTABILITY BONUS ---
            score += (100 - t.stability) * 0.5;

            // --- 3. SUB-50% STABILITY BONUS ---
            // If insurrection would push territory below 50%, big bonus
            // (forces enemy to restabilize or risk neutral insurrections)
            if (t.stability > 50 && estimatedStabilityAfterLeader < 50) {
                score += 40; // Major strategic value
            }
            // Already below 50% - moderate bonus for finishing blow
            if (t.stability <= 50 && t.stability > 30) {
                score += 25;
            }
            // Critical low stability - time to strike decisively
            if (t.stability <= 30) {
                score += 35;
            }

            // --- 4. POPULATION BONUS ---
            score += t.population / 5000; // 100k pop = 20 points

            // --- 5. STRATEGIC BONUSES ---
            // Campaign support
            if (activeMissions.some(m => m.type === 'CAMPAIGN' && m.targetId === t.id)) {
                score += 50;
            }
            // Cities are higher value
            if (t.type === 'CITY') score += 25;
            // Faction priority targets
            const priorities = INSURRECTION_PRIORITIES[faction] || [];
            if (priorities.includes(t.id)) score += 50;

            // PORT-RURAL PAIRING STRATEGY
            const portRuralPairs: Record<string, string> = {
                'port_de_sable': 'northern_barony', 'northern_barony': 'port_de_sable',
                'gre_au_vent': 'larion_islands', 'larion_islands': 'gre_au_vent',
                'mirebridge': 'esmarch_duchy', 'esmarch_duchy': 'mirebridge',
                'sunbreach': 'sunbreach_lands', 'sunbreach_lands': 'sunbreach',
            };
            const linkedPair = portRuralPairs[t.id];
            if (linkedPair) {
                const pairLocation = state.locations.find(l => l.id === linkedPair);
                if (pairLocation?.faction === faction) {
                    score += 35; // Complete the pair
                }
            }

            // Softening history bonus
            const previousAttempts = countPreviousInsurrections(state, faction, t.id);
            if (previousAttempts > 0 && previousAttempts < 3) {
                score += 15;
            }

            // --- 6. DEFENSIVE MALUS ---
            // If under significant threat, reduce priority to save gold for recruitment
            if (defensivePressure) {
                score -= 30; // Significant penalty when defense is needed
            }

            return { target: t, score };
        }).sort((a, b) => b.score - a.score);


        // Check if best target meets threshold
        console.log(`[AI INSURRECTION ${faction}] Found ${scoredTargets.length} valid targets. Best score: ${scoredTargets[0]?.score || 0}`);
        if (scoredTargets.length === 0 || scoredTargets[0].score <= 40) break;




        const best = scoredTargets[0];

        // Determine if we should request a Firebrand (for softened targets)
        const shouldUseFirebrand = best.target.stability < 50;

        activeMissions.push({
            id: `insurrect_${best.target.id}_${state.turn}`,
            type: 'INSURRECTION',
            priority: 60 + (best.score / 2),
            status: 'PLANNING',
            targetId: best.target.id,
            stage: 'PLANNING',
            assignedArmyIds: [],
            data: {
                requiredGold: 200,
                preferFirebrand: shouldUseFirebrand,
                isSofteningAttack: best.target.stability >= 40 && best.target.stability <= 60
            }
        });

        if (shouldUseFirebrand) {
            console.log(`[AI INSURRECTION ${faction}] Softened target ${best.target.id} (${best.target.stability}%) - Requesting Firebrand`);
        }

        newInsurrectionsThisTurn++;
    }
}

/**
 * Get the last turn when this faction attempted an insurrection on this target.
 * Returns -1 if never attempted.
 */
function getLastInsurrectionTurn(state: GameState, faction: FactionId, targetId: string): number {
    // Check mission history in AI state
    const missions = state.aiState?.[faction]?.missions || [];

    // Find completed/failed insurrection missions for this target
    // The mission ID format is: insurrect_{targetId}_{turn}
    let lastTurn = -1;

    for (const m of missions) {
        if (m.type === 'INSURRECTION' && m.targetId === targetId) {
            const turnMatch = m.id.match(/_(\d+)$/);
            if (turnMatch) {
                const missionTurn = parseInt(turnMatch[1]);
                if (missionTurn > lastTurn) {
                    lastTurn = missionTurn;
                }
            }
        }
    }

    return lastTurn;
}

/**
 * Count how many times this faction has targeted this location with insurrections.
 */
function countPreviousInsurrections(state: GameState, faction: FactionId, targetId: string): number {
    const missions = state.aiState?.[faction]?.missions || [];
    return missions.filter(m =>
        m.type === 'INSURRECTION' &&
        m.targetId === targetId
    ).length;
}

/**
 * Generate NEGOTIATE missions for neutral territories.
 */
function generateNegotiateMissions(
    state: GameState,
    faction: FactionId,
    theaters: AITheater[],
    profile: FactionPersonality,
    activeMissions: AIMission[]
): void {
    // Only Republicans and Conspirators negotiate
    if (faction !== FactionId.REPUBLICANS && faction !== FactionId.CONSPIRATORS) return;
    if (profile.expansionism <= 0.3) return;

    // Find neutral neighbors
    const neutralNeighbors: string[] = [];
    for (const theater of theaters) {
        theater.borderLocationIds.forEach(bid => {
            const loc = state.locations.find(l => l.id === bid);
            if (loc && loc.faction === 'NEUTRAL') {
                neutralNeighbors.push(bid);
            }
        });
    }

    for (const nid of neutralNeighbors) {
        if (activeMissions.some(m => m.targetId === nid && m.type === 'NEGOTIATE')) continue;

        activeMissions.push({
            id: `negotiate_${nid}_${state.turn}`,
            type: 'NEGOTIATE',
            priority: 50,
            status: 'PLANNING',
            targetId: nid,
            stage: 'PLANNING',
            assignedArmyIds: [],
            data: { currentNegotiationPoints: 0 }
        });
    }
}

/**
 * Generate STABILIZE missions for unstable owned territories.
 */
function generateStabilizeMissions(
    state: GameState,
    faction: FactionId,
    activeMissions: AIMission[]
): void {
    const unstableOwned = state.locations.filter(l =>
        l.faction === faction && l.stability < 80
    );

    for (const loc of unstableOwned) {
        if (activeMissions.some(m => m.targetId === loc.id && m.type === 'STABILIZE')) continue;

        let priority = (100 - loc.stability) / 2;
        if (loc.type === 'CITY') priority += 20;
        if (faction === FactionId.CONSPIRATORS) priority += 10;

        if (priority > 30) {
            activeMissions.push({
                id: `stabilize_${loc.id}_${state.turn}`,
                type: 'STABILIZE',
                priority: priority,
                status: 'PLANNING',
                targetId: loc.id,
                stage: 'ONGOING',
                assignedArmyIds: [],
                data: { targetStability: 75 }
            });
        }
    }
}
