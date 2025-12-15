"use strict";
// Retreat Handler - Handles RETREAT and RETREAT_CITY choices
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDefenderRetreatToCity = exports.handleAttackerRetreat = void 0;
const helpers_1 = require("./helpers");
/**
 * Handle attacker retreat (RETREAT choice)
 */
const handleAttackerRetreat = (combat, armies, prevArmies, roads, locations) => {
    let newArmies = [...armies];
    let newLocations = [...locations];
    combat.attackers.forEach(army => {
        // First try to find in newArmies (accounts for siege split modifications)
        // Then fallback to prevState, then to the combat snapshot
        const currentArmy = newArmies.find(a => a.id === army.id)
            || prevArmies.find(a => a.id === army.id)
            || army;
        // FIX: Create an army copy with the ACTUAL combat position
        // The army's stored locationId may be stale (from before entering combat)
        // We need to use combat.locationId/roadId to get correct retreat position
        const armyAtCombatPosition = (0, helpers_1.getArmyAtCombatPosition)(currentArmy, combat);
        let retreatPos = (0, helpers_1.calculateRetreatPosition)(armyAtCombatPosition, roads, locations);
        // If retreatPos is empty, fallback to a safe position
        // This can happen when the army fought at its origin location
        if (!(0, helpers_1.isValidRetreatPosition)(retreatPos)) {
            retreatPos = (0, helpers_1.getFallbackRetreatPosition)(currentArmy, combat);
        }
        const correctDestination = currentArmy.tripDestinationId || currentArmy.destinationId || combat.locationId;
        let updatedArmy = {
            ...currentArmy,
            ...retreatPos,
            isSpent: true,
            turnsUntilArrival: 0,
            destinationId: correctDestination,
            tripDestinationId: correctDestination,
        };
        if (updatedArmy.locationType === 'ROAD') {
            updatedArmy.isGarrisoned = true;
            const road = roads.find(r => r.id === updatedArmy.roadId);
            if (road && correctDestination) {
                if (road.to === correctDestination) {
                    updatedArmy.direction = 'FORWARD';
                }
                else if (road.from === correctDestination) {
                    updatedArmy.direction = 'BACKWARD';
                }
            }
        }
        // FIX: Check if army exists in newArmies before mapping
        const existsInNewArmies = newArmies.some(a => a.id === currentArmy.id);
        if (existsInNewArmies) {
            newArmies = newArmies.map(a => a.id === currentArmy.id ? updatedArmy : a);
        }
        else {
            // Army was not in newArmies, add it
            newArmies.push(updatedArmy);
        }
    });
    return {
        armies: newArmies,
        locations: newLocations,
        logMessage: "Attackers retreated."
    };
};
exports.handleAttackerRetreat = handleAttackerRetreat;
/**
 * Handle defender retreat to linked city (RETREAT_CITY choice)
 */
const handleDefenderRetreatToCity = (combat, armies, locations) => {
    let newArmies = [...armies];
    let newLocations = [...locations];
    let logMsg = "";
    if (combat.locationId) {
        const loc = locations.find(l => l.id === combat.locationId);
        if (loc && loc.linkedLocationId) {
            const retreatLocId = loc.linkedLocationId;
            const defenders = (0, helpers_1.getArmiesAtCombatLocation)(combat.defenderFaction, newArmies, combat);
            defenders.forEach(army => {
                newArmies = newArmies.map(a => a.id === army.id ? {
                    ...a,
                    locationType: 'LOCATION',
                    locationId: retreatLocId,
                    lastSafePosition: { type: 'LOCATION', id: retreatLocId },
                    isSpent: true
                } : a);
            });
            const isInsurgentBattle = combat.isInsurgentBattle || combat.attackers.some(a => a.isInsurgent);
            newLocations = newLocations.map(l => {
                if (l.id === combat.locationId) {
                    const newStability = isInsurgentBattle ? Math.max(49, l.stability) : l.stability;
                    return {
                        ...l,
                        faction: combat.attackerFaction,
                        defense: 0,
                        stability: newStability
                    };
                }
                return l;
            });
            logMsg = "Defenders retreated to safety. Location ceded.";
        }
    }
    return {
        armies: newArmies,
        locations: newLocations,
        logMessage: logMsg
    };
};
exports.handleDefenderRetreatToCity = handleDefenderRetreatToCity;
