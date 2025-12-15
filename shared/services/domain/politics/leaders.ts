/**
 * Leaders Service
 * Handles player leader management (attach, detach, move)
 * Extracted from App.tsx handleAttachLeader/DetachLeader/MoveLeader
 */

import { GameState, CharacterStatus, FactionId } from '../../../types';

export interface LeaderActionResult {
    success: boolean;
    newState: Partial<GameState>;
    message: string;
}

/**
 * Attach a leader to an army
 */
export const executeAttachLeader = (
    state: GameState,
    armyId: string,
    charId: string
): LeaderActionResult => {
    const leader = state.characters.find(c => c.id === charId);
    if (!leader) {
        return { success: false, newState: {}, message: 'Leader not found' };
    }

    return {
        success: true,
        newState: {
            characters: state.characters.map(c =>
                c.id === charId ? { ...c, armyId, status: CharacterStatus.AVAILABLE } : c
            )
            // Attach log removed - player action doesn't need logging
        },
        message: `${leader.name} attached to army`
    };
};

/**
 * Detach a leader from their army
 */
export const executeDetachLeader = (
    state: GameState,
    charId: string
): LeaderActionResult => {
    const leader = state.characters.find(c => c.id === charId);
    if (!leader) {
        return { success: false, newState: {}, message: 'Leader not found' };
    }

    return {
        success: true,
        newState: {
            characters: state.characters.map(c =>
                c.id === charId ? { ...c, armyId: null, status: CharacterStatus.AVAILABLE } : c
            )
            // Detach log removed - player action doesn't need logging
        },
        message: `${leader.name} detached`
    };
};

/**
 * Move a leader to a new location
 */
export const executeMoveLeader = (
    state: GameState,
    charId: string,
    destId: string
): LeaderActionResult => {
    const char = state.characters.find(c => c.id === charId);
    if (!char) {
        return { success: false, newState: {}, message: 'Leader not found' };
    }

    const road = state.roads.find(r =>
        (r.from === char.locationId && r.to === destId) ||
        (r.to === char.locationId && r.from === destId)
    );
    const turns = road ? (road.travelTurns || road.stages.length) : 1;
    const status = turns === 0 ? CharacterStatus.AVAILABLE : CharacterStatus.MOVING;
    const locId = turns === 0 ? destId : char.locationId;

    const destName = state.locations.find(l => l.id === destId)?.name || 'Unknown';

    return {
        success: true,
        newState: {
            characters: state.characters.map(c =>
                c.id === charId ? {
                    ...c,
                    locationId: locId!,
                    destinationId: destId,
                    turnsUntilArrival: turns,
                    status
                } : c
            ),
            logs: [...state.logs, `${char.name} ${turns === 0 ? 'relocated' : 'travelling'} to ${destName}.`].slice(-50)
        },
        message: `${char.name} ${turns === 0 ? 'relocated' : 'travelling'} to ${destName}`
    };
};
