"use strict";
// Orphaned Leaders Module - Handles leaders from winning armies that were destroyed
// This handles the specific case of "Pyrrhic victory" where winning armies are 
// reduced to 0 strength but their leaders should survive.
Object.defineProperty(exports, "__esModule", { value: true });
exports.processOrphanedLeaders = void 0;
const types_1 = require("../../types");
/**
 * Process orphaned leaders from winning armies that were destroyed in combat.
 *
 * Unlike processLeaderSurvival (which handles LOSING faction leaders),
 * this function handles leaders of the WINNING faction whose armies were
 * destroyed due to heavy losses (Pyrrhic victory scenario).
 *
 * These leaders always survive and are placed appropriately:
 * - On location: detached and placed at that location
 * - On road stage: attached to surviving same-faction army, or moved to nearest rural
 *
 * @param removedArmyIds - IDs of armies that were destroyed (strength <= 0)
 * @param survivingArmies - Armies that survived the battle
 * @param characters - Current list of all characters
 * @param context - Combat context (winning faction, locations, roads)
 * @returns Updated characters array
 */
const processOrphanedLeaders = (removedArmyIds, survivingArmies, characters, context) => {
    const { combat, winningFaction, locations, roads } = context;
    let updatedCharacters = [...characters];
    // Find leaders attached to destroyed armies from the WINNING faction only
    const orphanedWinningLeaders = updatedCharacters.filter(c => c.armyId &&
        removedArmyIds.includes(c.armyId) &&
        c.status !== types_1.CharacterStatus.DEAD &&
        c.faction === winningFaction);
    orphanedWinningLeaders.forEach(leader => {
        if (combat.locationId) {
            // Battle was on a location - detach leader and place them there
            updatedCharacters = updatedCharacters.map(c => c.id === leader.id
                ? { ...c, status: types_1.CharacterStatus.AVAILABLE, armyId: null, locationId: combat.locationId }
                : c);
        }
        else if (combat.roadId && combat.stageIndex !== undefined) {
            // Battle was on a road stage - try to attach to surviving army or move to nearest rural
            const survivingArmyAtStage = survivingArmies.find(a => a.faction === leader.faction &&
                a.locationType === 'ROAD' &&
                a.roadId === combat.roadId &&
                a.stageIndex === combat.stageIndex);
            if (survivingArmyAtStage) {
                // Attach to surviving army of same faction on this road stage
                updatedCharacters = updatedCharacters.map(c => c.id === leader.id
                    ? { ...c, armyId: survivingArmyAtStage.id }
                    : c);
            }
            else {
                // No army found - find nearest rural area (any faction)
                const nearestRural = findNearestRural(combat.roadId, locations, roads);
                if (nearestRural) {
                    updatedCharacters = updatedCharacters.map(c => c.id === leader.id
                        ? { ...c, status: types_1.CharacterStatus.AVAILABLE, armyId: null, locationId: nearestRural.id }
                        : c);
                }
            }
        }
    });
    return { updatedCharacters };
};
exports.processOrphanedLeaders = processOrphanedLeaders;
/**
 * Find the nearest rural area to a road stage.
 * Priority: road endpoints > their linked rural areas > any rural area > any location
 */
function findNearestRural(roadId, locations, roads) {
    const road = roads.find(r => r.id === roadId);
    if (road) {
        const fromLoc = locations.find(l => l.id === road.from);
        const toLoc = locations.find(l => l.id === road.to);
        // Check if road endpoints are rural areas
        if (fromLoc && fromLoc.type === 'RURAL') {
            return fromLoc;
        }
        if (toLoc && toLoc.type === 'RURAL') {
            return toLoc;
        }
        // Road endpoints are cities - find their linked rural areas
        if (fromLoc && fromLoc.linkedLocationId) {
            const linkedRural = locations.find(l => l.id === fromLoc.linkedLocationId);
            if (linkedRural)
                return linkedRural;
        }
        if (toLoc && toLoc.linkedLocationId) {
            const linkedRural = locations.find(l => l.id === toLoc.linkedLocationId);
            if (linkedRural)
                return linkedRural;
        }
    }
    // Fallback: any rural area
    const anyRural = locations.find(l => l.type === 'RURAL');
    if (anyRural)
        return anyRural;
    // Ultimate fallback: any location
    return locations[0] || null;
}
