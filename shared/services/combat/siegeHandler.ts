// Siege Handler - Handles SIEGE choice

import { Army, Location, Road, CombatState, FactionId, SiegeNotification } from '../../types';
import { FORTIFICATION_LEVELS } from '../../constants';
import {
    calculateRetreatPosition,
    getArmyAtCombatPosition,
    isValidRetreatPosition,
    getFallbackRetreatPosition
} from './helpers';

import { StructuredLogData } from './types';

export interface SiegeResult {
    armies: Army[];
    locations: Location[];
    roads: Road[];
    resources: { [key in FactionId]: { gold: number } };
    logMessage: string;
    logEntries?: StructuredLogData[];
    siegeNotification?: SiegeNotification | null;
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

                // Siege army retreats to build siege weapons
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

                // Remainder army STAYS at combat location to attack the weakened fortification
                const siegerExists = newArmies.some(a => a.id === sieger.id);
                const remainderArmy: Army = {
                    ...sieger,
                    // Keep at combat location, NOT retreat position
                    locationType: 'LOCATION',
                    locationId: combat.locationId,
                    roadId: null,
                    stageIndex: 0,
                    strength: remainder,
                    isSpent: false,  // Can continue acting (attack weakened position)
                    isSieging: false,
                    isGarrisoned: false, // Will try to attack
                    destinationId: combat.locationId, // Keep destination to attack
                    tripDestinationId: combat.locationId,
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

            // Reduce defense if sieging a location
            if (combat.locationId) {
                newLocations = newLocations.map(l => l.id === combat.locationId ? {
                    ...l,
                    fortificationLevel: Math.max(0, l.fortificationLevel - 1),
                    defense: FORTIFICATION_LEVELS[Math.max(0, l.fortificationLevel - 1)].bonus,
                    hasBeenSiegedThisTurn: true
                } : l);
            }
            if (combat.roadId && combat.stageIndex !== undefined) {
                newRoads = newRoads.map(r => r.id === combat.roadId ? {
                    ...r,
                    stages: r.stages.map(s => s.index === combat.stageIndex ? {
                        ...s,
                        fortificationLevel: 0 // Road forts destroyed immediately? Or reduced? Assuming reduced/destroyed.
                    } : s)
                } : r);
            }

            logMsg = "Siege engines constructed. Defenses weakened.";

            return {
                armies: newArmies,
                locations: newLocations,
                roads: newRoads,
                resources: newResources,
                logMessage: logMsg,
                logEntries: [{
                    key: 'siegeConstructed',
                    params: {}
                }],
                siegeNotification: {
                    targetId: combat.locationId!,
                    targetName: loc?.name || 'Unknown Location',
                    attackerName: playerFaction
                }
            };
        }
    } else if (combat.roadId && combat.stageIndex !== undefined) {
        // Road siege - same split logic as location sieges
        const road = roads.find(r => r.id === combat.roadId);
        const stage = road?.stages.find(s => s.index === combat.stageIndex);
        const curLevel = stage ? stage.fortificationLevel : 0;
        const reqMen = curLevel >= 3 ? 1000 : 500;
        const attIds = combat.attackers.map(a => a.id);
        const sortedAttackers = newArmies.filter(a => attIds.includes(a.id)).sort((a, b) => b.strength - a.strength);

        if (sortedAttackers.length > 0 && road) {
            const sieger = sortedAttackers[0];

            // Calculate retreat position for siege army (one stage back from combat)
            // The siege force retreats to build siege weapons while remainder attacks
            const retreatStageIndex = sieger.direction === 'FORWARD'
                ? Math.max(0, combat.stageIndex - 1)  // Going forward, retreat is stage behind
                : Math.min(road.stages.length - 1, combat.stageIndex + 1);  // Going backward, retreat is stage ahead

            // Check if we can retreat - if at stage 0 going forward or last stage going backward,
            // retreat to the origin location instead
            const canRetreatOnRoad = (sieger.direction === 'FORWARD' && combat.stageIndex > 0) ||
                (sieger.direction === 'BACKWARD' && combat.stageIndex < road.stages.length - 1);

            let siegePosition: any;
            if (canRetreatOnRoad) {
                siegePosition = {
                    locationType: 'ROAD' as const,
                    locationId: null,
                    roadId: combat.roadId,
                    stageIndex: retreatStageIndex
                };
            } else {
                // Retreat to origin location
                const originLocId = sieger.direction === 'FORWARD' ? road.from : road.to;
                siegePosition = {
                    locationType: 'LOCATION' as const,
                    locationId: originLocId,
                    roadId: null,
                    stageIndex: 0
                };
            }

            // Combat position for remainder (stays at combat stage to fight)
            const combatPosition = {
                locationType: 'ROAD' as const,
                locationId: null,
                roadId: combat.roadId,
                stageIndex: combat.stageIndex
            };

            if (sieger.strength > reqMen) {
                // Split army: siege force + remainder
                const remainder = sieger.strength - reqMen;
                const siegeArmyId = `siege_force_${Date.now()}`;

                // Siege army retreats to build siege weapons
                const siegeArmy: Army = {
                    ...sieger,
                    ...siegePosition,
                    id: siegeArmyId,
                    strength: reqMen,
                    isSieging: true,
                    isGarrisoned: false, // Will try to advance next turn
                    isSpent: true,
                    action: undefined,
                    destinationId: sieger.destinationId,
                    tripDestinationId: sieger.tripDestinationId,
                    turnsUntilArrival: 0
                } as Army;

                // Remainder army stays at combat stage to attack
                const siegerExists = newArmies.some(a => a.id === sieger.id);
                const remainderArmy: Army = {
                    ...sieger,
                    ...combatPosition,
                    strength: remainder,
                    isSpent: false,  // Can continue acting (attack weakened position)
                    isSieging: false,
                    isGarrisoned: false, // Will try to advance next turn
                    turnsUntilArrival: 0
                } as Army;

                if (siegerExists) {
                    newArmies = newArmies.map(a => a.id === sieger.id ? remainderArmy : a);
                } else {
                    newArmies.push(remainderArmy);
                }
                newArmies.push(siegeArmy);

            } else {
                // Entire army becomes siege force and retreats
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
    // (Wait, logic above duplicates this for location, but handles roads incorrectly?
    // The original logic had update in block. Lines 255-277 in file 1141 seem to be duplicate or outside?)
    // In original file 1141 lines 255-277 update location/road if not already updated?
    // Actually the location update block was inside `if (combat.locationId)` block before return in original.
    // But road update was inside `else if` block?
    // Let's copy logic faithfully.

    // Actually, lines 255-277 in viewing 1141 are OUTSIDE the `if/else if` blocks?
    // No, logic structure in 1141:
    // if (combat.locationId) { ... if () { return } }
    // else if (combat.roadId) { ... }

    // Lines 255-277 are outside conditional return.
    // BUT the return IS inside `if (combat.locationId)` (lines 281).
    // And `else if (roadId)` block DOES NOT explicitly return.
    // So if road siege, it falls through to 255-277.

    // Let's check my constructed code.
    // I put `return` inside `if (combat.locationId)`.
    // So I need to handle `logEntries` and returns correctly for road siege as well.

    if (combat.roadId && combat.stageIndex !== undefined) {
        newRoads = newRoads.map(r => r.id === combat.roadId ? {
            ...r,
            stages: r.stages.map(s => s.index === combat.stageIndex ? {
                ...s,
                hasBeenSiegedThisTurn: true,
                fortificationLevel: Math.max(0, s.fortificationLevel - 1)
            } : s)
        } : r);

        logMsg = "Siege engines constructed. Defenses weakened.";
        return {
            armies: newArmies,
            locations: newLocations,
            roads: newRoads,
            resources: newResources,
            logMessage: logMsg,
            logEntries: [{
                key: 'siegeConstructed',
                params: {}
            }]
        };
    }

    return {
        armies: newArmies,
        locations: newLocations,
        roads: newRoads,
        resources: newResources,
        logMessage: "Siege failed (insufficient troops or invalid state)."
    };
};
