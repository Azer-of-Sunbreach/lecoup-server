"use strict";
/**
 * Military Movement Service
 * Handles army movement logic including local and regional roads
 * Extracted from useGameEngine.ts moveArmy()
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeSplitArmy = exports.executeArmyMove = exports.canMoveArmy = void 0;
const types_1 = require("../../../types");
const data_1 = require("../../../data");
const economy_1 = require("../../../utils/economy");
/**
 * Check if an army can move to a destination
 */
const canMoveArmy = (state, armyId, destLocId) => {
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
    const road = state.roads.find(r => (r.from === army.locationId && r.to === destLocId) ||
        (r.to === army.locationId && r.from === destLocId));
    if (!road) {
        return { canMove: false, reason: 'No road to destination' };
    }
    return { canMove: true };
};
exports.canMoveArmy = canMoveArmy;
/**
 * Execute army movement
 * Returns state updates to apply
 */
const executeArmyMove = (state, armyId, destLocId, playerFaction) => {
    const check = (0, exports.canMoveArmy)(state, armyId, destLocId);
    if (!check.canMove) {
        return {
            success: false,
            newState: {},
            triggersRescan: false,
            message: check.reason || 'Cannot move'
        };
    }
    const army = state.armies.find(a => a.id === armyId);
    const road = state.roads.find(r => (r.from === army.locationId && r.to === destLocId) ||
        (r.to === army.locationId && r.from === destLocId));
    let updatedArmies = [...state.armies];
    let updatedChars = [...state.characters];
    let updatedLocs = [...state.locations];
    let newLogs = [...state.logs];
    let newTradeNotification = state.grainTradeNotification;
    if (road.quality === types_1.RoadQuality.LOCAL) {
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
            locationType: 'LOCATION',
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
            direction: 'FORWARD',
            foodSourceId: destLocId,
            lastSafePosition: { type: 'LOCATION', id: destLocId },
            isGarrisoned: false
        } : a);
        updatedChars = updatedChars.map(c => c.armyId === armyId ? {
            ...c,
            locationId: destLocId,
            destinationId: null,
            turnsUntilArrival: 0,
            status: types_1.CharacterStatus.AVAILABLE
        } : c);
        // Immediate Capture Check for Instant Moves
        const enemiesAtDest = state.armies.filter(a => a.locationId === destLocId &&
            a.faction !== playerFaction &&
            a.strength > 0);
        if (destLoc.faction !== playerFaction && enemiesAtDest.length === 0) {
            const newFortLevel = Math.max(0, destLoc.fortificationLevel - 1);
            const newDefense = data_1.FORTIFICATION_LEVELS[newFortLevel].bonus;
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
                            if (l.id === 'windward')
                                return { ...l, isGrainTradeActive: true, stability: Math.min(100, l.stability + 20) };
                            if (l.id === 'great_plains')
                                return { ...l, stability: Math.min(100, l.stability + 20) };
                            return l;
                        });
                        newLogs = [...newLogs, "Grain Trade restored by conquest."];
                        newTradeNotification = { type: 'RESTORED', factionName: "Changes in control" };
                    }
                }
            }
            newLogs = [...newLogs, `${destLoc.name} secured by ${types_1.FACTION_NAMES[playerFaction]}.`];
        }
    }
    else {
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
            locationType: 'ROAD',
            roadId: road.id,
            stageIndex: targetStageIndex,
            direction: road.from === army.locationId ? 'FORWARD' : 'BACKWARD',
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
        } : a);
        updatedChars = updatedChars.map(c => c.armyId === armyId ? { ...c, status: types_1.CharacterStatus.MOVING } : c);
        const destName = state.locations.find(l => l.id === destLocId)?.name;
        newLogs = [...newLogs, `Forces marching to ${destName}.`];
    }
    // Recalculate Economy
    updatedLocs = (0, economy_1.calculateEconomyAndFood)(updatedLocs, updatedArmies, updatedChars, state.roads);
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
exports.executeArmyMove = executeArmyMove;
/**
 * Split an army into two
 */
const executeSplitArmy = (state, armyId, amount) => {
    const army = state.armies.find(a => a.id === armyId);
    if (!army || amount <= 0 || amount >= army.strength) {
        return {};
    }
    const newArmyId = `army_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newArmy = {
        ...army,
        id: newArmyId,
        strength: amount,
        action: undefined,
        isGarrisoned: false
    };
    const updatedArmies = state.armies.map(a => a.id === armyId ? { ...a, strength: a.strength - amount } : a);
    return {
        armies: [...updatedArmies, newArmy]
    };
};
exports.executeSplitArmy = executeSplitArmy;
