/**
 * Detection Risk Service
 * 
 * Calculates the probability of a clandestine leader being detected and caught 
 * while operating in enemy territory.
 */

import { Location, Character, Army, FactionId } from '../../../types';
import { CLANDESTINE_ACTION_RISKS, ActiveClandestineAction } from '../../../types/clandestineTypes';
import { getResentment } from '../politics/resentment';

/**
 * Calculates the total probability (0.0 to 1.0) of a leader being caught
 * based on their active actions, location stats, and leader stats.
 */
export function calculateDetectionRisk(
    location: Location,
    activeActions: ActiveClandestineAction[],
    infiltratingLeader: Character,
    allArmies: Army[],
    governor?: Character,
    isCounterEspionageActive: boolean = false
): number {
    // 1. Calculate Regional Factors
    // -----------------------------

    // Controlling faction soldiers in the region
    const soldierCount = allArmies
        .filter(a => a.locationId === location.id && a.faction === location.faction)
        .reduce((sum, a) => sum + a.strength, 0);

    const population = Math.max(1, location.population); // Prevent division by zero
    const stability = location.stability;
    const resentment = getResentment(location, location.faction); // Resentment against controller

    // Formula Part A: ((Soldiers/2) * ((Stability + 1)/20)) / Population
    const partA = ((soldierCount / 5) * ((stability + 1) / 20)) / population;

    // Formula Part B: ((Population + Soldiers) / (20000 * ((Resentment/100)+1)))
    // Resentment/100 + 1 ranges from 1.0 to 2.0
    const resentmentFactor = (resentment / 100) + 1;
    const partB = (population + soldierCount) / (20000 * resentmentFactor);

    const baseRegionalRisk = partA * partB;

    // 2. Calculate Risk per Action (if any)
    // ----------------------------
    let accumulatedRisk = 0;

    if (activeActions && activeActions.length > 0) {
        activeActions.forEach(action => {
            const riskLevel = CLANDESTINE_ACTION_RISKS[action.actionId] || 0;

            // Base risk for this action
            let actionRisk = riskLevel * baseRegionalRisk;

            // Modifier: Counter-Espionage (Governor Action)
            // If active, increases each action's risk by 5% (0.05)
            if (isCounterEspionageActive) {
                actionRisk += 0.05;
            }

            accumulatedRisk += actionRisk;
        });

        // Modifier: Infiltrating Leader Discretion (only applies if doing actions)
        // Formula: Risk - ((Discretion/10) - 0.2)
        // Discretion 1 (Inept): - (0.1 - 0.2) = - (-0.1) = +0.10 (+10%)
        // Discretion 3 (Capable): - (0.3 - 0.2) = - (0.1) = -0.10 (-10%)
        const discretion = infiltratingLeader.stats.discretion || 1; // Default to 1 (Inept) if missing
        accumulatedRisk = accumulatedRisk - ((discretion / 10) - 0.2);

        // Modifier: Governor Statesmanship (only if Counter-Espionage is active)
        // Formula: Risk + ((Statesmanship/20) - 0.1)
        // Statesmanship 1 (Inept): + (0.05 - 0.1) = -0.05 (-5%)
        // Statesmanship 3 (Capable): + (0.15 - 0.1) = +0.05 (+5%)
        if (isCounterEspionageActive && governor) {
            const statesmanship = governor.stats.statesmanship || 1;
            accumulatedRisk = accumulatedRisk + ((statesmanship / 20) - 0.1);
        }
    }

    // 3. Apply Global Modifiers (always apply, even with no actions)
    // -------------------------

    // First, clamp action-based risk to minimum 0 (before PARANOID)
    // This prevents discretion from creating "negative" risk that would offset PARANOID
    accumulatedRisk = Math.max(0, accumulatedRisk);

    // Modifier: PARANOID ability (passive, always active if governor has it)
    // Establishes a FLOOR of 15% - paranoid governors are always suspicious
    // This is added AFTER clamping action risk to 0, so it's truly additive:
    // - Leader doing nothing with PARANOID governor: 0 + 15% = 15%
    // - Leader with 4% action risk: 4% + 15% = 19%
    // - Leader with high discretion reducing action risk to 0%: 0 + 15% = 15%
    if (governor?.stats.ability.includes('PARANOID')) {
        accumulatedRisk += 0.15;
    }

    // Final clamp to [0, 1]
    return Math.max(0, Math.min(1, accumulatedRisk));
}
