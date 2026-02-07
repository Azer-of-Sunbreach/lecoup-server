"use strict";
/**
 * Internal Factions Domain Service
 *
 * Handles the gameplay effects when a player chooses an internal faction.
 * Part of the Republican faction's unique mechanics.
 *
 * @see implementation_plan.md - Knightly Coup Column
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MERCHANT_DOMINATION_GOLD_COST = exports.RABBLE_MISSION_BUDGET = exports.KNIGHTLY_COUP_GOLD_COST = void 0;
exports.executeKnightlyCoupChoice = executeKnightlyCoupChoice;
exports.executeRabbleVictoryChoice = executeRabbleVictoryChoice;
exports.hasActiveAbility = hasActiveAbility;
exports.getActiveAbilities = getActiveAbilities;
exports.getEffectiveStabilityModifier = getEffectiveStabilityModifier;
exports.executeMerchantDominationChoice = executeMerchantDominationChoice;
const types_1 = require("../../../types");
const freeTrader_1 = require("../economy/freeTrader");
// Leader IDs affected by Knightly Coup
const KNIGHTLY_COUP_STABILITY_AFFECTED_LEADERS = ['argo', 'alia', 'lain', 'caelan', 'tordis'];
const KNIGHTLY_COUP_ABILITY_DISABLED_LEADER = 'argo';
const KNIGHTLY_COUP_RECRUITED_LEADER = 'castelreach';
/** Cost in gold to choose Knightly Coup faction. Exported for UI use. */
exports.KNIGHTLY_COUP_GOLD_COST = 250;
/**
 * Determines the best location for a newly recruited leader.
 * Priority: Sunbreach > Sunbreach Lands > Random player territory
 */
function findBestSpawnLocation(locations, playerFaction) {
    // Priority 1: Sunbreach
    const sunbreach = locations.find(loc => loc.id === 'sunbreach' && loc.faction === playerFaction);
    if (sunbreach)
        return sunbreach.id;
    // Priority 2: Sunbreach Lands
    const sunbreachLands = locations.find(loc => loc.id === 'sunbreach_lands' && loc.faction === playerFaction);
    if (sunbreachLands)
        return sunbreachLands.id;
    // Priority 3: Any player-controlled territory
    const playerTerritories = locations.filter(loc => loc.faction === playerFaction);
    if (playerTerritories.length > 0) {
        // Pick a random one for variety
        const randomIndex = Math.floor(Math.random() * playerTerritories.length);
        return playerTerritories[randomIndex].id;
    }
    return null;
}
/**
 * Execute the Knightly Coup internal faction choice.
 *
 * Effects:
 * 1. Argo loses AGITATIONAL_NETWORKS ability (disabled, not removed)
 * 2. Argo, Alia, Lain, Caelan, Tordis lose their -3% stability malus (set to 0)
 * 3. Sir Castelreach is recruited (DEAD→AVAILABLE, NEUTRAL→REPUBLICANS)
 * 4. Player pays KNIGHTLY_COUP_GOLD_COST gold
 *
 * @param characters - Current game characters
 * @param locations - Current game locations
 * @param playerFaction - Player's faction (should be REPUBLICANS)
 * @returns Result with updated characters and gold cost
 */
