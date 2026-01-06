"use strict";
// Road Defense Handler - Executes ROAD_DEFENSE missions
// 
// Two types based on hasNaturalDefense:
// 1. Natural defense stages: Garrison 500+ troops (no fortification needed)
// 2. Empty stages: Garrison + build fortification
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRoadDefense = handleRoadDefense;
const gameConstants_1 = require("../../../data/gameConstants");
/**
 * Handle ROAD_DEFENSE mission execution.
 *
 * Stages:
 * - GATHERING: Find army to assign
 * - MOVING: Move army to road stage
 * - GARRISONING: Army in position, build fortification if allowed
 * - COMPLETED: Fortification built or garrison established (natural defense)
 *
 * @param mission - The road defense mission
 * @param state - Current game state
 * @param faction - Faction executing
 * @param armies - Armies array (modified in place)
 * @param assigned - Set of already assigned army IDs
 */
function handleRoadDefense(mission, state, faction, armies, assigned) {
    const stageId = mission.data?.stageId;
    const roadId = mission.data?.roadId || mission.targetId;
    const shouldFortify = mission.data?.shouldFortify ?? false;
    const requiredStrength = mission.data?.requiredStrength ?? 1000;
    const road = state.roads.find(r => r.id === roadId);
    if (!road) {
        mission.status = 'FAILED';
        return;
    }
    const stageIndex = road.stages.findIndex(s => s.name?.toLowerCase().includes(stageId?.toLowerCase() || ''));
    if (stageIndex === -1) {
        mission.status = 'FAILED';
        return;
    }
    const stage = road.stages[stageIndex];
    // GATHERING: Find and assign a suitable army
    if (mission.stage === 'GATHERING') {
        // Check if an army is already at the stage
        const armyAtStage = armies.find(a => a.faction === faction &&
            a.roadId === roadId &&
            a.stageIndex === stageIndex &&
            a.strength >= 500);
        if (armyAtStage) {
            mission.assignedArmyIds = [armyAtStage.id];
            assigned.add(armyAtStage.id);
            mission.stage = 'GARRISONING';
            if (gameConstants_1.DEBUG_AI)
                console.log(`[AI ROAD_DEFENSE ${faction}] Army already at ${stageId}, garrisoning`);
            return;
        }
        // Find nearby army to send
        const candidateArmy = armies.find(a => a.faction === faction &&
            !assigned.has(a.id) &&
            a.strength >= requiredStrength &&
            !a.isSieging &&
            a.locationType === 'LOCATION' // Start from location
        );
        if (!candidateArmy) {
            // Look for smaller armies we can combine
            const smallerArmy = armies.find(a => a.faction === faction &&
                !assigned.has(a.id) &&
                a.strength >= 500 &&
                !a.isSieging &&
                a.locationType === 'LOCATION');
            if (smallerArmy) {
                mission.assignedArmyIds = [smallerArmy.id];
                assigned.add(smallerArmy.id);
                mission.stage = 'MOVING';
                if (gameConstants_1.DEBUG_AI)
                    console.log(`[AI ROAD_DEFENSE ${faction}] Assigned ${smallerArmy.strength} troops to move to ${stageId}`);
            }
            // No army available, stay in GATHERING
            return;
        }
        mission.assignedArmyIds = [candidateArmy.id];
        assigned.add(candidateArmy.id);
        mission.stage = 'MOVING';
        if (gameConstants_1.DEBUG_AI)
            console.log(`[AI ROAD_DEFENSE ${faction}] Assigned ${candidateArmy.strength} troops to defend ${stageId}`);
    }
    // MOVING: Move assigned army to stage
    if (mission.stage === 'MOVING') {
        const army = armies.find(a => mission.assignedArmyIds.includes(a.id));
        if (!army) {
            mission.stage = 'GATHERING';
            mission.assignedArmyIds = [];
            return;
        }
        // Check if army reached the stage
        if (army.roadId === roadId && army.stageIndex === stageIndex) {
            mission.stage = 'GARRISONING';
            if (gameConstants_1.DEBUG_AI)
                console.log(`[AI ROAD_DEFENSE ${faction}] Army arrived at ${stageId}`);
            return;
        }
        // Move toward the stage
        // Find connecting location
        const fromLoc = road.from;
        const toLoc = road.to;
        // Determine which location to move through
        if (army.locationType === 'LOCATION') {
            // Enter the road
            const targetRoad = state.roads.find(r => r.id === roadId &&
                (r.from === army.locationId || r.to === army.locationId));
            if (targetRoad) {
                army.roadId = roadId;
                army.locationType = 'ROAD';
                army.stageIndex = army.locationId === targetRoad.from ? 0 : targetRoad.stages.length - 1;
                army.direction = army.locationId === targetRoad.from ? 'FORWARD' : 'BACKWARD';
                army.isSpent = true;
                if (gameConstants_1.DEBUG_AI)
                    console.log(`[AI ROAD_DEFENSE ${faction}] Army entering road ${roadId} from ${army.locationId}`);
            }
        }
        else if (army.roadId === roadId) {
            // Already on road, move toward target stage
            if (army.stageIndex < stageIndex) {
                army.stageIndex++;
                army.isSpent = true;
            }
            else if (army.stageIndex > stageIndex) {
                army.stageIndex--;
                army.isSpent = true;
            }
        }
    }
    // GARRISONING: Army in position
    if (mission.stage === 'GARRISONING') {
        const army = armies.find(a => mission.assignedArmyIds.includes(a.id));
        if (!army || army.roadId !== roadId || army.stageIndex !== stageIndex) {
            mission.stage = 'MOVING';
            return;
        }
        // Natural defense: Just garrison (no building needed)
        if (!shouldFortify || stage.naturalDefense) {
            if (gameConstants_1.DEBUG_AI)
                console.log(`[AI ROAD_DEFENSE ${faction}] Garrison established at ${stageId} (natural defense: ${stage.naturalDefense || 0})`);
            mission.status = 'COMPLETED';
            return;
        }
        // Check if fortification exists
        if (stage.fortificationLevel && stage.fortificationLevel >= 1) {
            if (gameConstants_1.DEBUG_AI)
                console.log(`[AI ROAD_DEFENSE ${faction}] Fortification complete at ${stageId}`);
            mission.status = 'COMPLETED';
            return;
        }
        // Build fortification (handled by fortifications.ts, just mark as active)
        mission.status = 'ACTIVE';
        // Fortification building will be handled by economy/fortifications.ts when it detects
        // an army positioned on a road stage with shouldFortify data
    }
}
