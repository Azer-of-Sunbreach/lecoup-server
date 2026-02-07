/**
 * Siege Priority Module (Shared)
 * 
 * Detects and manages siege opportunities for AI factions.
 * When AI controls a rural area adjacent to an enemy fortified city,
 * this module prioritizes siege operations.
 * 
 * Rules:
 * - Level 1: Capture directly if forces > garrison + 500
 * - Level 2-3: Standard siege (500/1000 troops)
 * - Level 4 (Stormbay): Deprioritized unless wealthy
 * - Skip if garrison >= available troops * 2 (sortie risk)
 * 
 * @module shared/services/ai/military/siegePriority
 */

import { GameState, FactionId, Army, LocationType } from '../../../types';
import { FORTIFICATION_LEVELS } from '../../../data/gameConstants';

// Debug flag - can be enabled for detailed siege logs
const DEBUG_SIEGE = false;

// ============================================================================
// TYPES
// ============================================================================

export interface SiegeOpportunity {
    ruralId: string;
    cityId: string;
    cityName: string;
    fortificationLevel: number;
    requiredTroops: number;
    availableTroops: number;
    enemyGarrison: number;
    siegeCost: number;
    priority: 'HIGH' | 'NORMAL' | 'LOW';
    action: 'CAPTURE' | 'SIEGE' | 'RECRUIT_THEN_SIEGE' | 'SKIP';
}

// Siege costs per fortification level
const SIEGE_COST_TABLE: Record<number, number> = {
    1: 15,
    2: 30,
    3: 50,
    4: 100
};

// Troops required for siege per fortification level
const SIEGE_TROOPS_TABLE: Record<number, number> = {
    1: 500,
    2: 500,
    3: 1000,
    4: 2000
};

// ============================================================================
// CORE LOGIC
// ============================================================================

/**
 * Find all siege opportunities for a faction.
 * An opportunity exists when:
 * - Faction controls a rural area
 * - That rural area is linked to an enemy/neutral fortified city
 */
export function findSiegeOpportunities(
    state: GameState,
    faction: FactionId
): SiegeOpportunity[] {
    const opportunities: SiegeOpportunity[] = [];

    // Find all rural areas controlled by this faction
    const controlledRurals = state.locations.filter(loc =>
        loc.type === LocationType.RURAL &&
        loc.faction === faction
    );

    for (const rural of controlledRurals) {
        // Find the city linked to this rural area
        const linkedCity = state.locations.find(loc =>
            loc.type === LocationType.CITY &&
            loc.linkedLocationId === rural.id
        );

        if (!linkedCity) continue;

        // Check if city is enemy/neutral and fortified
        if (linkedCity.faction === faction) continue; // Already ours
        if (linkedCity.fortificationLevel === 0) continue; // No fortifications

        // Calculate available troops in the rural area
        const availableTroops = calculateAvailableTroops(state.armies, rural.id, faction);

        // Calculate enemy garrison in the city
        const enemyGarrison = calculateGarrison(state.armies, linkedCity.id, linkedCity.faction);

        const fortLevel = linkedCity.fortificationLevel;
        const requiredTroops = SIEGE_TROOPS_TABLE[fortLevel] || 500;
        const siegeCost = SIEGE_COST_TABLE[fortLevel] || 50;

        // Evaluate action
        const action = evaluateSiegeAction(
            fortLevel,
            availableTroops,
            enemyGarrison,
            requiredTroops,
            state,
            faction
        );

        // Determine priority
        let priority: 'HIGH' | 'NORMAL' | 'LOW' = 'NORMAL';
        if (fortLevel === 4) {
            priority = 'LOW'; // Stormbay deprioritized
        } else if (fortLevel === 1 && action === 'CAPTURE') {
            priority = 'HIGH'; // Easy capture
        }

        opportunities.push({
            ruralId: rural.id,
            cityId: linkedCity.id,
            cityName: linkedCity.name,
            fortificationLevel: fortLevel,
            requiredTroops,
            availableTroops,
            enemyGarrison,
            siegeCost,
            priority,
            action
        });
    }

    return opportunities;
}

/**
 * Select the best siege opportunity (one at a time).
 * Prioritizes by: priority (HIGH > NORMAL > LOW), then by action (SIEGE > CAPTURE > RECRUIT)
 */
export function selectBestSiegeOpportunity(
    opportunities: SiegeOpportunity[]
): SiegeOpportunity | null {
    // Filter out SKIPs
    const viable = opportunities.filter(o => o.action !== 'SKIP');

    if (viable.length === 0) return null;

    // Sort by priority
    const priorityOrder = { 'HIGH': 0, 'NORMAL': 1, 'LOW': 2 };
    const actionOrder = { 'CAPTURE': 0, 'SIEGE': 1, 'RECRUIT_THEN_SIEGE': 2, 'SKIP': 3 };

    viable.sort((a, b) => {
        const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (pDiff !== 0) return pDiff;
        return actionOrder[a.action] - actionOrder[b.action];
    });

    return viable[0];
}

/**
 * Find the best siege opportunity for a faction.
 * Convenience function combining find + select.
 */
