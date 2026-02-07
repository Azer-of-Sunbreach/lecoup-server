/**
 * Siege Sortie Service
 * 
 * Detects when AI-controlled cities are under siege (enemy controls linked rural area)
 * and decides whether to sortie based on available troops + commander bonuses.
 * 
 * Logic:
 * 1. Detect cities where linked rural is controlled by enemy
 * 2. Calculate city garrison strength
 * 3. Calculate enemy strength in rural area
 * 4. Progressively attach commanders (with >0% bonus) until city forces > enemy
 * 5. If sufficient force achieved, merge regiments and prepare for attack
 * 
 * @module shared/services/ai/military/siegeSortie
 */

import { GameState, FactionId, Army, Character, Location, CharacterStatus } from '../../../types';

// ============================================================================
// TYPES
// ============================================================================

export interface SiegeBreakOpportunity {
    cityId: string;
    cityName: string;
    ruralId: string;
    ruralName: string;
    cityGarrison: number;
    enemyStrength: number;
    availableCommanders: CommanderCandidate[];
    requiredCommanders: CommanderCandidate[];
    effectiveStrength: number;
    canBreakSiege: boolean;
}

export interface CommanderCandidate {
    leaderId: string;
    leaderName: string;
    commandBonus: number; // Percentage (e.g., 15 for 15%)
    strengthContribution: number; // Actual soldiers added by this commander
}