function executeKnightlyCoupChoice(characters, locations, playerFaction) {
    // Validation: Player must be Republicans
    if (playerFaction !== types_1.FactionId.REPUBLICANS) {
        return {
            success: false,
            error: 'Knightly Coup is only available to Republicans',
            updatedCharacters: characters,
            goldCost: 0
        };
    }
    // Validation: Player must have at least one territory
    const spawnLocation = findBestSpawnLocation(locations, playerFaction);
    if (!spawnLocation) {
        return {
            success: false,
            error: 'Player must control at least one territory',
            updatedCharacters: characters,
            goldCost: 0
        };
    }
    // Apply effects
    const updatedCharacters = characters.map(char => {
        // Effect 1: Disable AGITATIONAL_NETWORKS for Argo
        if (char.id === KNIGHTLY_COUP_ABILITY_DISABLED_LEADER) {
            const existingDisabled = char.disabledAbilities || [];
            return {
                ...char,
                disabledAbilities: [...existingDisabled, 'AGITATIONAL_NETWORKS'],
                // Also apply stability override for Argo (he's in the list)
                stabilityModifierOverride: 0
            };
        }
        // Effect 2: Remove stability malus for other affected leaders
        if (KNIGHTLY_COUP_STABILITY_AFFECTED_LEADERS.includes(char.id) && char.id !== KNIGHTLY_COUP_ABILITY_DISABLED_LEADER) {
            return {
                ...char,
                stabilityModifierOverride: 0
            };
        }
        // Effect 3: Recruit Sir Castelreach
        if (char.id === KNIGHTLY_COUP_RECRUITED_LEADER) {
            return {
                ...char,
                faction: types_1.FactionId.REPUBLICANS,
                status: types_1.CharacterStatus.AVAILABLE,
                locationId: spawnLocation,
                isRecruitableLeader: false
            };
        }
        return char;
    });
    return {
        success: true,
        updatedCharacters,
        goldCost: exports.KNIGHTLY_COUP_GOLD_COST
    };
}
// ============================================================================
// VICTORY OF THE RABBLE
// ============================================================================
// Leader IDs affected by Victory of the Rabble
const RABBLE_ABILITY_GRANTED_LEADERS = ['alia', 'lain', 'caelan', 'tordis'];
const RABBLE_STABILITY_AFFECTED_LEADERS = ['argo', 'alia', 'lain', 'caelan', 'tordis'];
const RABBLE_RECRUITED_LEADERS = ['jack_the_fox', 'richard_fayre'];
/** Budget in gold that recruited leaders arrive with for clandestine missions */
exports.RABBLE_MISSION_BUDGET = 400;
/**
 * Execute the Victory of the Rabble internal faction choice.
 *
 * Effects:
 * 1. Alia, Lain, Caelan, Tordis gain AGITATIONAL_NETWORKS ability
 * 2. Argo, Alia, Lain, Caelan, Tordis get stability malus set to -4%
 * 3. Jack the Fox & Richard Fayre are recruited (DEAD→AVAILABLE, NEUTRAL→REPUBLICANS)
 *
 * @param characters - Current game characters
 * @param locations - Current game locations
 * @param playerFaction - Player's faction (should be REPUBLICANS)
 * @returns Result with updated characters and recruited leader IDs
 */
