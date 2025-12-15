// Retreat Handler - Handles RETREAT and RETREAT_CITY choices

import { Army, Location, Road, CombatState } from '../../types';
import {
    getArmiesAtCombatLocation,
    calculateRetreatPosition,
    getArmyAtCombatPosition,
    isValidRetreatPosition,
    getFallbackRetreatPosition
} from './helpers';

export interface RetreatResult {
    armies: Army[];
    locations: Location[];
    logMessage: string;
}

/**
 * Handle attacker retreat (RETREAT choice)
 */
export const handleAttackerRetreat = (
    combat: CombatState,
    armies: Army[],
    prevArmies: Army[],
    roads: Road[],
    locations: Location[]
): RetreatResult => {
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
        const armyAtCombatPosition = getArmyAtCombatPosition(currentArmy, combat);

        let retreatPos = calculateRetreatPosition(armyAtCombatPosition, roads, locations);

        // If retreatPos is empty, fallback to a safe position
        // This can happen when the army fought at its origin location
        if (!isValidRetreatPosition(retreatPos)) {
            retreatPos = getFallbackRetreatPosition(currentArmy, combat);
        }

        const correctDestination = currentArmy.tripDestinationId || currentArmy.destinationId || combat.locationId;

        let updatedArmy: Army = {
            ...currentArmy,
            ...retreatPos,
            isSpent: true,
            turnsUntilArrival: 0,
            destinationId: correctDestination,
            tripDestinationId: correctDestination,
        } as Army;

        if (updatedArmy.locationType === 'ROAD') {
            updatedArmy.isGarrisoned = true;
            const road = roads.find(r => r.id === updatedArmy.roadId);
            if (road && correctDestination) {
                if (road.to === correctDestination) {
                    updatedArmy.direction = 'FORWARD';
                } else if (road.from === correctDestination) {
                    updatedArmy.direction = 'BACKWARD';
                }
            }
        }

        // FIX: Check if army exists in newArmies before mapping
        const existsInNewArmies = newArmies.some(a => a.id === currentArmy.id);
        if (existsInNewArmies) {
            newArmies = newArmies.map(a => a.id === currentArmy.id ? updatedArmy : a);
        } else {
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

/**
 * Handle defender retreat to linked city (RETREAT_CITY choice)
 */
export const handleDefenderRetreatToCity = (
    combat: CombatState,
    armies: Army[],
    locations: Location[]
): RetreatResult => {
    let newArmies = [...armies];
    let newLocations = [...locations];
    let logMsg = "";

    if (combat.locationId) {
        const loc = locations.find(l => l.id === combat.locationId);
        if (loc && loc.linkedLocationId) {
            const retreatLocId = loc.linkedLocationId;
            const defenders = getArmiesAtCombatLocation(combat.defenderFaction, newArmies, combat);

            defenders.forEach(army => {
                newArmies = newArmies.map(a => a.id === army.id ? {
                    ...a,
                    locationType: 'LOCATION' as const,
                    locationId: retreatLocId,
                    lastSafePosition: { type: 'LOCATION' as const, id: retreatLocId },
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
