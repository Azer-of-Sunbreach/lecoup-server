"use strict";
// Siege Handler - Handles SIEGE choice
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSiege = void 0;
const constants_1 = require("../../constants");
const helpers_1 = require("./helpers");
/**
 * Handle siege construction (SIEGE choice)
 */
const handleSiege = (combat, siegeCost, playerFaction, armies, locations, roads, resources) => {
    let newArmies = [...armies];
    let newLocations = [...locations];
    let newRoads = [...roads];
    let newResources = { ...resources };
    let logMsg = "";
    if (!siegeCost) {
        return {
            armies: newArmies,
            locations: newLocations,
            roads: newRoads,
            resources: newResources,
            logMessage: ""
        };
    }
    newResources[playerFaction].gold -= siegeCost;
    const attIds = combat.attackers.map(a => a.id);
    if (combat.locationId) {
        const loc = locations.find(l => l.id === combat.locationId);
        const curLevel = loc ? loc.fortificationLevel : 0;
        const reqMen = curLevel >= 3 ? 1000 : 500;
        const sortedAttackers = newArmies.filter(a => attIds.includes(a.id)).sort((a, b) => b.strength - a.strength);
        if (sortedAttackers.length > 0) {
            const sieger = sortedAttackers[0];
            // FIX: Create sieger copy with ACTUAL combat position
            const siegerAtCombatPosition = (0, helpers_1.getArmyAtCombatPosition)(sieger, combat);
            let retreatPos = (0, helpers_1.calculateRetreatPosition)(siegerAtCombatPosition, roads, locations);
            // Fallback if retreatPos is empty
            if (!(0, helpers_1.isValidRetreatPosition)(retreatPos)) {
                retreatPos = (0, helpers_1.getFallbackRetreatPosition)(sieger, combat);
            }
            if (sieger.strength > reqMen) {
                // Split army: siege force + remainder
                const remainder = sieger.strength - reqMen;
                const siegeArmyId = `siege_force_${Date.now()}`;
                const siegeTargetId = combat.locationId || combat.roadId;
                const siegeArmy = {
                    ...sieger,
                    ...retreatPos,
                    id: siegeArmyId,
                    strength: reqMen,
                    isSieging: true,
                    isGarrisoned: true,
                    isSpent: true,
                    action: undefined,
                    destinationId: siegeTargetId,
                    tripDestinationId: siegeTargetId,
                    turnsUntilArrival: 0
                };
                // FIX: Remainder army should NOT have enemy city as destination!
                // Clear destination and garrison to prevent auto-attack next turn
                const siegerExists = newArmies.some(a => a.id === sieger.id);
                const remainderArmy = {
                    ...sieger,
                    ...retreatPos, // Move to retreat position
                    strength: remainder,
                    isSpent: true, // Spent this turn
                    isSieging: false,
                    isGarrisoned: true, // Stay in place, don't auto-move
                    destinationId: null, // CRITICAL: Clear destination to prevent auto-attack
                    tripDestinationId: null, // Clear trip destination too
                    turnsUntilArrival: 0
                };
                if (siegerExists) {
                    newArmies = newArmies.map(a => a.id === sieger.id ? remainderArmy : a);
                }
                else {
                    newArmies.push(remainderArmy);
                }
                newArmies.push(siegeArmy);
            }
            else {
                // Entire army becomes siege force
                const siegeTargetId = combat.locationId || combat.roadId;
                // FIX: Create updated sieger and handle missing case
                const siegerExists = newArmies.some(a => a.id === sieger.id);
                const updatedSieger = {
                    ...sieger,
                    ...retreatPos,
                    isSieging: true,
                    isGarrisoned: true,
                    isSpent: true,
                    destinationId: siegeTargetId,
                    tripDestinationId: siegeTargetId,
                    turnsUntilArrival: 0
                };
                if (siegerExists) {
                    newArmies = newArmies.map(a => a.id === sieger.id ? updatedSieger : a);
                }
                else {
                    newArmies.push(updatedSieger);
                }
            }
        }
    }
    else {
        // Road siege
        const roadSiegeTargetId = combat.roadId;
        newArmies = newArmies.map(a => {
            if (attIds.includes(a.id)) {
                return {
                    ...a,
                    isSieging: true,
                    isGarrisoned: true,
                    isSpent: true,
                    destinationId: a.destinationId || roadSiegeTargetId,
                    tripDestinationId: a.tripDestinationId || roadSiegeTargetId,
                    turnsUntilArrival: 0
                };
            }
            return a;
        });
    }
    // Update fortification levels
    if (combat.locationId) {
        newLocations = newLocations.map(l => {
            if (l.id === combat.locationId) {
                const newFortLevel = Math.max(0, l.fortificationLevel - 1);
                return {
                    ...l,
                    hasBeenSiegedThisTurn: true,
                    fortificationLevel: newFortLevel,
                    defense: constants_1.FORTIFICATION_LEVELS[newFortLevel].bonus
                };
            }
            return l;
        });
    }
    else if (combat.roadId && combat.stageIndex !== undefined) {
        newRoads = newRoads.map(r => r.id === combat.roadId ? {
            ...r,
            stages: r.stages.map(s => s.index === combat.stageIndex ? {
                ...s,
                hasBeenSiegedThisTurn: true,
                fortificationLevel: Math.max(0, s.fortificationLevel - 1)
            } : s)
        } : r);
    }
    logMsg = "Siege engines constructed. Defenses weakened.";
    return {
        armies: newArmies,
        locations: newLocations,
        roads: newRoads,
        resources: newResources,
        logMessage: logMsg
    };
};
exports.handleSiege = handleSiege;
