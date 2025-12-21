// Siege Handler - Handles SIEGE choice

import { Army, Location, Road, CombatState, FactionId } from '../../types';
import { FORTIFICATION_LEVELS } from '../../constants';
import {
    calculateRetreatPosition,
    getArmyAtCombatPosition,
    isValidRetreatPosition,
    getFallbackRetreatPosition
} from './helpers';

export interface SiegeResult {
    armies: Army[];
    locations: Location[];
    roads: Road[];
    resources: { [key in FactionId]: { gold: number } };
    logMessage: string;
}

/**
 * Handle siege construction (SIEGE choice)
 */
export const handleSiege = (
    combat: CombatState,
    siegeCost: number,
    playerFaction: FactionId,
    armies: Army[],
    locations: Location[],
    roads: Road[],
    resources: { [key in FactionId]: { gold: number } }
): SiegeResult => {
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
            const siegerAtCombatPosition = getArmyAtCombatPosition(sieger, combat);

            let retreatPos = calculateRetreatPosition(siegerAtCombatPosition, roads, locations);

            // Fallback if retreatPos is empty
            if (!isValidRetreatPosition(retreatPos)) {
                retreatPos = getFallbackRetreatPosition(sieger, combat);
            }

            if (sieger.strength > reqMen) {
                // Split army: siege force + remainder
                const remainder = sieger.strength - reqMen;
                const siegeArmyId = `siege_force_${Date.now()}`;
                const siegeTargetId = combat.locationId || combat.roadId;

                const siegeArmy: Army = {
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
                } as Army;

                // FIX: Remainder army should NOT have enemy city as destination!
                // Clear destination and garrison to prevent auto-attack next turn
                const siegerExists = newArmies.some(a => a.id === sieger.id);
                const remainderArmy: Army = {
                    ...sieger,
                    ...retreatPos, // Move to retreat position
                    strength: remainder,
                    isSpent: false,  // FIX BUG SIEGE 1: Can continue acting (attack weakened position, etc.)
                    isSieging: false,
                    isGarrisoned: true, // Stay in place, don't auto-move
                    destinationId: null, // CRITICAL: Clear destination to prevent auto-attack
                    tripDestinationId: null, // Clear trip destination too
                    turnsUntilArrival: 0
                } as Army;

                if (siegerExists) {
                    newArmies = newArmies.map(a => a.id === sieger.id ? remainderArmy : a);
                } else {
                    newArmies.push(remainderArmy);
                }
                newArmies.push(siegeArmy);

            } else {
                // Entire army becomes siege force
                const siegeTargetId = combat.locationId || combat.roadId;

                // FIX: Create updated sieger and handle missing case
                const siegerExists = newArmies.some(a => a.id === sieger.id);
                const updatedSieger: Army = {
                    ...sieger,
                    ...retreatPos,
                    isSieging: true,
                    isGarrisoned: true,
                    isSpent: true,
                    destinationId: siegeTargetId,
                    tripDestinationId: siegeTargetId,
                    turnsUntilArrival: 0
                } as Army;

                if (siegerExists) {
                    newArmies = newArmies.map(a => a.id === sieger.id ? updatedSieger : a);
                } else {
                    newArmies.push(updatedSieger);
                }
            }
        }
    } else if (combat.roadId && combat.stageIndex !== undefined) {
        // Road siege - same split logic as location sieges
        const road = roads.find(r => r.id === combat.roadId);
        const stage = road?.stages.find(s => s.index === combat.stageIndex);
        const curLevel = stage ? stage.fortificationLevel : 0;
        const reqMen = curLevel >= 3 ? 1000 : 500;

        const sortedAttackers = newArmies.filter(a => attIds.includes(a.id)).sort((a, b) => b.strength - a.strength);

        if (sortedAttackers.length > 0) {
            const sieger = sortedAttackers[0];

            // Get correct position for siege army (stay at current road stage)
            const siegePosition = {
                locationType: 'ROAD' as const,
                locationId: null,
                roadId: combat.roadId,
                stageIndex: combat.stageIndex
            };

            if (sieger.strength > reqMen) {
                // Split army: siege force + remainder
                const remainder = sieger.strength - reqMen;
                const siegeArmyId = `siege_force_${Date.now()}`;

                const siegeArmy: Army = {
                    ...sieger,
                    ...siegePosition,
                    id: siegeArmyId,
                    strength: reqMen,
                    isSieging: true,
                    isGarrisoned: true,
                    isSpent: true,
                    action: undefined,
                    destinationId: sieger.destinationId,
                    tripDestinationId: sieger.tripDestinationId,
                    turnsUntilArrival: 0
                } as Army;

                // Remainder army stays at the same stage, can continue acting
                const siegerExists = newArmies.some(a => a.id === sieger.id);
                const remainderArmy: Army = {
                    ...sieger,
                    ...siegePosition,
                    strength: remainder,
                    isSpent: false,  // Can continue acting (attack weakened position)
                    isSieging: false,
                    isGarrisoned: true, // Stay in place
                    turnsUntilArrival: 0
                } as Army;

                if (siegerExists) {
                    newArmies = newArmies.map(a => a.id === sieger.id ? remainderArmy : a);
                } else {
                    newArmies.push(remainderArmy);
                }
                newArmies.push(siegeArmy);

            } else {
                // Entire army becomes siege force
                const siegerExists = newArmies.some(a => a.id === sieger.id);
                const updatedSieger: Army = {
                    ...sieger,
                    ...siegePosition,
                    isSieging: true,
                    isGarrisoned: true,
                    isSpent: true,
                    turnsUntilArrival: 0
                } as Army;

                if (siegerExists) {
                    newArmies = newArmies.map(a => a.id === sieger.id ? updatedSieger : a);
                } else {
                    newArmies.push(updatedSieger);
                }
            }
        }
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
                    defense: FORTIFICATION_LEVELS[newFortLevel].bonus
                };
            }
            return l;
        });
    } else if (combat.roadId && combat.stageIndex !== undefined) {
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
