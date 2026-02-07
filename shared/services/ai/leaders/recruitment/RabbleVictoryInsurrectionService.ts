/**
 * Rabble Victory Insurrection Service
 * 
 * Specialized service to immediately dispatch jack_the_fox and richard_fayre
 * on GRAND_INSURRECTION missions after Rabble Victory is chosen.
 * 
 * Target selection priority:
 * 1. City+rural pairs where AI controls neither (full conquest opportunity)
 * 2. Cities where AI controls linked rural (consolidation)
 * 3. Rurals where AI controls linked city (consolidation)
 * 
 * Selection criteria: Maximum raw insurgent count using calculateGrandInsurgents
 * 
 * @module shared/services/ai/leaders/recruitment
 */

import { GameState, Character, Location, FactionId, CharacterStatus } from '../../../../types';
import { ClandestineActionId } from '../../../../types/clandestineTypes';
import { calculateGrandInsurgents } from '../utils/IPGCalculator';
import { RABBLE_MISSION_BUDGET } from '../../../domain/internalFactions/internalFactions';
import { LeaderStatLevel } from '../../../../types/leaderTypes';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Leaders recruited by Rabble Victory, ready for immediate dispatch */
const RABBLE_RECRUITED_LEADERS = ['jack_the_fox', 'richard_fayre'];

/** Enable detailed logging */
const ENABLE_RABBLE_DISPATCH_LOGS = true;

// ============================================================================
// TYPES
// ============================================================================

export interface InsurrectionTarget {
    /** Target location ID */
    locationId: string;
    /** Location name for logging */
    locationName: string;
    /** Expected insurgent count */
    expectedInsurgents: number;
    /** Type of target opportunity */
    targetType: 'FULL_CONQUEST' | 'CITY_CONSOLIDATION' | 'RURAL_CONSOLIDATION';
    /** Description for logging */
    description: string;
}

export interface RabbleDispatchResult {
    /** Whether dispatch was successful */
    success: boolean;
    /** Updated characters with mission assignments */
    updatedCharacters: Character[];
    /** Details of assigned missions */
    assignments: {
        leaderId: string;
        leaderName: string;
        targetId: string;
        targetName: string;
        expectedInsurgents: number;
    }[];
    /** Log messages */
    logs: string[];
}

// ============================================================================
// TARGET FINDING
// ============================================================================

/**
 * Find all potential insurrection targets, categorized by opportunity type.
 */
function findInsurrectionTargets(
    locations: Location[],
    faction: FactionId
): InsurrectionTarget[] {
    const targets: InsurrectionTarget[] = [];
    const controlledSet = new Set(
        locations.filter(loc => loc.faction === faction).map(loc => loc.id)
    );

    // Standard OPS value for calculation (average leader)
    const STANDARD_OPS = 4;

    for (const loc of locations) {
        // Skip our own territories
        if (loc.faction === faction) continue;

        // Skip graveyard or special locations
        if (loc.id === 'graveyard') continue;

        const linkedLoc = loc.linkedLocationId
            ? locations.find(l => l.id === loc.linkedLocationId)
            : null;

        // Calculate expected insurgents
        const insurgents = calculateGrandInsurgents(loc, STANDARD_OPS, RABBLE_MISSION_BUDGET, faction);

        // Categorize the target
        if (loc.type === 'CITY') {
            if (linkedLoc && !controlledSet.has(linkedLoc.id)) {
                // Neither city nor rural controlled = FULL_CONQUEST
                targets.push({
                    locationId: loc.id,
                    locationName: loc.name,
                    expectedInsurgents: insurgents,
                    targetType: 'FULL_CONQUEST',
                    description: `Full conquest opportunity: ${loc.name} + ${linkedLoc.name}`
                });
            } else if (linkedLoc && controlledSet.has(linkedLoc.id)) {
                // We have the rural, missing the city = CITY_CONSOLIDATION
                targets.push({
                    locationId: loc.id,
                    locationName: loc.name,
                    expectedInsurgents: insurgents,
                    targetType: 'CITY_CONSOLIDATION',
                    description: `Consolidation: We have ${linkedLoc.name}, targeting ${loc.name}`
                });
            }
        } else if (loc.type === 'RURAL') {
            // Find the city that links to this rural
            const linkedCity = locations.find(l => l.type === 'CITY' && l.linkedLocationId === loc.id);

            if (linkedCity && controlledSet.has(linkedCity.id)) {
                // We have the city, missing the rural = RURAL_CONSOLIDATION
                targets.push({
                    locationId: loc.id,
                    locationName: loc.name,
                    expectedInsurgents: insurgents,
                    targetType: 'RURAL_CONSOLIDATION',
                    description: `Consolidation: We have ${linkedCity.name}, targeting ${loc.name}`
                });
            } else if (linkedCity && !controlledSet.has(linkedCity.id)) {
                // Full conquest from rural side
                targets.push({
                    locationId: loc.id,
                    locationName: loc.name,
                    expectedInsurgents: insurgents,
                    targetType: 'FULL_CONQUEST',
                    description: `Full conquest opportunity: ${loc.name} + ${linkedCity.name}`
                });
            }
        }
    }

    return targets;
}

/**
 * Sort targets by priority and expected insurgents.
 * Priority: FULL_CONQUEST > CITY_CONSOLIDATION > RURAL_CONSOLIDATION
 * Within each category, sort by expected insurgents (descending)
 */
