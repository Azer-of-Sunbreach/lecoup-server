/**
 * @deprecated LEGACY Counter-Insurrection Module
 * 
 * This file handles the OLD insurrection system using ON_MISSION status.
 * It is kept for backwards compatibility and potential reversion.
 * 
 * For the NEW system using log-based detection and clandestine actions, see:
 * @see Application/services/ai/strategy/insurrectionDefense.ts - New detection and defense
 * @see shared/services/domain/clandestine/insurrectionFormulas.ts - Centralized formulas
 * 
 * DO NOT MODIFY - Create new code in insurrectionDefense.ts instead.
 */

// Counter-Insurrection Anticipation Module (LEGACY)
// Detects incoming enemy insurrections and positions defensive troops

import { GameState, FactionId, AIMission, Character } from '../../../../types';

// City-Rural LOCAL pairs (instant travel)
const LOCAL_PAIRS: Record<string, string> = {
    'sunbreach_lands': 'sunbreach', 'sunbreach': 'sunbreach_lands',
    'order_lands': 'stormbay', 'stormbay': 'order_lands',
    'great_plains': 'windward', 'windward': 'great_plains',
    'hornvale_viscounty': 'hornvale', 'hornvale': 'hornvale_viscounty',
    'northern_barony': 'port_de_sable', 'port_de_sable': 'northern_barony',
    'esmarch_duchy': 'mirebridge', 'mirebridge': 'esmarch_duchy',
    'thane_duchy': 'karamos', 'karamos': 'thane_duchy',
    'gullwing_duchy': 'gullwing', 'gullwing': 'gullwing_duchy',
    'thane_peaks': 'windle', 'windle': 'thane_peaks',
    'saltcraw_viscounty': 'brinewaith', 'brinewaith': 'saltcraw_viscounty',
    'larion_islands': 'gre_au_vent', 'gre_au_vent': 'larion_islands'
};

interface InsurrectionThreat {
    spy: Character;
    targetLocationId: string;
    turnsUntilArrival: number;
    estimatedInsurgents: number;
    requiredTroops: number;
    stabilizerId?: string;
}

/**
 * Generate COUNTER_INSURRECTION missions for incoming threats.
 * Called during mission update phase.
 * 
 * @param state - Current game state
 * @param faction - Faction to process
 * @param activeMissions - Current missions (modified in place)
 */
export function generateCounterInsurrectionMissions(
    state: GameState,
    faction: FactionId,
    activeMissions: AIMission[]
): void {
    // Anti-paralysis: Max 1 new counter-insurrection mission per turn
    const existingCounterMissions = activeMissions.filter(
        m => m.type === 'COUNTER_INSURRECTION' && m.status !== 'COMPLETED'
    );
    if (existingCounterMissions.length >= 1) return;

    // Detect threats: enemy spies targeting our territories, 2 turns or less
    const threats = detectIncomingInsurrections(state, faction);
    if (threats.length === 0) return;

    // Sort by urgency (closest first) and severity
    threats.sort((a, b) => {
        if (a.turnsUntilArrival !== b.turnsUntilArrival) {
            return a.turnsUntilArrival - b.turnsUntilArrival;
        }
        return b.requiredTroops - a.requiredTroops;
    });

    // Take most urgent threat
    const threat = threats[0];

    // Check if we already have a mission for this location
    const alreadyHandled = activeMissions.some(
        m => m.targetId === threat.targetLocationId &&
            (m.type === 'COUNTER_INSURRECTION' || m.type === 'DEFEND')
    );
    if (alreadyHandled) return;

    // Check if we have troops to spare (anti-paralysis)
    const availableTroops = state.armies
        .filter(a => a.faction === faction && !a.action && !a.isSieging)
        .reduce((s, a) => s + a.strength, 0);

    // Need to keep at least 500 at each major location
    const minReserve = state.locations
        .filter(l => l.faction === faction)
        .length * 500;

    if (availableTroops - threat.requiredTroops < minReserve) {
        console.log(`[AI COUNTER-INSURRECTION ${faction}] Threat at ${threat.targetLocationId} but insufficient troops (need ${threat.requiredTroops}, can spare ${availableTroops - minReserve})`);
        return;
    }

    // Calculate priority (70-80 range, capped to avoid overwhelming campaigns)
    const urgencyBonus = threat.turnsUntilArrival <= 1 ? 10 : 0;
    const priority = Math.min(80, 70 + urgencyBonus);

    // Create mission
    const mission: AIMission = {
        id: `counter_insurrection_${threat.targetLocationId}_${state.turn}`,
        type: 'COUNTER_INSURRECTION',
        targetId: threat.targetLocationId,
        priority,
        status: 'PLANNING',
        stage: 'MOBILIZE',
        assignedArmyIds: [],
        data: {
            estimatedInsurgents: threat.estimatedInsurgents,
            turnsUntilThreat: threat.turnsUntilArrival,
            requiredTroops: threat.requiredTroops,
            stabilizerId: threat.stabilizerId
        }
    };



    activeMissions.push(mission);

    console.log(`[AI COUNTER-INSURRECTION ${faction}] Threat detected: ${threat.spy.name} targeting ${threat.targetLocationId} (${threat.turnsUntilArrival} turns)`);
    console.log(`[AI COUNTER-INSURRECTION ${faction}] Estimated ${threat.estimatedInsurgents} insurgents, deploying ${threat.requiredTroops} troops`);
}

