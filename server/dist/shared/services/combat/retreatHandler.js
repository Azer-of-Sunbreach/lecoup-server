"use strict";
// Retreat Handler - Handles RETREAT and RETREAT_CITY choices
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDefenderRetreatToCity = exports.handleAttackerRetreat = void 0;
const types_1 = require("../../types");
const helpers_1 = require("./helpers");
const governorService_1 = require("../domain/governor/governorService");
const leaderStatusUpdates_1 = require("../turnLogic/leaderStatusUpdates");
const types_2 = require("../../types");
/**
 * Handle attacker retreat (RETREAT choice)
 * FIX BUG RETRAITE 2: After retreat, advance blocked defenders one step
 */
const handleAttackerRetreat = (combat, armies, prevArmies, roads, locations, characters) => {
    let newArmies = [...armies];
    let newLocations = [...locations];
    let newCharacters = [...characters];
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
    // FIX BUG RETRAITE 2: Advance blocked defenders
    // Defenders who were blocked by collision (not justMoved, have destination, not garrisoned)
    // should now advance one step since the attacker retreated
    combat.defenders.forEach(defenderSnapshot => {
        const defender = newArmies.find(a => a.id === defenderSnapshot.id);
        if (!defender)
            return;
        // Only advance if:
        // 1. Not already moved this turn (was blocked by collision)
        // 2. Has a destination (was intending to move)
        // 3. Not garrisoned (not stationary)
        // 4. On a road (road-to-road movement)
        if (!defender.justMoved &&
            defender.destinationId &&
            !defender.isGarrisoned &&
            defender.locationType === 'ROAD' &&
            defender.roadId) {
            const road = roads.find(r => r.id === defender.roadId);
            if (!road)
                return;
            // Calculate next stage index based on direction
            const nextIndex = defender.stageIndex + (defender.direction === 'FORWARD' ? 1 : -1);
            // Check if arriving at destination
            if (nextIndex < 0 || nextIndex >= road.stages.length) {
                // Arriving at destination location
                const destLoc = locations.find(l => l.id === defender.destinationId);
                if (destLoc) {
                    newArmies = newArmies.map(a => a.id === defender.id ? {
                        ...a,
                        locationType: 'LOCATION',
                        locationId: defender.destinationId,
                        roadId: null,
                        stageIndex: 0,
                        destinationId: null,
                        turnsUntilArrival: 0,
                        justMoved: true,
                        lastSafePosition: { type: 'LOCATION', id: defender.destinationId }
                    } : a);
                }
            }
            else {
                // Continue on road
                newArmies = newArmies.map(a => a.id === defender.id ? {
                    ...a,
                    stageIndex: nextIndex,
                    turnsUntilArrival: Math.max(0, a.turnsUntilArrival - 1),
                    justMoved: true
                } : a);
            }
        }
    });
    return {
        armies: newArmies,
        locations: newLocations,
        characters: newCharacters,
        logMessage: "Attackers retreated."
    };
};
exports.handleAttackerRetreat = handleAttackerRetreat;
/**
 * Handle defender retreat to linked city (RETREAT_CITY choice)
 */
const handleDefenderRetreatToCity = (combat, armies, locations, characters) => {
    let newArmies = [...armies];
    let newLocations = [...locations];
    let newCharacters = [...characters];
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
                    // Stability handling for insurgent victories:
                    // - Faction insurrections (attackerFaction != NEUTRAL): +10 stability max
                    // - Spontaneous neutral uprisings (attackerFaction == NEUTRAL): no change
                    let newStability = l.stability;
                    if (isInsurgentBattle) {
                        if (combat.attackerFaction !== types_1.FactionId.NEUTRAL) {
                            // Faction insurrection victory: +10 stability max
                            newStability = Math.min(l.stability + 10, 100);
                        }
                        // Neutral spontaneous uprising: no stability change
                    }
                    const updatedLoc = {
                        ...l,
                        faction: combat.attackerFaction,
                        defense: 0,
                        stability: newStability,
                        // Clear governor policies when location changes hands
                        governorPolicies: {}
                    };
                    // GOVERNOR VALIDATION for previous owner (defender)
                    const governor = newCharacters.find(c => c.locationId === combat.locationId && c.status === types_2.CharacterStatus.GOVERNING && c.faction === l.faction);
                    if (governor) {
                        // Use newLocations (which contains other potential friendly territories)
                        const validation = (0, governorService_1.validateGovernorStatus)(governor, updatedLoc, newLocations, [], 0); // No roads passed, turn 0
                        if (!validation.isValid) {
                            newCharacters = newCharacters.map(c => c.id === validation.character.id ? validation.character : c);
                            if (validation.log)
                                logMsg += ` ${validation.log.message}`;
                        }
                    }
                    // UPDATE LEADER STATUS: UNDERCOVER -> AVAILABLE for winner, AVAILABLE -> UNDERCOVER for loser
                    newCharacters = (0, leaderStatusUpdates_1.handleLeaderStatusOnCapture)(updatedLoc.id, updatedLoc.faction, newCharacters);
                    return updatedLoc;
                }
                return l;
            });
            logMsg = "Defenders retreated to safety. Location ceded.";
        }
    }
    return {
        armies: newArmies,
        locations: newLocations,
        characters: newCharacters,
        logMessage: logMsg
    };
};
exports.handleDefenderRetreatToCity = handleDefenderRetreatToCity;