export interface SortieResult {
    /** Updated armies with merge and movement orders */
    updatedArmies: Army[];
    /** Updated characters with commander assignments */
    updatedCharacters: Character[];
    /** Siege break opportunities processed */
    opportunities: SiegeBreakOpportunity[];
    /** Log messages */
    logs: string[];
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Process siege sortie opportunities for a faction.
 * 
 * @param state Current game state
 * @param faction Faction to process
 * @returns Updated armies, characters, and logs
 */
export function processSiegeSorties(
    state: GameState,
    faction: FactionId
): SortieResult {
    const logs: string[] = [];
    const updatedArmies = [...state.armies];
    const updatedCharacters = [...state.characters];
    const opportunities: SiegeBreakOpportunity[] = [];

    // Find all siege break opportunities
    const siegedCities = findSiegedCities(state, faction);

    for (const { city, rural } of siegedCities) {
        const opportunity = evaluateSortieOpportunity(
            city,
            rural,
            updatedArmies,
            updatedCharacters,
            faction,
            state
        );

        opportunities.push(opportunity);

        if (opportunity.canBreakSiege) {
            logs.push(`SORTIE at ${city.name}: ${opportunity.effectiveStrength} vs ${opportunity.enemyStrength} enemy`);

            // Execute the sortie
            executeSortie(
                opportunity,
                updatedArmies,
                updatedCharacters,
                faction,
                logs
            );
        } else {
            logs.push(`Cannot break siege at ${city.name}: ${opportunity.effectiveStrength} vs ${opportunity.enemyStrength} enemy (insufficient force)`);
        }
    }

    return {
        updatedArmies,
        updatedCharacters,
        opportunities,
        logs
    };
}

// ============================================================================
// DETECTION
// ============================================================================

/**
 * Find all cities that are being besieged (enemy controls linked rural).
 */
function findSiegedCities(
    state: GameState,
    faction: FactionId
): { city: Location; rural: Location }[] {
    const sieged: { city: Location; rural: Location }[] = [];

    for (const location of state.locations) {
        // Must be a city controlled by our faction
        if (location.type !== 'CITY') continue;
        if (location.faction !== faction) continue;

        // Must have a linked rural area
        if (!location.linkedLocationId) continue;

        const linkedRural = state.locations.find(l => l.id === location.linkedLocationId);
        if (!linkedRural) continue;

        // Rural must be controlled by enemy (not us, not neutral)
        if (linkedRural.faction === faction) continue;
        if (linkedRural.faction === FactionId.NEUTRAL) continue;

        // This city is under siege!
        sieged.push({ city: location, rural: linkedRural });
    }

    return sieged;
}

// ============================================================================
// EVALUATION
// ============================================================================

/**
 * Evaluate a sortie opportunity.
 * Calculates strength and determines which commanders to attach.
 */
function evaluateSortieOpportunity(
    city: Location,
    rural: Location,
    armies: Army[],
    characters: Character[],
    faction: FactionId,
    state: GameState
): SiegeBreakOpportunity {
    // Calculate city garrison strength
    const cityArmies = armies.filter(a =>
        a.locationId === city.id &&
        a.faction === faction &&
        a.locationType === 'LOCATION' &&
        !a.isSpent
    );
    const cityGarrison = cityArmies.reduce((sum, a) => sum + a.strength, 0);

    // Calculate enemy strength in rural area
    const enemyArmies = armies.filter(a =>
        a.locationId === rural.id &&
        a.faction !== faction &&
        a.locationType === 'LOCATION'
    );
    const enemyStrength = enemyArmies.reduce((sum, a) => sum + a.strength, 0);

    // Find available commanders in the city (those with >0% command bonus)
    const availableCommanders: CommanderCandidate[] = [];

    for (const character of characters) {
        // Must be our faction and alive
        if (character.faction !== faction) continue;
        if (character.status === CharacterStatus.DEAD) continue;

        // Must be in the city
        if (character.locationId !== city.id) continue;

        // Must have command bonus > 0
        const commandBonus = character.stats?.commandBonus || 0;
        if (commandBonus <= 0) continue;

        // Skip if already commanding an army (but we'll consider them anyway for sortie)
        // Actually, we SHOULD use them - they're in the city and available

        availableCommanders.push({
            leaderId: character.id,
            leaderName: character.name,
            commandBonus,
            strengthContribution: Math.floor(cityGarrison * (commandBonus / 100))
        });
    }

    // Sort commanders by command bonus (highest first)
    availableCommanders.sort((a, b) => b.commandBonus - a.commandBonus);

    // Determine which commanders are needed to break the siege
    const requiredCommanders: CommanderCandidate[] = [];
    let effectiveStrength = cityGarrison;

    for (const commander of availableCommanders) {
        if (effectiveStrength > enemyStrength) {
            // Already have enough strength, no more commanders needed
            break;
        }

        // Add this commander
        requiredCommanders.push(commander);
        effectiveStrength += commander.strengthContribution;
    }

    // Check if we can break the siege
    const canBreakSiege = effectiveStrength > enemyStrength;

    return {
        cityId: city.id,
        cityName: city.name,
        ruralId: rural.id,
        ruralName: rural.name,
        cityGarrison,
        enemyStrength,
        availableCommanders,
        requiredCommanders,
        effectiveStrength,
        canBreakSiege
    };
}

// ============================================================================
// EXECUTION
// ============================================================================

/**
 * Execute a sortie: attach commanders, merge regiments, order attack.
 */
function executeSortie(
    opportunity: SiegeBreakOpportunity,
    armies: Army[],
    characters: Character[],
    faction: FactionId,
    logs: string[]
): void {
    // 1. Attach required commanders to armies
    const cityArmies = armies.filter(a =>
        a.locationId === opportunity.cityId &&
        a.faction === faction &&
        a.locationType === 'LOCATION' &&
        !a.isSpent
    );

    if (cityArmies.length === 0) {
        logs.push(`  No armies to sortie with at ${opportunity.cityName}`);
        return;
    }

    // Find the largest army to be the main force
    cityArmies.sort((a, b) => b.strength - a.strength);
    const mainArmy = cityArmies[0];

    // Attach commanders to the main army
    for (const commander of opportunity.requiredCommanders) {
        const charIdx = characters.findIndex(c => c.id === commander.leaderId);
        if (charIdx === -1) continue;

        // Attach commander to main army
        characters[charIdx] = {
            ...characters[charIdx],
            armyId: mainArmy.id
        };
        // Also set assignedArmyId for AI tracking
        (characters[charIdx] as any).assignedArmyId = mainArmy.id;

        logs.push(`  Attached ${commander.leaderName} (+${commander.commandBonus}%) to sortie force`);
    }

    // 2. Merge all regiments in the city into the main army
    let totalMerged = 0;
    for (let i = 1; i < cityArmies.length; i++) {
        const armyToMerge = cityArmies[i];
        const mainIdx = armies.findIndex(a => a.id === mainArmy.id);
        const mergeIdx = armies.findIndex(a => a.id === armyToMerge.id);

        if (mainIdx !== -1 && mergeIdx !== -1) {
            // Add strength to main army
            armies[mainIdx] = {
                ...armies[mainIdx],
                strength: armies[mainIdx].strength + armyToMerge.strength
            };

            // Mark merged army as strength 0 (will be cleaned up later)
            armies[mergeIdx] = {
                ...armies[mergeIdx],
                strength: 0
            };

            totalMerged += armyToMerge.strength;
        }
    }

    if (totalMerged > 0) {
        logs.push(`  Merged ${totalMerged} troops into main sortie force`);
    }

    // 3. Order the main army to attack the rural area
    const mainIdx = armies.findIndex(a => a.id === mainArmy.id);
    if (mainIdx !== -1) {
        // Find the road connecting city to rural
        // For linked locations, movement is instant (no road needed)
        armies[mainIdx] = {
            ...armies[mainIdx],
            destinationId: opportunity.ruralId,
            // For sortie, we move directly to the linked location
            // The combat resolution will happen when turns are processed
            isGarrisoned: false
        };

        const finalStrength = armies[mainIdx].strength;
        logs.push(`  Sortie ordered: ${finalStrength} troops attacking ${opportunity.ruralName}`);
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { findSiegedCities, evaluateSortieOpportunity };
