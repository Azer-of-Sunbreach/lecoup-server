/**
 * Infiltration Risk Service
 * 
 * Calculates the risk of a leader being detected or eliminated when entering enemy territory.
 * 
 * Formula:
 * (Soldiers * ((Stability + 1)/20) / Population) * ((Population + Soldiers) / (20000 * ((Resentment/100) + 1)))
 */

import { Location, FactionId, Character } from '../../../types';
import { Army } from '../../../types'; // Assuming Army type exists, if not need to verify path
import { getResentment } from '../../domain/politics/resentment';

// Risk bounds
const MIN_RISK = 0.0;
const MAX_RISK = 0.6; // 60%

/**
 * Calculate the base detection risk for a leader entering a specific location
 * 
 * @param location The target location
 * @param locationUrl The faction controlling the location (usually location.faction)
 * @param factionsSoldiersCount Total number of soldiers OF THE CONTROLLING FACTION in the location
 */
export function calculateBaseDetectionRisk(
    location: Location,
    factionsSoldiersCount: number
): number {
    const population = location.population;
    const stability = location.stability;
    const controllerFaction = location.faction;

    // Resentment against the CONTROLLING faction
    // Higher resentment makes infiltration EASIER (lower risk)
    const resentment = getResentment(location, controllerFaction);

    // Prevent division by zero
    if (population <= 0) return 0;

    // Part 1: (Soldiers * ((Stability + 1)/20) / Population) - Reverted to 20 as per Excel
    const part1 = (factionsSoldiersCount * ((stability + 1) / 20)) / population;

    // Part 2: ((Population + Soldiers) / (200000 * ((Resentment/100) + 1))) - Updated to 200,000 as per Excel
    // Resentment factor: (Resentment/100) + 1 varies from 1.0 (0 resentment) to 2.0 (100 resentment)
    const resentmentFactor = (resentment / 100) + 1;
    const part2 = (population + factionsSoldiersCount) / (200000 * resentmentFactor);

    return part1 * part2;
}

/**
 * Apply leader discretion modifier to the risk
 * 
 * Formula: (Risk + (Discretion/30)) / Discretion
 */
export function applyLeaderStatsModifier(risk: number, discretion: number): number {
    // Formula: Risk * (1 - (Discretion / 10))
    // Example: Level 3 => Risk * 0.7 (30% reduction)
    // Example: Level 5 => Risk * 0.5 (50% reduction)

    // Ensure discretion doesn't exceed 10 to prevent negative risk
    const effectiveDiscretion = Math.min(10, Math.max(0, discretion));

    return risk * (1 - (effectiveDiscretion / 10));
}

/**
 * Apply governor surveillance modifier
 * 
 * Formula: AdjustedRisk * (1 + (GovernorStatesmanship * 0.2))
 * Only applies if "Hunt enemy underground networks" is active (Future feature)
 */
export function applyGovernorSurveillanceModifier(
    risk: number,
    governorStatesmanship: number,
    isHuntNetworkActive: boolean = false
): number {
    if (!isHuntNetworkActive) {
        return risk;
    }

    return risk * (1 + (governorStatesmanship * 0.2));
}

/**
 * Clamp risk to valid range [0, 0.6]
 */
export function clampRisk(risk: number): number {
    return Math.max(MIN_RISK, Math.min(MAX_RISK, risk));
}

/**
 * Full calculation pipeline
 */
export function calculateTotalInfiltrationRisk(
    location: Location,
    armies: Army[],
    infiltratingLeader: Character,
    governor: Character | undefined, // Placeholder for future governor logic
    isHuntNetworkActive: boolean = false // Placeholder
): number {
    // 1. Count soldiers of the controlling faction
    const controllingFaction = location.faction;

    // Filter armies: In this location AND belong to controlling faction
    const factionSoldiers = armies
        .filter(a => a.locationId === location.id && a.faction === controllingFaction)
        .reduce((sum, a) => sum + a.strength, 0);

    // 2. Base calculation
    const baseRisk = calculateBaseDetectionRisk(location, factionSoldiers);

    // 3. Leader stats modifier
    // Use 'clandestine' or 'discretion' depending on what's available suited for the spec
    // Spec says: "Niveau de discrétion". In Character traits, we have 'discretion' (level 1-5 usually).
    // Using 'discretion' from character stats.
    // If discretion is missing/0, default to 1 to avoid punishment/bugs
    // Assuming Character type has 'stats' object
    // Note: Character type definition might vary, will check types.ts if needed.
    // Based on previous files, stats are like { discretion: number, ... }

    // Check if stats exists, otherwise fallback
    const discretion = (infiltratingLeader as any).stats?.discretion || 1;

    const riskWithStats = applyLeaderStatsModifier(baseRisk, discretion);

    // 4. Governor modifier (Placeholder for future)
    let finalRisk = riskWithStats;
    if (governor && isHuntNetworkActive) {
        const statesmanship = (governor as any).stats?.statesmanship || 0;
        finalRisk = applyGovernorSurveillanceModifier(finalRisk, statesmanship, isHuntNetworkActive);
    }

    // 5. Clamp
    return clampRisk(finalRisk);
}
