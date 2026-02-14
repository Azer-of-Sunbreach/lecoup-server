/**
 * Update Leader Clandestine Actions - Domain service for updating a leader's active clandestine actions
 * 
 * Used when the player toggles actions in the ClandestineMenu.
 * Updates the Character.activeClandestineActions field.
 */

import { Character, ActiveClandestineAction, CharacterStatus } from '../../../types';

export interface UpdateClandestineActionsResult {
    success: boolean;
    characters?: Character[];
    error?: string;
}

/**
 * Update a leader's active clandestine actions.
 * 
 * @param characters All game characters
 * @param leaderId ID of the leader to update
 * @param activeActions New list of active clandestine actions
 * @returns Updated characters array
 */
export function executeUpdateLeaderClandestineActions(
    characters: Character[],
    leaderId: string,
    activeActions: ActiveClandestineAction[]
): UpdateClandestineActionsResult {
    const leaderIndex = characters.findIndex(c => c.id === leaderId);

    if (leaderIndex === -1) {
        return { success: false, error: 'Leader not found' };
    }

    const leader = characters[leaderIndex];

    // Check for Grand Insurrection to manage Status Locking immediately
    const hasGrandInsurrection = activeActions.some(a => a.actionId === 'PREPARE_GRAND_INSURRECTION');
    let newStatus = leader.status;

    if (hasGrandInsurrection) {
        newStatus = CharacterStatus.ON_MISSION;
    } else if (leader.status === CharacterStatus.ON_MISSION) {
        // If we are removing the insurrection (and were on mission), revert to safe state
        newStatus = CharacterStatus.UNDERCOVER;
    }

    // Update the leader
    const updatedCharacters = [...characters];
    updatedCharacters[leaderIndex] = {
        ...leader,
        status: newStatus,
        activeClandestineActions: activeActions.length > 0 ? activeActions : undefined
    };

    return {
        success: true,
        characters: updatedCharacters
    };
}