/**
 * Detect enemy spies targeting our territories.
 */
function detectIncomingInsurrections(
    state: GameState,
    faction: FactionId
): InsurrectionThreat[] {
    const threats: InsurrectionThreat[] = [];

    // Find enemy spies on mission to our territory with <= 2 turns remaining
    const incomingSpies = state.characters.filter(c =>
        c.faction !== faction &&
        c.faction !== FactionId.NEUTRAL &&
        c.status === 'ON_MISSION' &&
        c.missionData?.targetLocationId &&
        c.turnsUntilArrival <= 2
    );

    // Collect all threatened locations for stabilizer check
    const allThreatenedLocations = incomingSpies
        .map(c => c.missionData!.targetLocationId!)
        .filter(locId => state.locations.find(l => l.id === locId)?.faction === faction);

    for (const spy of incomingSpies) {
        const targetLocId = spy.missionData!.targetLocationId!;
        const targetLoc = state.locations.find(l => l.id === targetLocId);

        // Only react if it's our territory
        if (!targetLoc || targetLoc.faction !== faction) continue;

        // Calculate estimated insurgents
        // Formula: (Gold / 25) × (pop / 100000) × (100 - stability) + 100
        const goldEstimate = 300;
        const pop = targetLoc.population;
        const stability = targetLoc.stability;

        // Check for stabilizer in local pair (pass threatened locations for safety check)
        const linkedLocId = LOCAL_PAIRS[targetLocId];
        const stabilizer = findAvailableStabilizer(state, faction, targetLocId, linkedLocId, allThreatenedLocations);

        // Adjust stability if stabilizer can help
        let effectiveStability = stability;
        let stabilizerId: string | undefined;
        if (stabilizer && spy.turnsUntilArrival >= 1) {
            const stabilityBonus = (stabilizer.stats?.stabilityPerTurn || 0) * spy.turnsUntilArrival;
            const newStability = Math.min(100, stability + stabilityBonus);

            // Only use stabilizer if reduces troop need by >= 30%
            const oldInsurgents = calculateInsurgents(goldEstimate, pop, stability);
            const newInsurgents = calculateInsurgents(goldEstimate, pop, newStability);

            if (newInsurgents < oldInsurgents * 0.7) {
                effectiveStability = newStability;
                stabilizerId = stabilizer.id;
            }
        }


        const estimatedInsurgents = calculateInsurgents(goldEstimate, pop, effectiveStability);

        // Calculate required troops (1.5x margin)
        let requiredTroops = Math.ceil(estimatedInsurgents * 1.5);

        // Republican early game bonus (turns 1-6)
        if (faction === FactionId.REPUBLICANS && state.turn <= 6) {
            requiredTroops = Math.ceil(requiredTroops * 1.2);
        }

        threats.push({
            spy,
            targetLocationId: targetLocId,
            turnsUntilArrival: spy.turnsUntilArrival,
            estimatedInsurgents,
            requiredTroops,
            stabilizerId
        });
    }

    return threats;
}

/**
 * Calculate insurgent count using the formula.
 * Formula: (Gold / 25) × (Population / 100000) × (100 - Stability) + 100
 */
function calculateInsurgents(gold: number, population: number, stability: number): number {
    return Math.floor((gold / 25) * (population / 100000) * (100 - stability) + 100);
}

/**
 * Find an available stabilizer leader in the local pair.
 * Only returns a stabilizer if:
 * - Leader is in the target location or linked pair
 * - Leader's current location has stability > 50%
 * - Leader's current location is not targeted by another insurrection
 */
function findAvailableStabilizer(
    state: GameState,
    faction: FactionId,
    targetLocId: string,
    linkedLocId: string | undefined,
    incomingThreats: string[] = []
): Character | undefined {
    const validLocations = [targetLocId];
    if (linkedLocId) validLocations.push(linkedLocId);

    return state.characters.find(c => {
        if (c.faction !== faction) return false;
        if (c.status !== 'AVAILABLE') return false;
        if (!validLocations.includes(c.locationId!)) return false;
        if ((c.stats?.stabilityPerTurn || 0) <= 0) return false; // Must be stabilizer

        // Check if leader's current location is safe to leave
        const leaderLoc = state.locations.find(l => l.id === c.locationId);
        if (!leaderLoc) return false;

        // Don't leave if stability is low
        if (leaderLoc.stability <= 50) return false;

        // Don't leave if this location is also under threat
        if (incomingThreats.includes(leaderLoc.id)) return false;

        return true;
    });
}
