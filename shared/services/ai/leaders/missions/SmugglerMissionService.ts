/**
 * SmugglerMissionService - AI Decision Service for SMUGGLER Ability
 * 
 * This service handles the AI decision-making for SMUGGLER leaders when cities 
 * lose control of their rural food supply (linkedLocation). When this happens,
 * the service identifies available SMUGGLER leaders and dispatches them to 
 * provide emergency food supply (5-15 food/turn via smuggling networks).
 * 
 * Key mechanics:
 * - SMUGGLER mission is CUMULATIVE with GOVERNOR role
 * - Leader can govern a city AND provide smuggling bonus
 * - Mission continues until city falls or linkedLocation is recaptured
 * - Silent cancellation when city falls (no alert)
 * 
 * @module shared/services/ai/leaders/missions
 */

import { Character, CharacterStatus, FactionId, Location, LocationType, GameState } from '../../../../types';
import { calculateLeaderTravelTime } from '../../../domain/leaders/leaderPathfinding';

// ============================================================================
// TYPES
// ============================================================================

export interface SmugglerMissionContext {
    state: GameState;
    faction: FactionId;
    lostRuralLocationId: string;  // Rural area that was lost
    cityId: string;               // City now cut off from food supply
}

export interface SmugglerDispatchDecision {
    leaderId: string;
    leaderName: string;
    targetCityId: string;
    targetCityName: string;
    travelTime: number;
    reasoning: string;
}

