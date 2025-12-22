/**
 * Military Movement Service
 * Handles army movement logic including local and regional roads
 * Extracted from useGameEngine.ts moveArmy()
 */

import { GameState, Army, Character, FactionId, CharacterStatus, RoadQuality, FACTION_NAMES, LogEntry } from '../../../types';
import { FORTIFICATION_LEVELS } from '../../../data';
import { calculateEconomyAndFood } from '../../../utils/economy';
import { createForcesApproachingLog, createGrainTradeConquestLog, createLocationSecuredLog } from '../../../services/logs/logFactory';

export interface MoveArmyResult {
    success: boolean;
    newState: Partial<GameState>;
    triggersRescan: boolean;
    message: string;
}

/**
 * Check if an army can move to a destination
 */
export const canMoveArmy = (
    state: GameState,
    armyId: string,
    destLocId: string
): { canMove: boolean; reason?: string } => {
    const army = state.armies.find(a => a.id === armyId);

    if (!army) {
        return { canMove: false, reason: 'Army not found' };
    }

    if (army.isSpent) {
        return { canMove: false, reason: 'Army is spent' };
    }

    if (army.isSieging) {
        return { canMove: false, reason: 'Army is sieging' };
    }

    const road = state.roads.find(r =>
        (r.from === army.locationId && r.to === destLocId) ||
        (r.to === army.locationId && r.from === destLocId)
    );

    if (!road) {
        return { canMove: false, reason: 'No road to destination' };
    }

    return { canMove: true };
};

/**
 * Execute army movement
 * Returns state updates to apply
 */
