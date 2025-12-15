"use strict";
/**
 * Leaders Service
 * Handles player leader management (attach, detach, move)
 * Extracted from App.tsx handleAttachLeader/DetachLeader/MoveLeader
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeMoveLeader = exports.executeDetachLeader = exports.executeAttachLeader = void 0;
const types_1 = require("../../../types");
/**
 * Attach a leader to an army
 */
const executeAttachLeader = (state, armyId, charId) => {
    const leader = state.characters.find(c => c.id === charId);
    if (!leader) {
        return { success: false, newState: {}, message: 'Leader not found' };
    }
    return {
        success: true,
        newState: {
            characters: state.characters.map(c => c.id === charId ? { ...c, armyId, status: types_1.CharacterStatus.AVAILABLE } : c)
            // Attach log removed - player action doesn't need logging
        },
        message: `${leader.name} attached to army`
    };
};
exports.executeAttachLeader = executeAttachLeader;
/**
 * Detach a leader from their army
 */
const executeDetachLeader = (state, charId) => {
    const leader = state.characters.find(c => c.id === charId);
    if (!leader) {
        return { success: false, newState: {}, message: 'Leader not found' };
    }
    return {
        success: true,
        newState: {
            characters: state.characters.map(c => c.id === charId ? { ...c, armyId: null, status: types_1.CharacterStatus.AVAILABLE } : c)
            // Detach log removed - player action doesn't need logging
        },
        message: `${leader.name} detached`
    };
};
exports.executeDetachLeader = executeDetachLeader;
/**
 * Move a leader to a new location
 */
const executeMoveLeader = (state, charId, destId) => {
    const char = state.characters.find(c => c.id === charId);
    if (!char) {
        return { success: false, newState: {}, message: 'Leader not found' };
    }
    const road = state.roads.find(r => (r.from === char.locationId && r.to === destId) ||
        (r.to === char.locationId && r.from === destId));
    const turns = road ? (road.travelTurns || road.stages.length) : 1;
    const status = turns === 0 ? types_1.CharacterStatus.AVAILABLE : types_1.CharacterStatus.MOVING;
    const locId = turns === 0 ? destId : char.locationId;
    const destName = state.locations.find(l => l.id === destId)?.name || 'Unknown';
    return {
        success: true,
        newState: {
            characters: state.characters.map(c => c.id === charId ? {
                ...c,
                locationId: locId,
                destinationId: destId,
                turnsUntilArrival: turns,
                status
            } : c),
            logs: [...state.logs, `${char.name} ${turns === 0 ? 'relocated' : 'travelling'} to ${destName}.`].slice(-50)
        },
        message: `${char.name} ${turns === 0 ? 'relocated' : 'travelling'} to ${destName}`
    };
};
exports.executeMoveLeader = executeMoveLeader;
