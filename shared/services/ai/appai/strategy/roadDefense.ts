// Road Defense Module - Strategic road stage garrison and fortification planning
// 
// Two types of defensive positions:
// 1. Natural Defense stages: Cannot be fortified, but garrison (500+) gains defense bonus
// 2. Empty stages: Can be fortified with Pikes and Trenches / Stone Tower

import { GameState, FactionId, AIMission, Road } from '../../../../types';

/**
 * Strategic road stage targets by faction.
 * 
 * Each target has:
 * - stageId: The road stage name/ID
 * - roadId: The road this stage is on
 * - priority: Base priority (0-100)
 * - hasNaturalDefense: If true, garrison only (no fortification)
 */
export interface RoadDefenseTarget {
    stageId: string;
    roadId: string;
    priority: number;
    hasNaturalDefense: boolean;
}

export const ROAD_DEFENSE_TARGETS: Record<FactionId, RoadDefenseTarget[]> = {
    [FactionId.REPUBLICANS]: [
        // Towards Great Plains (early defense)
        { stageId: 'heatherfield', roadId: 'road_sunbreach_lands_great_plains', priority: 80, hasNaturalDefense: false },
        // Towards Lands of the Order
        { stageId: 'sunbreach_lighthouse', roadId: 'road_sunbreach_lands_order_lands', priority: 70, hasNaturalDefense: false }
    ],
    [FactionId.CONSPIRATORS]: [
        // Northern Forests - NATURAL DEFENSE (+2000) - prioritize occupation
        { stageId: 'northern_forests', roadId: 'road_great_plains_northern_barony', priority: 90, hasNaturalDefense: true },
        // Windward Mills - fallback if Northern Forests contested
        { stageId: 'windward_mills', roadId: 'road_windward_great_plains', priority: 50, hasNaturalDefense: false },
        // Blackbird's Bend - natural defense position
        { stageId: 'blackbirds_bend', roadId: 'road_stormbay_order_lands', priority: 60, hasNaturalDefense: true }
    ],
    [FactionId.NOBLES]: [
        // Northern Forests - ALSO prioritized by Nobles (natural defense)
        { stageId: 'northern_forests', roadId: 'road_great_plains_northern_barony', priority: 85, hasNaturalDefense: true },
        // Lys Castelleny - fallback if Northern Forests impossible
        { stageId: 'lys_castelleny', roadId: 'road_great_plains_northern_barony', priority: 40, hasNaturalDefense: false }
    ],
    [FactionId.NEUTRAL]: [],
    [FactionId.LOYALISTS]: [],
    [FactionId.PRINCELY_ARMY]: [],
    [FactionId.CONFEDERATE_CITIES]: [],
    [FactionId.LARION_KNIGHTS]: [],
    [FactionId.THYRAKAT_SULTANATE]: [],
    [FactionId.LINEAGES_COUNCIL]: [],
    [FactionId.OATH_COALITION]: [],
    [FactionId.LARION_EXPEDITION]: []
};

/**
 * Generate ROAD_DEFENSE missions for strategic road stage control.
 * 
 * Creates missions to:
 * - Garrison natural defense stages when threatened (500+ troops)
 * - Fortify empty stages with Pikes and Trenches / Stone Tower
 * 
 * Uses weighted scoring with randomization to avoid predictable starts.
 * 
 * @param state - Current game state
 * @param faction - Faction to generate for
 * @param turn - Current turn number
 * @param activeMissions - Current active missions (modified in place)
 */
export function generateRoadDefenseMissions(
    state: GameState,
    faction: FactionId,
    turn: number,
    activeMissions: AIMission[]
): void {
    const targets = ROAD_DEFENSE_TARGETS[faction] || [];
    if (targets.length === 0) return;

    // Only generate early game (turns 1-6) OR when threat detected
    const isEarlyGame = turn <= 6;

    // Score each target
    const scoredTargets = targets.map(target => {
        let score = target.priority;

        // Find the road and stage
        const road = state.roads.find(r => r.id === target.roadId);
        if (!road) return { target, score: -1000 };

        const stageIndex = road.stages.findIndex(s =>
            s.name?.toLowerCase().includes(target.stageId.toLowerCase())
        );
        if (stageIndex === -1) return { target, score: -1000 };

        const stage = road.stages[stageIndex];

        // Check if we already control it
        if (stage.faction === faction) {
            // Check if garrison exists
            const hasGarrison = state.armies.some(a =>
                a.faction === faction &&
                a.locationType === 'ROAD' &&
                a.roadId === road.id &&
                a.stageIndex === stageIndex &&
                a.strength >= 500
            );
            if (hasGarrison) {
                return { target, score: -1000 }; // Already defended
            }
        }

        // Check for enemy threat on this road
        const enemyOnRoad = state.armies.some(a =>
            a.faction !== faction &&
            a.faction !== FactionId.NEUTRAL &&
            a.roadId === road.id
        );
        if (enemyOnRoad) {
            score += 50; // Urgent
        }

        // Check for enemy at destination
        const destId = road.from === target.stageId ? road.to : road.from;
        const destLoc = state.locations.find(l => l.id === destId);
        if (destLoc && destLoc.faction !== faction && destLoc.faction !== FactionId.NEUTRAL) {
            score += 30; // Strategic importance
        }

        // Natural defense bonus (prioritize occupation over building)
        if (target.hasNaturalDefense) {
            score += 20;
        }

        // Add randomness to avoid predictable starts (±15 points)
        score += Math.floor(Math.random() * 31) - 15;

        // Skip if not early game and no threat
        if (!isEarlyGame && !enemyOnRoad && !destLoc) {
            score -= 50;
        }

        return { target, score };
    }).filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score);

    // Create missions for top targets (max 2 at a time)
    const existingRoadMissions = activeMissions.filter(m => m.type === 'ROAD_DEFENSE').length;
    const maxNewMissions = Math.max(0, 2 - existingRoadMissions);

    for (let i = 0; i < Math.min(maxNewMissions, scoredTargets.length); i++) {
        const { target } = scoredTargets[i];

        // Check if mission already exists for this stage
        if (activeMissions.some(m =>
            m.type === 'ROAD_DEFENSE' &&
            m.data?.stageId === target.stageId
        )) continue;

        const missionType = target.hasNaturalDefense ? 'GARRISON' : 'FORTIFY';
        console.log(`[AI STRATEGY ${faction}] Creating ROAD_DEFENSE mission: ${missionType} at ${target.stageId} (Priority: ${target.priority})`);

        activeMissions.push({
            id: `road_defense_${target.stageId}_${turn}`,
            type: 'ROAD_DEFENSE',
            priority: target.priority,
            status: 'PLANNING',
            targetId: target.roadId,
            stage: 'GATHERING',
            assignedArmyIds: [],
            data: {
                stageId: target.stageId,
                roadId: target.roadId,
                requiredStrength: 1000,
                shouldFortify: !target.hasNaturalDefense,
                hasNaturalDefense: target.hasNaturalDefense
            }
        });
    }
}
