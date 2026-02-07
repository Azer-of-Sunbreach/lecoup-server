"use strict";
/**
 * Nobles Leader Availability Service
 *
 * Handles the progressive availability of Nobles recruitable leaders.
 * Leaders become available at specific turns, creating strategic timing choices.
 *
 * @module shared/services/domain/leaders
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOBLES_RECRUITABLE_LEADER_IDS = exports.NOBLES_LEADER_AVAILABILITY = void 0;
exports.getLeadersAvailableAtTurn = getLeadersAvailableAtTurn;
exports.isLeaderAvailableAtTurn = isLeaderAvailableAtTurn;
exports.processNoblesLeaderAvailability = processNoblesLeaderAvailability;
exports.getAvailableNoblesRecruitableLeaders = getAvailableNoblesRecruitableLeaders;
// ============================================================
// AVAILABILITY SCHEDULE
// ============================================================
/**
 * Turn at which each Nobles leader becomes recruitable.
 * Leaders start with isRecruitableLeader: false and become true at their designated turn.
 */
exports.NOBLES_LEADER_AVAILABILITY = {
    duke_great_plains: 2,
    demain: 4,
    vergier: 6,
    duke_esmarch: 8,
    duke_hornvale: 10,
    klemath: 12,
    georges_cadal: 14,
    spelttiller: 16,
    baron_ystrir: 18
};
/**
 * All Nobles recruitable leader IDs (for reference).
 */
exports.NOBLES_RECRUITABLE_LEADER_IDS = Object.keys(exports.NOBLES_LEADER_AVAILABILITY);
// ============================================================
// ACTIVATION FUNCTIONS
// ============================================================
/**
 * Get the leader IDs that should become available at a specific turn.
 */
function getLeadersAvailableAtTurn(turn) {
    return Object.entries(exports.NOBLES_LEADER_AVAILABILITY)
        .filter(([_, availTurn]) => availTurn === turn)
        .map(([id]) => id);
}
/**
 * Check if a leader should be available based on the current turn.
 */
function isLeaderAvailableAtTurn(leaderId, currentTurn) {
    const availTurn = exports.NOBLES_LEADER_AVAILABILITY[leaderId];
    if (availTurn === undefined)
        return false;
    return currentTurn >= availTurn;
}
/**
 * Process leader availability for a turn.
 * Activates leaders whose turn has come (sets isRecruitableLeader to true).
 *
 * @param characters - All characters in the game
 * @param currentTurn - The current turn number
 * @returns Updated characters array and list of newly available leaders
 */
function processNoblesLeaderAvailability(characters, currentTurn) {
    const leadersToActivate = getLeadersAvailableAtTurn(currentTurn);
    const newlyAvailable = [];
    if (leadersToActivate.length === 0) {
        return { characters, newlyAvailable };
    }
    const updatedCharacters = characters.map(c => {
        if (leadersToActivate.includes(c.id) && !c.isRecruitableLeader) {
            // Only activate if not already recruited (faction would be NOBLES) or dead
            // The character is in 'graveyard' with status DEAD initially
            newlyAvailable.push(c.id);
            return {
                ...c,
                isRecruitableLeader: true
            };
        }
        return c;
    });
    if (newlyAvailable.length > 0) {
        console.log(`[NOBLES RECRUITMENT] Turn ${currentTurn}: Leaders now available: ${newlyAvailable.join(', ')}`);
    }
    return { characters: updatedCharacters, newlyAvailable };
}
/**
 * Get all currently available Nobles recruitable leaders.
 * Filters by isRecruitableLeader flag (already activated and not yet recruited).
 */
function getAvailableNoblesRecruitableLeaders(characters, currentTurn) {
    return characters.filter(c => {
        // Must have the flag set to true
        if (!c.isRecruitableLeader)
            return false;
        // Must be in the Nobles recruitable list
        if (!exports.NOBLES_RECRUITABLE_LEADER_IDS.includes(c.id))
            return false;
        // Must be available at current turn (safety check)
        return isLeaderAvailableAtTurn(c.id, currentTurn);
    });
}