export interface SmugglerCandidate {
    leader: Character;
    travelTime: number;
    isAlreadyAtCity: boolean;
    isGoverning: boolean;
    currentStability?: number;  // If at a location with stability concerns
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum travel time for SMUGGLER dispatch (user spec: 4 tours) */
const MAX_SMUGGLER_TRAVEL_TIME = 4;

/** Minimum stability threshold - don't pull SMUGGLER from unstable location */
const MIN_STABILITY_FOR_DISPATCH = 50;

/** Food stock + assumed seizure for famine timeline calculation */
const ASSUMED_INITIAL_SEIZURE = 50;

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Evaluate whether to dispatch a SMUGGLER to a city that lost its rural food supply.
 * 
 * Called when a faction loses control of a linkedLocation (rural area).
 * 
 * @param context - The game state and relevant location IDs
 * @returns A dispatch decision, or null if no action needed/possible
 */
export function evaluateSmugglerDispatch(
    context: SmugglerMissionContext
): SmugglerDispatchDecision | null {
    const { state, faction, lostRuralLocationId, cityId } = context;

    // Get the city and rural locations
    const city = state.locations.find(l => l.id === cityId);
    const lostRural = state.locations.find(l => l.id === lostRuralLocationId);

    if (!city || !lostRural) {
        console.log(`[SMUGGLER] Invalid locations: city=${cityId}, rural=${lostRuralLocationId}`);
        return null;
    }

    // Verify city is still controlled by our faction
    if (city.faction !== faction) {
        console.log(`[SMUGGLER] City ${city.name} not controlled by ${faction}`);
        return null;
    }

    // Check if city needs SMUGGLER support (famine risk)
    if (!cityNeedsSmugglerSupport(city)) {
        console.log(`[SMUGGLER] City ${city.name} has sufficient food reserves`);
        return null;
    }

    // Check if a SMUGGLER is already at the city
    const smugglerAlreadyPresent = state.characters.some(c =>
        c.faction === faction &&
        c.status !== CharacterStatus.DEAD &&
        c.locationId === cityId &&
        (c.stats?.ability?.includes('SMUGGLER') ?? false)
    );

    if (smugglerAlreadyPresent) {
        console.log(`[SMUGGLER] ${city.name} already has a SMUGGLER present`);
        return null;
    }

    // Find best SMUGGLER candidate
    const candidate = findBestSmugglerCandidate(context);

    if (!candidate) {
        console.log(`[SMUGGLER] No available SMUGGLER for ${city.name}`);
        return null;
    }

    // Calculate famine timeline
    const famineTimeline = calculateFamineTimeline(city);

    // Check if candidate can arrive before famine
    if (candidate.travelTime > famineTimeline) {
        console.log(`[SMUGGLER] ${candidate.leader.name} would arrive too late (${candidate.travelTime}t > famine in ${famineTimeline}t)`);
        return null;
    }

    console.log(`[SMUGGLER] Dispatching ${candidate.leader.name} to ${city.name} (${candidate.travelTime}t travel, famine in ${famineTimeline}t)`);

    return {
        leaderId: candidate.leader.id,
        leaderName: candidate.leader.name,
        targetCityId: city.id,
        targetCityName: city.name,
        travelTime: candidate.travelTime,
        reasoning: `SMUGGLER dispatch to ${city.name} - rural ${lostRural.name} lost, famine in ${famineTimeline} turns`
    };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a city needs SMUGGLER support based on food reserves.
 * 
 * Currently a simple check - could be enhanced to consider consumption rate.
 */
function cityNeedsSmugglerSupport(city: Location): boolean {
    // City needs support if it would face famine without its rural area
    // Basic check: just verify it's a city
    if (city.type !== LocationType.CITY) return false;

    // Could add more sophisticated checks here based on:
    // - Current garrison size
    // - Population
    // - Existing food stock
    // For now, assume all cities that lose rural supply need support
    return true;
}

/**
 * Find the best available SMUGGLER candidate for dispatch.
 * 
 * Selection criteria (from user specs):
 * 1. Must have SMUGGLER ability
 * 2. Must be AVAILABLE or GOVERNING (can do both)
 * 3. Travel time <= 4 turns
 * 4. NOT doing HUNT_NETWORKS (priority action)
 * 5. If has stability bonus AND current location < 50% stability, skip
 */
function findBestSmugglerCandidate(
    context: SmugglerMissionContext
): SmugglerCandidate | null {
    const { state, faction, cityId } = context;

    const candidates: SmugglerCandidate[] = [];

    for (const leader of state.characters) {
        // Must be our faction and alive
        if (leader.faction !== faction) continue;
        if (leader.status === CharacterStatus.DEAD) continue;

        // Must have SMUGGLER ability
        const hasSmugglerAbility = leader.stats?.ability?.includes('SMUGGLER') ?? false;
        if (!hasSmugglerAbility) continue;

        // Check status: AVAILABLE or GOVERNING (can still do SMUGGLER mission while governing)
        const validStatuses = [
            CharacterStatus.AVAILABLE,
            CharacterStatus.GOVERNING
        ];
        if (!validStatuses.includes(leader.status as CharacterStatus)) {
            // MOVING, UNDERCOVER, or ON_MISSION leaders are busy
            continue;
        }

        // Skip if doing HUNT_NETWORKS (governor policy)
        // We'd need to check if the leader is governing and has HUNT_NETWORKS active
        // For now, we'll skip this check as it requires more context

        // Check if leader has stability ability and is at an unstable location
        // Leaders with positive stabilityPerTurn bonus should stay at unstable locations
        const hasStabilityBonus = (leader.stats?.stabilityPerTurn ?? 0) > 0;

        if (hasStabilityBonus && leader.locationId) {
            const currentLoc = state.locations.find(l => l.id === leader.locationId);
            if (currentLoc && currentLoc.stability < MIN_STABILITY_FOR_DISPATCH) {
                console.log(`[SMUGGLER] Skip ${leader.name}: stabilizer at unstable ${currentLoc.name} (${currentLoc.stability}%)`);
                continue;
            }
        }

        // Calculate travel time
        const travelTime = calculateLeaderTravelTime(
            leader.locationId || '',
            cityId,
            state.locations,
            state.roads
        );

        // Skip if too far
        if (travelTime > MAX_SMUGGLER_TRAVEL_TIME) continue;

        const currentLoc = state.locations.find(l => l.id === leader.locationId);

        candidates.push({
            leader,
            travelTime,
            isAlreadyAtCity: leader.locationId === cityId,
            isGoverning: leader.status === CharacterStatus.GOVERNING,
            currentStability: currentLoc?.stability
        });
    }

    if (candidates.length === 0) return null;

    // Sort by priority:
    // 1. Already at the city (immediate effect)
    // 2. Shortest travel time
    // 3. Not governing (less disruption)
    candidates.sort((a, b) => {
        // Prefer already present
        if (a.isAlreadyAtCity !== b.isAlreadyAtCity) {
            return a.isAlreadyAtCity ? -1 : 1;
        }

        // Prefer shorter travel
        if (a.travelTime !== b.travelTime) {
            return a.travelTime - b.travelTime;
        }

        // Prefer non-governing (less disruption)
        if (a.isGoverning !== b.isGoverning) {
            return a.isGoverning ? 1 : -1;
        }

        return 0;
    });

    return candidates[0];
}

/**
 * Calculate turns until famine based on food stock.
 * 
 * Formula: (foodStock + ASSUMED_INITIAL_SEIZURE) / estimatedConsumption
 */
function calculateFamineTimeline(city: Location): number {
    // Get food stock (assume a getter exists or use a default)
    const foodStock = (city as any).foodStock ?? 50;

    // Estimate consumption (simplified - could use garrison size + population)
    // Larger cities consume more food per turn
    const baseConsumption = 20; // Base per turn
    const populationFactor = Math.max(1, (city.population || 100000) / 100000);
    const estimatedConsumption = baseConsumption * populationFactor;

    const totalFood = foodStock + ASSUMED_INITIAL_SEIZURE;
    const turnsUntilFamine = Math.floor(totalFood / estimatedConsumption);

    return Math.max(1, turnsUntilFamine); // At least 1 turn before famine
}

// ============================================================================
// SMUGGLER MISSION MANAGEMENT
// ============================================================================

/**
 * Check if a SMUGGLER mission should be cancelled.
 * 
 * Conditions for silent cancellation:
 * - City falls to enemy or neutral
 * - City's linkedLocation is recaptured by our faction
 */
export function shouldCancelSmugglerMission(
    leader: Character,
    state: GameState
): boolean {
    // Check if leader has an active smuggler mission
    const smugglerTargetCityId = (leader as any).smugglerTargetCityId;
    if (!smugglerTargetCityId) return false;

    const targetCity = state.locations.find(l => l.id === smugglerTargetCityId);
    if (!targetCity) return true; // City no longer exists

    // Cancel if city fell to enemy/neutral
    if (targetCity.faction !== leader.faction) {
        console.log(`[SMUGGLER] Cancel ${leader.name} mission: ${targetCity.name} fell to ${targetCity.faction}`);
        return true;
    }

    // Cancel if linkedLocation is recaptured
    const linkedRural = targetCity.linkedLocationId
        ? state.locations.find(l => l.id === targetCity.linkedLocationId)
        : null;

    if (linkedRural && linkedRural.faction === leader.faction) {
        console.log(`[SMUGGLER] Cancel ${leader.name} mission: ${linkedRural.name} recaptured`);
        return true;
    }

    return false;
}

/**
 * Mark a leader as being on a SMUGGLER mission.
 * This is cumulative with GOVERNOR role.
 */
export function assignSmugglerMission(
    leader: Character,
    targetCityId: string
): Character {
    return {
        ...leader,
        isSmugglerMission: true,
        smugglerTargetCityId: targetCityId
    } as Character & { isSmugglerMission: boolean; smugglerTargetCityId: string };
}

/**
 * Clear SMUGGLER mission from a leader.
 */
export function clearSmugglerMission(leader: Character): Character {
    const updated = { ...leader };
    delete (updated as any).isSmugglerMission;
    delete (updated as any).smugglerTargetCityId;
    return updated;
}
