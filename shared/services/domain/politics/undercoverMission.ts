/**
 * Undercover Mission Service - Domain logic for sending leaders on undercover missions
 * 
 * Handles:
 * - Leader status change to UNDERCOVER
 * - Travel time calculation using hybrid pathfinding
 * - Budget assignment
 * - Gold deduction from faction treasury
 * 
 * @module shared/services/domain/politics/undercoverMission
 */

import { GameState, Character, CharacterStatus, FactionId, Location, Road } from '../../../types';
import { calculateLeaderTravelTime } from '../leaders';

// ============================================================================
// TYPES
// ============================================================================

export interface SendUndercoverMissionResult {
    success: boolean;
    error?: string;
    newState?: Partial<GameState>;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Execute sending a leader on an undercover mission to enemy territory.
 * 
 * @param state - Current game state
 * @param targetLocationId - Enemy territory to infiltrate
 * @param leaderId - Leader to send
 * @param goldBudget - Gold to assign to leader's budget
 * @param playerFaction - Player's faction
 * @returns Result with success status and updated state
 */
export function executeSendUndercoverMission(
    state: GameState,
    targetLocationId: string,
    leaderId: string,
    goldBudget: number,
    playerFaction: FactionId
): SendUndercoverMissionResult {
    // Validate leader exists and belongs to player
    const leader = state.characters.find(c => c.id === leaderId);
    if (!leader) {
        return { success: false, error: 'Leader not found' };
    }
    if (leader.faction !== playerFaction) {
        return { success: false, error: 'Leader does not belong to your faction' };
    }
    if (leader.armyId) {
        return { success: false, error: 'Leader is attached to an army' };
    }
    if (leader.status !== CharacterStatus.AVAILABLE && leader.status !== CharacterStatus.UNDERCOVER && leader.status !== CharacterStatus.GOVERNING) {
        return { success: false, error: 'Leader is not available' };
    }

    // === EVOLUTION 6: One exfiltration per turn limit ===
    if (leader.lastExfiltrationTurn === state.turn) {
        return { success: false, error: 'Leader already moved this turn' };
    }

    // === EVOLUTION 6: Linked location detection preservation logic ===
    const originLocation = state.locations.find(l => l.id === leader.locationId);
    const isLinkedLocation = (
        originLocation?.linkedLocationId === targetLocationId ||
        state.locations.find(l => l.id === targetLocationId)?.linkedLocationId === leader.locationId
    );
    const sameController = originLocation?.faction === state.locations.find(l => l.id === targetLocationId)?.faction;
    const shouldPreserveDetection = isLinkedLocation && sameController;

    // Check if leader was governing - we'll need to clear policies on departure location
    const wasGoverning = leader.status === CharacterStatus.GOVERNING;
    const departureLocationId = leader.locationId;

    // Validate target location
    const targetLocation = state.locations.find(l => l.id === targetLocationId);
    if (!targetLocation) {
        return { success: false, error: 'Target location not found' };
    }
    if (targetLocation.faction === playerFaction) {
        return { success: false, error: 'Cannot send undercover mission to friendly territory' };
    }

    // Validate gold
    const playerGold = state.resources[playerFaction].gold;
    if (playerGold < goldBudget) {
        return { success: false, error: 'Not enough gold' };
    }
    if (goldBudget < 100 || goldBudget > 700) {
        return { success: false, error: 'Budget must be between 100 and 700 gold' };
    }

    // Calculate travel time
    const travelTime = calculateLeaderTravelTime(
        leader.locationId,
        targetLocationId,
        state.locations,
        state.roads
    );


    // === EVOLUTION 7: Agitational Networks Logic ===
    // Check if ability is active (include granted, exclude disabled by Internal Factions)
    const hasAgitationalNetworks = (
        leader.stats.ability.includes('AGITATIONAL_NETWORKS') ||
        leader.grantedAbilities?.includes('AGITATIONAL_NETWORKS')
    ) && !leader.disabledAbilities?.includes('AGITATIONAL_NETWORKS');
    const targetResentment = targetLocation.resentment?.[playerFaction] ?? 0;
    const agitationalBonus = (hasAgitationalNetworks && targetResentment < 60) ? 200 : 0;
    const finalBudget = goldBudget + agitationalBonus;

    // Update leader - set to MOVING during travel, clear any existing clandestine actions
    // Leader will become UNDERCOVER on arrival (handled in leaderPathfinding.ts)
    const updatedCharacters = state.characters.map(c => {
        if (c.id === leaderId) {
            const isInstantTravel = travelTime === 0;
            return {
                ...c,
                // Use MOVING status during travel, UNDERCOVER for instant arrival
                status: isInstantTravel ? CharacterStatus.UNDERCOVER : CharacterStatus.MOVING,
                // Set clandestineBudget (the actual budget used for actions)
                clandestineBudget: finalBudget,
                // Also set budget for display compatibility
                budget: finalBudget,
                // For instant travel, update locationId immediately
                locationId: isInstantTravel ? targetLocationId : c.locationId,
                // Set turnsUntilArrival for movement.ts display
                turnsUntilArrival: travelTime,
                destinationId: isInstantTravel ? null : targetLocationId,
                // Set undercoverMission for processUndercoverMissionTravel arrival logic
                // Only needed if there's actual travel time
                undercoverMission: isInstantTravel ? undefined : {
                    destinationId: targetLocationId,
                    turnsRemaining: travelTime,
                    turnStarted: state.turn
                },
                // Clear any existing clandestine actions when starting a new mission
                activeClandestineActions: undefined,
                // Clear governor mission if they were governing
                governorMission: undefined,
                // CORRECTIF 1 + EVOLUTION 6: Reset detection (unless linked-location same-controller)
                detectionLevel: shouldPreserveDetection ? c.detectionLevel : 0,
                pendingDetectionEffects: shouldPreserveDetection ? c.pendingDetectionEffects : undefined,
                // EVOLUTION 6: Track last exfiltration turn
                lastExfiltrationTurn: state.turn
            };
        }
        return c;
    });

    // Deduct gold from faction treasury
    const updatedResources = {
        ...state.resources,
        [playerFaction]: {
            ...state.resources[playerFaction],
            gold: playerGold - goldBudget
        }
    };

    // Clear governor policies on departure location if leader was governing
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
            characters: updatedCharacters,
            resources: updatedResources,
            locations: updatedLocations
        }
    };
}

/**
 * Process undercover mission travel each turn.
 * Should be called during turn processing.
 * 
 * @param characters - All characters
 * @returns Updated characters with travel progress
 */
export function processUndercoverMissionTravel(
    characters: Character[]
): Character[] {
    return characters.map(c => {
        if (c.status === CharacterStatus.UNDERCOVER && c.undercoverMission) {
            if (c.undercoverMission.turnsRemaining > 0) {
                // Still traveling
                return {
                    ...c,
                    undercoverMission: {
                        ...c.undercoverMission,
                        turnsRemaining: c.undercoverMission.turnsRemaining - 1
                    }
                };
            } else if (c.undercoverMission.turnsRemaining === 0 && c.locationId !== c.undercoverMission.destinationId) {
                // Arrived at destination - update location but STAY UNDERCOVER
                // Leader remains UNDERCOVER while in enemy territory for clandestine operations
                return {
                    ...c,
                    locationId: c.undercoverMission.destinationId,
                    // Keep status as UNDERCOVER - leader is now operating in enemy territory
                    // undercoverMission is cleared as travel is complete, but status stays UNDERCOVER
                    undercoverMission: undefined
                };
            }
        }
        return c;
    });
}