function executeRabbleVictoryChoice(characters, locations, playerFaction) {
    // Validation: Player must be Republicans
    if (playerFaction !== types_1.FactionId.REPUBLICANS) {
        return {
            success: false,
            error: 'Victory of the Rabble is only available to Republicans',
            updatedCharacters: characters,
            recruitedLeaderIds: [],
            spawnLocationId: null
        };
    }
    // Validation: Player must have at least one territory
    const spawnLocation = findBestSpawnLocation(locations, playerFaction);
    if (!spawnLocation) {
        return {
            success: false,
            error: 'Player must control at least one territory',
            updatedCharacters: characters,
            recruitedLeaderIds: [],
            spawnLocationId: null
        };
    }
    // Apply effects
    const updatedCharacters = characters.map(char => {
        // Effect 1: Grant AGITATIONAL_NETWORKS to specific leaders
        if (RABBLE_ABILITY_GRANTED_LEADERS.includes(char.id)) {
            const existingGranted = char.grantedAbilities || [];
            return {
                ...char,
                grantedAbilities: [...existingGranted, 'AGITATIONAL_NETWORKS'],
                // Also apply stability override (-4%)
                stabilityModifierOverride: -4
            };
        }
        // Effect 2: Set stability malus to -4% for Argo (already has the ability)
        if (char.id === 'argo') {
            return {
                ...char,
                stabilityModifierOverride: -4
            };
        }
        // Effect 3: Recruit Jack the Fox & Richard Fayre
        if (RABBLE_RECRUITED_LEADERS.includes(char.id)) {
            return {
                ...char,
                faction: types_1.FactionId.REPUBLICANS,
                status: types_1.CharacterStatus.AVAILABLE,
                locationId: spawnLocation,
                isRecruitableLeader: false
            };
        }
        return char;
    });
    return {
        success: true,
        updatedCharacters,
        recruitedLeaderIds: RABBLE_RECRUITED_LEADERS,
        spawnLocationId: spawnLocation
    };
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Helper function to check if a character has an active ability.
 * Respects both disabledAbilities and grantedAbilities from Internal Factions effects.
 *
 * @param character - Character to check
 * @param ability - Ability to check for
 * @returns true if character has the ability (base or granted) and it's not disabled
 */
function hasActiveAbility(character, ability) {
    const hasBaseAbility = character.stats.ability.includes(ability);
    const hasGrantedAbility = character.grantedAbilities?.includes(ability) ?? false;
    const isDisabled = character.disabledAbilities?.includes(ability) ?? false;
    return (hasBaseAbility || hasGrantedAbility) && !isDisabled;
}
/**
 * Get all active abilities for a character.
 * Combines base abilities with granted abilities, excludes disabled ones.
 *
 * @param character - Character to get abilities for
 * @returns Array of active ability IDs
 */
function getActiveAbilities(character) {
    const baseAbilities = character.stats.ability.filter(a => a !== 'NONE');
    const grantedAbilities = character.grantedAbilities || [];
    // Combine unique abilities
    const allAbilities = [...new Set([...baseAbilities, ...grantedAbilities])];
    // Filter out disabled ones
    const disabledAbilities = character.disabledAbilities || [];
    return allAbilities.filter(a => !disabledAbilities.includes(a));
}
/**
 * Get the effective stability modifier for a character.
 * Uses stabilityModifierOverride if set, otherwise falls back to stats.stabilityPerTurn.
 *
 * @param character - Character to get stability for
 * @returns Effective stability modifier value
 */
function getEffectiveStabilityModifier(character) {
    return character.stabilityModifierOverride ?? character.stats.stabilityPerTurn;
}
// ============================================================================
// MERCHANT DOMINATION
// ============================================================================
// Leader IDs affected by Merchant Domination
const MERCHANT_TRAIT_GRANTED_LEADER = 'argo';
const MERCHANT_RECRUITED_LEADERS = ['gaiard', 'gildas', 'clavestone'];
/** Cost in gold to choose Merchant Domination faction */
exports.MERCHANT_DOMINATION_GOLD_COST = 250;
/**
 * Execute the Merchant Domination internal faction choice.
 *
 * Effects:
 * 1. Argo gains "Free-trader" trait
 * 2. Gaiard, Gildas, Clavestone are recruited (DEAD→AVAILABLE, NEUTRAL→REPUBLICANS)
 * 3. Player pays MERCHANT_DOMINATION_GOLD_COST gold
 *
 * @param characters - Current game characters
 * @param locations - Current game locations
 * @param playerFaction - Player's faction (should be REPUBLICANS)
 * @returns Result with updated characters
 */
function executeMerchantDominationChoice(characters, locations, playerFaction) {
    // Validation: Player must be Republicans
    if (playerFaction !== types_1.FactionId.REPUBLICANS) {
        return {
            success: false,
            error: 'Merchant Domination is only available to Republicans',
            updatedCharacters: characters,
            spawnLocationId: null
        };
    }
    // Validation: Player must have at least one territory
    const spawnLocation = findBestSpawnLocation(locations, playerFaction);
    if (!spawnLocation) {
        return {
            success: false,
            error: 'Player must control at least one territory',
            updatedCharacters: characters,
            spawnLocationId: null
        };
    }
    // Apply effects
    const updatedCharacters = characters.map(char => {
        // Effect 1: Grant Free-trader trait to Argo
        if (char.id === MERCHANT_TRAIT_GRANTED_LEADER) {
            const currentTraits = char.stats.traits || [];
            // Avoid duplicates
            if (currentTraits.includes('FREE_TRADER')) {
                return char;
            }
            return {
                ...char,
                stats: {
                    ...char.stats,
                    traits: [...currentTraits, 'FREE_TRADER']
                }
            };
        }
        // Effect 2: Recruit Gaiard, Gildas, Clavestone
        if (MERCHANT_RECRUITED_LEADERS.includes(char.id)) {
            return {
                ...char,
                faction: types_1.FactionId.REPUBLICANS,
                status: types_1.CharacterStatus.AVAILABLE,
                locationId: spawnLocation,
                isRecruitableLeader: false
            };
        }
        return char;
    });
    // Effect 3: Enforce Free Trader limits on relevant locations
    // We need to check:
    // 1. Where Argo is (he gained the trait)
    // 2. Where the new leaders spawned (they have the trait implicity via their stats, assuming they are Free Traders? 
    //    Actually, Gaiard/Gildas/Clavestone might be Free Traders. Let's assume they might be.
    //    Even if not, checking the spawn location is safe.
    // Find Argo's location
    const argo = updatedCharacters.find(c => c.id === MERCHANT_TRAIT_GRANTED_LEADER);
    const locationsToCheck = new Set();
    if (argo && argo.locationId) {
        locationsToCheck.add(argo.locationId);
    }
    if (spawnLocation) {
        locationsToCheck.add(spawnLocation);
    }
    let updatedLocations = [...locations];
    let locationsChanged = false;
    locationsToCheck.forEach(locId => {
        const locIndex = updatedLocations.findIndex(l => l.id === locId);
        if (locIndex !== -1) {
            const loc = updatedLocations[locIndex];
            const result = (0, freeTrader_1.enforceFreeTraderLimits)(loc, updatedCharacters);
            if (result.modified) {
                updatedLocations[locIndex] = result.location;
                locationsChanged = true;
            }
        }
    });
    return {
        success: true,
        updatedCharacters,
        updatedLocations: locationsChanged ? updatedLocations : undefined,
        spawnLocationId: spawnLocation
    };
}