export const executeArmyMove = (
    state: GameState,
    armyId: string,
    destLocId: string,
    playerFaction: FactionId
): MoveArmyResult => {
    const check = canMoveArmy(state, armyId, destLocId);
    if (!check.canMove) {
        return {
            success: false,
            newState: {},
            triggersRescan: false,
            message: check.reason || 'Cannot move'
        };
    }

    const army = state.armies.find(a => a.id === armyId)!;
    const road = state.roads.find(r =>
        (r.from === army.locationId && r.to === destLocId) ||
        (r.to === army.locationId && r.from === destLocId)
    )!;

    let updatedArmies = [...state.armies];
    let updatedChars = [...state.characters];
    let updatedLocs = [...state.locations];
    let newLogs: LogEntry[] = [...state.logs];
    let newTradeNotification = state.grainTradeNotification;

    if (road.quality === RoadQuality.LOCAL) {
        // Immediate move for local roads
        const destLoc = state.locations.find(l => l.id === destLocId);
        if (!destLoc) {
            return {
                success: false,
                newState: {},
                triggersRescan: false,
                message: 'Destination not found'
            };
        }

        updatedArmies = updatedArmies.map(a => a.id === armyId ? {
            ...a,
            locationId: destLocId,
            locationType: 'LOCATION' as const,
            // Legacy fields maintained for compatibility
            originLocationId: destLocId,
            destinationId: null,

            // New Robust Fields
            tripOriginId: a.locationType === 'LOCATION' ? (a.locationId || a.tripOriginId) : a.tripOriginId,
            tripDestinationId: null, // Instant arrival, no destination pending
            startOfTurnPosition: { type: 'LOCATION', id: a.locationId || destLocId }, // Instant move = effective immediately? Or snapshot current? For Instant move, prev state matters less for retreat as it's done.

            turnsUntilArrival: 0,
            roadId: null,
            stageIndex: 0,
            direction: 'FORWARD' as const,
            foodSourceId: destLocId,
            lastSafePosition: { type: 'LOCATION' as const, id: destLocId },
            isGarrisoned: false
        } : a);

        updatedChars = updatedChars.map(c => c.armyId === armyId ? {
            ...c,
            locationId: destLocId,
            destinationId: null,
            turnsUntilArrival: 0,
            status: CharacterStatus.AVAILABLE
        } : c);

        // Immediate Capture Check for Instant Moves
        const enemiesAtDest = state.armies.filter(a =>
            a.locationId === destLocId &&
            a.faction !== playerFaction &&
            a.strength > 0
        );

        if (destLoc.faction !== playerFaction && enemiesAtDest.length === 0) {
            const newFortLevel = Math.max(0, destLoc.fortificationLevel - 1);
            const newDefense = FORTIFICATION_LEVELS[newFortLevel].bonus;

            updatedLocs = updatedLocs.map(l => {
                if (l.id === destLocId) {
                    return {
                        ...l,
                        faction: playerFaction,
                        fortificationLevel: newFortLevel,
                        defense: newDefense
                    };
                }
                return l;
            });

            // Handle grain trade restoration
            if (destLocId === 'windward' || destLocId === 'great_plains') {
                const windward = updatedLocs.find(l => l.id === 'windward');
                const greatPlains = updatedLocs.find(l => l.id === 'great_plains');

                if (windward && greatPlains) {
                    const shouldBeActive = windward.faction !== greatPlains.faction;
                    if (!windward.isGrainTradeActive && shouldBeActive) {
                        updatedLocs = updatedLocs.map(l => {
                            if (l.id === 'windward') return { ...l, isGrainTradeActive: true, stability: Math.min(100, l.stability + 20) };
                            if (l.id === 'great_plains') return { ...l, stability: Math.min(100, l.stability + 20) };
                            return l;
                        });
                        newLogs = [...newLogs, createGrainTradeConquestLog(state.turn)];
                        newTradeNotification = { type: 'RESTORED', factionName: "Changes in control" };
                    }
                }
            }

            newLogs = [...newLogs, createLocationSecuredLog(destLoc.name, destLocId, destLoc.faction, playerFaction, state.turn)];
        }

    } else {
        // Regional Move Logic
        const targetStageIndex = road.from === army.locationId ? 0 : road.stages.length - 1;

        // Update foodSourceId for road travel
        const originLoc = state.locations.find(l => l.id === (army.locationId || army.originLocationId));
        let newFoodSourceId = army.foodSourceId;
        if (originLoc) {
            newFoodSourceId = originLoc.type === 'CITY' && originLoc.linkedLocationId
                ? originLoc.linkedLocationId
                : originLoc.id;
        }

        updatedArmies = updatedArmies.map(a => a.id === armyId ? {
            ...a,
            locationType: 'ROAD' as const,
            roadId: road.id,
            stageIndex: targetStageIndex,
            direction: road.from === army.locationId ? 'FORWARD' as const : 'BACKWARD' as const,

            // Legacy
            destinationId: destLocId,
            originLocationId: a.locationId || a.originLocationId,

            // New Robust Fields
            tripOriginId: a.locationType === 'LOCATION' ? (a.locationId || a.tripOriginId) : a.tripOriginId,
            tripDestinationId: destLocId,
            // Initialize startOfTurnPosition if not set (first move of turn?), otherwise keep? 
            // Actually, executeArmyMove is PLAYER ACTION. Current position is the safe start for THIS trek?
            // No, startOfTurnPosition should be set by TurnProcessor at START OF TURN.
            // But if we move mid-turn (Instant?), we might need it? 
            // For Player moves, we just respect what's there or update trip params. 
            // We should NOT reset startOfTurnPosition here probably, as that tracks "Where I was at start of turn".
            // However, if I move, my "Trip Origin" is updated.

            locationId: null,
            action: undefined,
            isGarrisoned: false,
            justMoved: true,
            foodSourceId: newFoodSourceId
        } as Army : a);

        updatedChars = updatedChars.map(c =>
            c.armyId === armyId ? { ...c, status: CharacterStatus.MOVING } : c
        );

        const destLoc = state.locations.find(l => l.id === destLocId);
        const destName = destLoc?.name || 'Unknown';
        const destFaction = destLoc?.faction || FactionId.NEUTRAL;
        // Only add log if enemy is marching to player's territory
        const approachingLog = createForcesApproachingLog(
            destName,
            destFaction,
            playerFaction,
            armyId,
            state.turn
        );
        if (approachingLog) {
            newLogs = [...newLogs, approachingLog];
        }
    }

    // Recalculate Economy
    updatedLocs = calculateEconomyAndFood(updatedLocs, updatedArmies, updatedChars, state.roads);

    return {
        success: true,
        newState: {
            armies: updatedArmies,
            characters: updatedChars,
            locations: updatedLocs,
            logs: newLogs.slice(-50),
            grainTradeNotification: newTradeNotification,
            hasScannedBattles: false // Force scan to detect instant combat
        },
        triggersRescan: true,
        message: 'Move initiated'
    };
};

/**
 * Split an army into two
 */
export const executeSplitArmy = (
    state: GameState,
    armyId: string,
    amount: number
): Partial<GameState> => {
    const army = state.armies.find(a => a.id === armyId);
    if (!army || amount <= 0 || amount >= army.strength) {
        return {};
    }

    const newArmyId = `army_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newArmy: Army = {
        ...army,
        id: newArmyId,
        strength: amount,
        action: undefined,
        isGarrisoned: false
    };

    const updatedArmies = state.armies.map(a =>
        a.id === armyId ? { ...a, strength: a.strength - amount } : a
    );

    return {
        armies: [...updatedArmies, newArmy]
    };
};
