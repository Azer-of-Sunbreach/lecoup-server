/**
 * Siege Execution Module (Shared)
 * 
 * Executes siege operations identified by siegePriority.ts.
 * This bridges the gap between siege opportunity detection and actual execution.
 * 
 * Used by both solo (Application) and multiplayer (server) modes.
 * 
 * @module shared/services/ai/military/siegeExecution
 */

import { GameState, FactionId, Army, Location } from '../../../types';
import { SiegeOpportunity } from './siegePriority';
import { FORTIFICATION_LEVELS } from '../../../data/gameConstants';

// ============================================================================
// TYPES
// ============================================================================

export interface SiegeExecutionResult {
    executed: boolean;
    goldSpent: number;
    updatedLocations: Location[];
    updatedArmies: Army[];
    updatedResources: { [key in FactionId]?: { gold: number } };
    siegeNotification?: {
        targetId: string;
        targetName: string;
        attackerName: FactionId;
    } | null;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Execute a siege from a SiegeOpportunity.
 * 
 * This function:
 * 1. Deducts gold from the faction
 * 2. Reduces the city's fortification level by 1
 * 3. Marks participating armies as isSieging
 * 4. Creates a siege notification if the target belongs to the player
 * 
 * @param state - Current game state
 * @param faction - Faction executing the siege
 * @param opportunity - The siege opportunity to execute
 * @returns Execution result with updated state elements
 */
export function executeSiegeFromOpportunity(
    state: GameState,
    faction: FactionId,
    opportunity: SiegeOpportunity
): SiegeExecutionResult {
    const result: SiegeExecutionResult = {
        executed: false,
        goldSpent: 0,
        updatedLocations: [...state.locations],
        updatedArmies: [...state.armies],
        updatedResources: { ...state.resources }
    };

    // Only execute actual SIEGE actions (not CAPTURE, RECRUIT_THEN_SIEGE, or SKIP)
    if (opportunity.action !== 'SIEGE') {
        return result;
    }

    // Verify we have enough gold
    const currentGold = state.resources[faction]?.gold || 0;
    if (currentGold < opportunity.siegeCost) {
        console.log(`[AI SIEGE EXEC ${faction}] FAILED: Insufficient gold (${currentGold}/${opportunity.siegeCost})`);
        return result;
    }

    // Verify we have enough troops at the rural location
    const armiesAtRural = state.armies.filter(a =>
        a.locationId === opportunity.ruralId &&
        a.faction === faction &&
        a.locationType === 'LOCATION' &&
        !a.isSpent &&
        !a.isSieging
    );
    const troopsAtRural = armiesAtRural.reduce((sum, a) => sum + a.strength, 0);

    if (troopsAtRural < opportunity.requiredTroops) {
        console.log(`[AI SIEGE EXEC ${faction}] FAILED: Insufficient troops at ${opportunity.ruralId} (${troopsAtRural}/${opportunity.requiredTroops})`);
        return result;
    }

    // Find the target city
    const cityIndex = result.updatedLocations.findIndex(l => l.id === opportunity.cityId);
    if (cityIndex === -1) {
        console.log(`[AI SIEGE EXEC ${faction}] FAILED: City ${opportunity.cityId} not found`);
        return result;
    }

    const city = result.updatedLocations[cityIndex];

    // 1. Deduct gold
    result.updatedResources[faction] = {
        ...result.updatedResources[faction],
        gold: currentGold - opportunity.siegeCost
    };
    result.goldSpent = opportunity.siegeCost;

    // 2. Reduce fortification level
    const newFortLevel = Math.max(0, city.fortificationLevel - 1);
    const newDefense = FORTIFICATION_LEVELS[newFortLevel]?.bonus || 0;

    result.updatedLocations[cityIndex] = {
        ...city,
        fortificationLevel: newFortLevel,
        defense: newDefense,
        hasBeenSiegedThisTurn: true
    };

    // 3. Mark some armies as sieging (up to requiredTroops)
    let troopsAssigned = 0;
    for (const army of armiesAtRural) {
        if (troopsAssigned >= opportunity.requiredTroops) break;

        const armyIndex = result.updatedArmies.findIndex(a => a.id === army.id);
        if (armyIndex !== -1) {
            // If army is larger than needed, we don't split - just mark it
            result.updatedArmies[armyIndex] = {
                ...result.updatedArmies[armyIndex],
                isSieging: true,
                isSpent: true
            };
            troopsAssigned += army.strength;
        }
    }

    // 4. Create notification if target is player's
    if (city.faction === state.playerFaction) {
        result.siegeNotification = {
            targetId: city.id,
            targetName: city.name,
            attackerName: faction
        };
    }

    result.executed = true;
    console.log(`[AI SIEGE EXEC ${faction}] SUCCESS: Sieged ${city.name} (Fort ${city.fortificationLevel} -> ${newFortLevel}), Cost: ${opportunity.siegeCost}g`);

    return result;
}
