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
    const army = state.armies.find(a => a.id === armyId);
    if (!army) {
        return { success: false, newState: {}, message: 'Army not found' };
    }
    // Determine new status: 
    // If GOVERNING and army is in same location -> Stay GOVERNING
    // Otherwise -> AVAILABLE (default for commanding army)
    const newStatus = (leader.status === types_1.CharacterStatus.GOVERNING && leader.locationId === army.locationId)
        ? types_1.CharacterStatus.GOVERNING
        : types_1.CharacterStatus.AVAILABLE;
    return {
        success: true,
        newState: {
            characters: state.characters.map(c => c.id === charId ? { ...c, armyId, status: newStatus } : c)
            // Attach log removed - player action doesn't need logging
        },
        message: `${leader.name} attached to army`
    };
};
exports.executeAttachLeader = executeAttachLeader;
/**
 * Detach a leader from their army
 * NOTE: If leader is GOVERNING, they retain that status (governor can command armies in their region)
 */
const executeDetachLeader = (state, charId) => {
    const leader = state.characters.find(c => c.id === charId);
    if (!leader) {
        return { success: false, newState: {}, message: 'Leader not found' };
    }
    // CORRECTIF 3: Preserve GOVERNING status when detaching
    const newStatus = leader.status === types_1.CharacterStatus.GOVERNING
        ? types_1.CharacterStatus.GOVERNING
        : types_1.CharacterStatus.AVAILABLE;
    return {
        success: true,
        newState: {
            characters: state.characters.map(c => c.id === charId ? { ...c, armyId: null, status: newStatus } : c)
            // Detach log removed - player action doesn't need logging
        },
        message: `${leader.name} detached`
    };
};
exports.executeDetachLeader = executeDetachLeader;
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
const leaderPathfinding_1 = require("../leaders/leaderPathfinding");
const freeTrader_1 = require("../economy/freeTrader");
const executeMoveLeader = (state, charId, destId) => {
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
    const road = state.roads.find(r => (r.from === char.locationId && r.to === destId) ||
        (r.to === char.locationId && r.from === destId));
    // Use centralized travel calculation which includes bonuses
    const turns = (0, leaderPathfinding_1.calculateLeaderTravelTime)(char.locationId || '', destId, state.locations, state.roads);
    const locId = turns === 0 ? destId : char.locationId;
    const originLocation = state.locations.find(l => l.id === char.locationId);
    const destLocation = state.locations.find(l => l.id === destId);
    const destName = destLocation?.name || 'Unknown';
    const destFaction = destLocation?.faction;
    // === EVOLUTION 6: Check if this is a linked location move with same controller ===
    const isLinkedLocation = (originLocation?.linkedLocationId === destId ||
        destLocation?.linkedLocationId === char.locationId);
    const sameController = originLocation?.faction === destLocation?.faction;
    const shouldPreserveDetection = isLinkedLocation && sameController;
    if (shouldPreserveDetection) {
        console.log('[executeMoveLeader] Linked location with same controller - preserving detection level');
    }
    // Determine final status on arrival
    let finalStatus;
    if (turns === 0) {
        // Immediate arrival - determine status now
        if (char.status === types_1.CharacterStatus.UNDERCOVER && destFaction && destFaction !== char.faction && destFaction !== types_1.FactionId.NEUTRAL) {
            // Moving to enemy territory - check if another undercover leader is already there
            const otherUndercoverThere = state.characters.some(c => c.id !== charId &&
                c.faction === char.faction &&
                c.status === types_1.CharacterStatus.UNDERCOVER &&
                c.locationId === destId);
            finalStatus = otherUndercoverThere ? types_1.CharacterStatus.AVAILABLE : types_1.CharacterStatus.UNDERCOVER;
        }
        else {
            // Moving to friendly or neutral territory
            finalStatus = types_1.CharacterStatus.AVAILABLE;
        }
    }
    else {
        // Will travel - status becomes MOVING, final status determined on arrival
        finalStatus = types_1.CharacterStatus.MOVING;
    }
    // Store original status to determine final status on arrival
    const wasUndercover = char.status === types_1.CharacterStatus.UNDERCOVER;
    const wasGoverning = char.status === types_1.CharacterStatus.GOVERNING;
    const departureLocationId = char.locationId;
    // If the character was governing, clear policies on their departure location
    let updatedLocations = state.locations;
    if (wasGoverning && departureLocationId) {
        updatedLocations = state.locations.map(loc => loc.id === departureLocationId
            ? { ...loc, governorPolicies: {} }
            : loc);
    }
    // EVOLUTION: Free Trader Logic - Immediate Effect
    // If arriving immediately, enforce tax limits at destination with the new leader present
    let ftMessagePart = "";
    if (turns === 0 && destLocation) {
        // Simulate character at destination to check limits
        const tempCharacters = state.characters.map(c => c.id === charId ? { ...c, locationId: destId, status: finalStatus } : c);
        const ftResult = (0, freeTrader_1.enforceFreeTraderLimits)(destLocation, tempCharacters);
        if (ftResult.modified) {
            updatedLocations = updatedLocations.map(l => l.id === destLocation.id ? ftResult.location : l);
            ftMessagePart = " (Taxes adjusted due to Free Trader)";
            console.log(`[executeMoveLeader] Free Trader effect applied in ${destLocation.name}: ${ftResult.modifications.join(', ')}`);
        }
    }
    return {
        success: true,
        newState: {
            characters: state.characters.map(c => c.id === charId ? {
                ...c,
                locationId: locId,
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
            } : c),
            // Clear governor policies on departure location if was governing
            locations: updatedLocations,
        },
        message: `${char.name} ${turns === 0 ? 'relocated' : 'travelling'} to ${destName}${ftMessagePart}`
    };
};
exports.executeMoveLeader = executeMoveLeader;