export function findBestSiegeOpportunity(
    state: GameState,
    faction: FactionId
): SiegeOpportunity | null {
    const opportunities = findSiegeOpportunities(state, faction);
    return selectBestSiegeOpportunity(opportunities);
}

/**
 * Calculate budget to reserve for siege priority.
 * Returns total gold to reserve (siege cost + recruitment if needed).
 */
export function reserveSiegeBudget(opportunity: SiegeOpportunity): number {
    if (opportunity.action === 'SKIP') return 0;

    let budget = 0;

    // Siege cost
    if (opportunity.action === 'SIEGE' || opportunity.action === 'RECRUIT_THEN_SIEGE') {
        budget += opportunity.siegeCost;
    }

    // Recruitment cost if troops are insufficient
    if (opportunity.action === 'RECRUIT_THEN_SIEGE') {
        const deficit = opportunity.requiredTroops - opportunity.availableTroops;
        // 50 gold per 500 troops (1 regiment)
        const regimentsNeeded = Math.ceil(deficit / 500);
        budget += regimentsNeeded * 50;
    }

    // Cap at 150 gold (siege 50 + 2 regiments 100)
    return Math.min(budget, 150);
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calculate available troops in a location.
 * Available = not isSpent, not isFortifying, not isSieging, not isInsurgent, not in transit
 */
function calculateAvailableTroops(
    armies: Army[],
    locationId: string,
    faction: FactionId
): number {
    return armies
        .filter(a =>
            a.locationId === locationId &&
            a.faction === faction &&
            a.locationType === 'LOCATION' &&
            !a.isSpent &&
            a.action !== 'FORTIFY' &&
            !a.isSieging &&
            !a.isInsurgent &&
            (a.turnsUntilArrival === 0 || a.turnsUntilArrival === undefined)
        )
        .reduce((sum, a) => sum + a.strength, 0);
}

/**
 * Calculate garrison strength in a location.
 */
function calculateGarrison(
    armies: Army[],
    locationId: string,
    faction: FactionId
): number {
    return armies
        .filter(a =>
            a.locationId === locationId &&
            a.faction === faction &&
            a.locationType === 'LOCATION'
        )
        .reduce((sum, a) => sum + a.strength, 0);
}

/**
 * Evaluate what action to take for a siege opportunity.
 */
function evaluateSiegeAction(
    fortificationLevel: number,
    availableTroops: number,
    enemyGarrison: number,
    requiredTroops: number,
    state: GameState,
    faction: FactionId
): 'CAPTURE' | 'SIEGE' | 'RECRUIT_THEN_SIEGE' | 'SKIP' {
    // Rule: Sortie risk - if garrison >= troops * 2, skip
    if (enemyGarrison >= availableTroops * 2) {
        if (DEBUG_SIEGE) console.log(`[AI SIEGE PRIORITY ${faction}] SKIP: Sortie risk (garrison ${enemyGarrison} >= troops ${availableTroops} * 2)`);
        return 'SKIP';
    }

    // Rule: Stormbay (level 4) deprioritized unless wealthy
    if (fortificationLevel === 4) {
        if (!hasExcessResources(state, faction)) {
            if (DEBUG_SIEGE) console.log(`[AI SIEGE PRIORITY ${faction}] SKIP: Stormbay deprioritized (not wealthy)`);
            return 'SKIP';
        }
    }

    // Rule: Level 1 - capture directly if forces superior
    if (fortificationLevel === 1) {
        // Fortification bonus only applies if garrison >= 500
        const defenseBonus = enemyGarrison >= 500 ? FORTIFICATION_LEVELS[1].bonus : 0;
        const effectiveDefense = enemyGarrison + defenseBonus;

        if (availableTroops > effectiveDefense) {
            if (DEBUG_SIEGE) console.log(`[AI SIEGE PRIORITY ${faction}] CAPTURE: Level 1, troops ${availableTroops} > defense ${effectiveDefense}`);
            return 'CAPTURE';
        }
    }

    // Standard siege
    if (availableTroops >= requiredTroops) {
        if (DEBUG_SIEGE) console.log(`[AI SIEGE PRIORITY ${faction}] SIEGE: troops ${availableTroops} >= required ${requiredTroops}`);
        return 'SIEGE';
    }

    // Need to recruit first
    if (DEBUG_SIEGE) console.log(`[AI SIEGE PRIORITY ${faction}] RECRUIT_THEN_SIEGE: troops ${availableTroops} < required ${requiredTroops}`);
    return 'RECRUIT_THEN_SIEGE';
}

/**
 * Check if faction has excess resources for low-priority sieges (Stormbay).
 * Conditions:
 * - Gold > 400
 * - No active high-priority campaigns
 */
function hasExcessResources(state: GameState, faction: FactionId): boolean {
    const gold = state.resources[faction]?.gold || 0;
    if (gold < 400) return false;

    // Check for active campaigns in other theaters
    const missions = state.aiState?.[faction]?.missions || [];
    const activeCampaigns = missions.filter(m =>
        m.type === 'CAMPAIGN' &&
        m.status === 'ACTIVE' &&
        m.stage !== 'COMPLETED'
    );

    // If there are active campaigns, don't prioritize Stormbay
    if (activeCampaigns.length > 0) return false;

    return true;
}
