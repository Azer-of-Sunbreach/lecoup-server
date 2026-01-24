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

    const army = state.armies.find(a => a.id === armyId);
    if (!army) {
        return { success: false, newState: {}, message: 'Army not found' };
    }

    // Determine new status: 
    // If GOVERNING and army is in same location -> Stay GOVERNING
    // Otherwise -> AVAILABLE (default for commanding army)
    const newStatus = (leader.status === CharacterStatus.GOVERNING && leader.locationId === army.locationId)
        ? CharacterStatus.GOVERNING
        : CharacterStatus.AVAILABLE;

    return {
        success: true,
        newState: {
            characters: state.characters.map(c =>
                c.id === charId ? { ...c, armyId, status: newStatus } : c
            )
            // Attach log removed - player action doesn't need logging
        },
        message: `${leader.name} attached to army`
    };
};

/**
 * Detach a leader from their army
 * NOTE: If leader is GOVERNING, they retain that status (governor can command armies in their region)
 */
export const executeDetachLeader = (
    state: GameState,
    charId: string
): LeaderActionResult => {
    const leader = state.characters.find(c => c.id === charId);
    if (!leader) {
        return { success: false, newState: {}, message: 'Leader not found' };
    }

    // CORRECTIF 3: Preserve GOVERNING status when detaching
    const newStatus = leader.status === CharacterStatus.GOVERNING
        ? CharacterStatus.GOVERNING
        : CharacterStatus.AVAILABLE;

    return {
        success: true,
        newState: {
            characters: state.characters.map(c =>
                c.id === charId ? { ...c, armyId: null, status: newStatus } : c
            )
            // Detach log removed - player action doesn't need logging
        },
        message: `${leader.name} detached`
    };
};

/**
 * Move a leader to a new location
 * NOTE: If leader is UNDERCOVER, they stay UNDERCOVER in enemy territory (unless another undercover leader is already there).
 * They become AVAILABLE only when entering friendly or neutral territory.
 * Their clandestine actions are cleared when movement starts.
 * 
 * EVOLUTION 6: Anti-exploit safeguards:
 * 1. One exfiltration per turn limit (prevents back-and-forth reset exploit)
 * 2. Linked location check (preserves detection when hopping between linked locations with same controller)
 */
import { calculateLeaderTravelTime } from '../leaders/leaderPathfinding';

export const executeMoveLeader = (
    state: GameState,
    charId: string,
    destId: string
): LeaderActionResult => {
    const char = state.characters.find(c => c.id === charId);
    if (!char) {
        console.error('[executeMoveLeader] Character not found', charId);
        return { success: false, newState: {}, message: 'Leader not found' };
    }

    // === EVOLUTION 6: One exfiltration per turn limit ===
    if (char.lastExfiltrationTurn === state.turn) {
        console.warn('[executeMoveLeader] Blocked: Leader already moved this turn', char.name);
        return { success: false, newState: {}, message: 'Leader already moved this turn' };
    }

    console.log('[executeMoveLeader] Moving', char.name, char.status, 'to', destId);

    const road = state.roads.find(r =>
        (r.from === char.locationId && r.to === destId) ||
        (r.to === char.locationId && r.from === destId)
    );
    // Use centralized travel calculation which includes bonuses
    const turns = calculateLeaderTravelTime(char.locationId || '', destId, state.locations, state.roads);
    const locId = turns === 0 ? destId : char.locationId;

    const originLocation = state.locations.find(l => l.id === char.locationId);
    const destLocation = state.locations.find(l => l.id === destId);
    const destName = destLocation?.name || 'Unknown';
    const destFaction = destLocation?.faction;

    // === EVOLUTION 6: Check if this is a linked location move with same controller ===
    const isLinkedLocation = (
        originLocation?.linkedLocationId === destId ||
        destLocation?.linkedLocationId === char.locationId
    );
    const sameController = originLocation?.faction === destLocation?.faction;
    const shouldPreserveDetection = isLinkedLocation && sameController;

    if (shouldPreserveDetection) {
        console.log('[executeMoveLeader] Linked location with same controller - preserving detection level');
    }

    // Determine final status on arrival
    let finalStatus: CharacterStatus;

    if (turns === 0) {
        // Immediate arrival - determine status now
        if (char.status === CharacterStatus.UNDERCOVER && destFaction && destFaction !== char.faction && destFaction !== FactionId.NEUTRAL) {
            // Moving to enemy territory - check if another undercover leader is already there
            const otherUndercoverThere = state.characters.some(c =>
                c.id !== charId &&
                c.faction === char.faction &&
                c.status === CharacterStatus.UNDERCOVER &&
                c.locationId === destId
            );
            finalStatus = otherUndercoverThere ? CharacterStatus.AVAILABLE : CharacterStatus.UNDERCOVER;
        } else {
            // Moving to friendly or neutral territory
            finalStatus = CharacterStatus.AVAILABLE;
        }
    } else {
        // Will travel - status becomes MOVING, final status determined on arrival
        finalStatus = CharacterStatus.MOVING;
    }

    // Store original status to determine final status on arrival
    const wasUndercover = char.status === CharacterStatus.UNDERCOVER;
    const wasGoverning = char.status === CharacterStatus.GOVERNING;
    const departureLocationId = char.locationId;

    // If the character was governing, clear policies on their departure location
    let updatedLocations = state.locations;
    if (wasGoverning && departureLocationId) {
        updatedLocations = state.locations.map(loc =>
            loc.id === departureLocationId
                ? { ...loc, governorPolicies: {} }
                : loc
        );
    }

    return {
        success: true,
        newState: {
            characters: state.characters.map(c =>
                c.id === charId ? {
                    ...c,
                    locationId: locId!,
                    destinationId: destId,
                    turnsUntilArrival: turns,
                    status: finalStatus,
                    // Clear governor mission if any (e.g. if was a governor or traveling to be one)
                    governorMission: undefined,
                    // Clear clandestine actions when UNDERCOVER or GOVERNING leader starts moving
                    activeClandestineActions: (wasUndercover || wasGoverning) ? undefined : c.activeClandestineActions,
                    // Preserve budget when moving undercover
                    clandestineBudget: wasUndercover ? c.clandestineBudget : c.clandestineBudget,
                    // EVOLUTION 6: Conditional detection reset
                    // Reset if NOT linked-location-same-controller, otherwise preserve
                    detectionLevel: shouldPreserveDetection ? c.detectionLevel : 0,
                    pendingDetectionEffects: shouldPreserveDetection ? c.pendingDetectionEffects : undefined,
                    // EVOLUTION 6: Track last exfiltration turn
                    lastExfiltrationTurn: state.turn
                } : c
            ),
            // Clear governor policies on departure location if was governing
            locations: updatedLocations,
        },
        message: `${char.name} ${turns === 0 ? 'relocated' : 'travelling'} to ${destName}`
    };
};