function sortTargetsByPriority(targets: InsurrectionTarget[]): InsurrectionTarget[] {
    const priorityOrder: Record<string, number> = {
        'FULL_CONQUEST': 3,
        'CITY_CONSOLIDATION': 2,
        'RURAL_CONSOLIDATION': 1
    };

    return [...targets].sort((a, b) => {
        const priorityDiff = priorityOrder[b.targetType] - priorityOrder[a.targetType];
        if (priorityDiff !== 0) return priorityDiff;
        return b.expectedInsurgents - a.expectedInsurgents;
    });
}

/**
 * Get the clandestine ops value for a leader.
 */
function getLeaderOps(leader: Character): number {
    const opsLevel = leader.stats?.clandestineOps || LeaderStatLevel.CAPABLE;
    // LeaderStatLevel: INEPT=1, UNRELIABLE=2, CAPABLE=3, EFFECTIVE=4, EXCEPTIONAL=5
    return opsLevel;
}

/**
 * Recalculate insurgents for a specific leader based on their OPS.
 */
function calculateInsurgentsForLeader(
    target: InsurrectionTarget,
    leader: Character,
    locations: Location[],
    faction: FactionId
): number {
    const location = locations.find(l => l.id === target.locationId);
    if (!location) return 0;

    const ops = getLeaderOps(leader);
    return calculateGrandInsurgents(location, ops, RABBLE_MISSION_BUDGET, faction);
}

// ============================================================================
// MAIN DISPATCH FUNCTION
// ============================================================================

/**
 * Immediately dispatch Rabble Victory leaders on GRAND_INSURRECTION missions.
 * 
 * Called right after Rabble Victory is chosen to assign jack_the_fox and
 * richard_fayre to optimal targets.
 * 
 * @param state - Current game state (after Rabble Victory choice)
 * @param faction - Must be REPUBLICANS
 * @returns Dispatch result with updated characters
 */
export function dispatchRabbleVictoryLeaders(
    state: GameState,
    faction: FactionId
): RabbleDispatchResult {
    const logs: string[] = [];
    const assignments: RabbleDispatchResult['assignments'] = [];

    logs.push('[RABBLE DISPATCH] Starting immediate insurrection assignment');

    // Get the two Rabble Victory leaders
    const rabbleLeaders = state.characters.filter(
        c => RABBLE_RECRUITED_LEADERS.includes(c.id) &&
            c.faction === faction &&
            c.status === CharacterStatus.AVAILABLE
    );

    if (rabbleLeaders.length === 0) {
        logs.push('[RABBLE DISPATCH] No Rabble leaders available for dispatch');
        return {
            success: false,
            updatedCharacters: state.characters,
            assignments: [],
            logs
        };
    }

    logs.push(`[RABBLE DISPATCH] Found ${rabbleLeaders.length} leaders: ${rabbleLeaders.map(l => l.name).join(', ')}`);

    // Find and sort potential targets
    const allTargets = findInsurrectionTargets(state.locations, faction);
    const sortedTargets = sortTargetsByPriority(allTargets);

    if (sortedTargets.length === 0) {
        logs.push('[RABBLE DISPATCH] No valid insurrection targets found');
        return {
            success: false,
            updatedCharacters: state.characters,
            assignments: [],
            logs
        };
    }

    logs.push(`[RABBLE DISPATCH] Found ${sortedTargets.length} potential targets:`);
    sortedTargets.slice(0, 5).forEach((t, i) => {
        logs.push(`  ${i + 1}. ${t.locationName} (${t.targetType}): ~${t.expectedInsurgents} insurgents`);
    });

    // Assign leaders to top targets
    let updatedCharacters = [...state.characters];
    const usedTargets = new Set<string>();

    for (const leader of rabbleLeaders) {
        // Find best available target for this leader
        let bestTarget: InsurrectionTarget | null = null;
        let bestInsurgents = 0;

        for (const target of sortedTargets) {
            if (usedTargets.has(target.locationId)) continue;

            const insurgents = calculateInsurgentsForLeader(target, leader, state.locations, faction);
            if (insurgents > bestInsurgents) {
                bestTarget = target;
                bestInsurgents = insurgents;
            }
        }

        if (!bestTarget) {
            logs.push(`[RABBLE DISPATCH] No available target for ${leader.name}`);
            continue;
        }

        // Mark target as used
        usedTargets.add(bestTarget.locationId);

        // Update leader for mission assignment
        const leaderIndex = updatedCharacters.findIndex(c => c.id === leader.id);
        if (leaderIndex === -1) continue;

        updatedCharacters[leaderIndex] = {
            ...updatedCharacters[leaderIndex],
            status: CharacterStatus.UNDERCOVER,
            locationId: bestTarget.locationId,
            destinationId: null,
            turnsUntilArrival: 0,
            clandestineBudget: RABBLE_MISSION_BUDGET,
            plannedMissionAction: ClandestineActionId.PREPARE_GRAND_INSURRECTION
        };

        assignments.push({
            leaderId: leader.id,
            leaderName: leader.name,
            targetId: bestTarget.locationId,
            targetName: bestTarget.locationName,
            expectedInsurgents: bestInsurgents
        });

        logs.push(`[RABBLE DISPATCH] ${leader.name} -> ${bestTarget.locationName} (GRAND_INSURRECTION, ~${bestInsurgents} insurgents)`);
    }

    // Log results
    if (ENABLE_RABBLE_DISPATCH_LOGS) {
        logs.forEach(log => console.log(log));
    }

    return {
        success: assignments.length > 0,
        updatedCharacters,
        assignments,
        logs
    };
}
