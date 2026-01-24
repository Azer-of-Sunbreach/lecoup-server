/**
 * Leader State Manager
 *
 * Centralized state management for AI leader mutations.
 * All character state changes go through this manager to ensure consistency.
 *
 * @module shared/services/ai/leaders/core
 */
import { Character, Location, CharacterStatus, FactionId } from '../../../../types';
import { GovernorPolicy } from '../../../../types/governorTypes';
import { ActiveClandestineAction, ClandestineActionId } from '../../../../types/clandestineTypes';
/**
 * Manages all leader state mutations during AI processing.
 * Provides a clean API for state changes and tracks all modifications.
 */
export declare class LeaderStateManager {
    private characters;
    private locations;
    private modifiedCharacterIds;
    private modifiedLocationIds;
    constructor(characters: Character[], locations: Location[]);
    /**
     * Get a character by ID.
     */
    getCharacter(id: string): Character | undefined;
    /**
     * Get all characters for a faction.
     */
    getFactionCharacters(faction: FactionId): Character[];
    /**
     * Get all available leaders (AVAILABLE or UNDERCOVER status).
     */
    getAvailableLeaders(faction: FactionId): Character[];
    /**
     * Get undercover agents for a faction.
     */
    getUndercoverAgents(faction: FactionId): Character[];
    /**
     * Update a character with new data.
     * Used to sync results from external processors (e.g., travel).
     */
    updateCharacter(updated: Character): void;
    /**
     * Get a location by ID.
     */
    getLocation(id: string): Location | undefined;
    /**
     * Get all locations controlled by a faction.
     */
    getFactionLocations(faction: FactionId): Location[];
    /**
     * Get enemy locations (potential clandestine targets).
     */
    getEnemyLocations(faction: FactionId): Location[];
    /**
     * Normalize budget for a character.
     * Ensures clandestineBudget is set if budget exists.
     */
    normalizeBudget(characterId: string): void;
    /**
     * Get effective budget for a character.
     */
    getEffectiveBudget(characterId: string): number;
    /**
     * Set budget for a character.
     */
    setBudget(characterId: string, amount: number): void;
    /**
     * Deduct from budget.
     */
    deductBudget(characterId: string, amount: number): boolean;
    /**
     * Set character status.
     */
    setStatus(characterId: string, status: CharacterStatus): void;
    /**
     * Move character to a location.
     */
    moveToLocation(characterId: string, locationId: string): void;
    /**
     * Start moving character to a destination.
     */
    /**
     * Start moving character to a destination.
     */
    startMovement(characterId: string, destinationId: string, turns: number, turn?: number): void;
    /**
     * Assign character as governor with policies.
     */
    assignAsGovernor(characterId: string, locationId: string, policies: GovernorPolicy[]): void;
    /**
     * Update governor policies.
     */
    setGovernorPolicies(characterId: string, policies: GovernorPolicy[]): void;
    /**
     * Remove governor assignment.
     */
    removeGovernor(characterId: string): void;
    /**
     * Assign character as undercover agent.
     */
    assignAsAgent(characterId: string, locationId: string): void;
    /**
     * Set clandestine actions for an agent.
     */
    setClandestineActions(characterId: string, actions: ActiveClandestineAction[]): void;
    /**
     * Add a clandestine action to an agent.
     */
    addClandestineAction(characterId: string, actionId: ClandestineActionId, turn: number, goldAmount?: number, turnStartedOverride?: number | undefined): void;
    /**
     * Remove a clandestine action from an agent.
     */
    removeClandestineAction(characterId: string, actionId: ClandestineActionId): void;
    /**
     * Clear all clandestine actions (for exfiltration).
     */
    clearClandestineActions(characterId: string): void;
    /**
     * Exfiltrate an agent (return to friendly territory).
     */
    exfiltrateAgent(characterId: string, safeLocationId: string): void;
    /**
     * Assign character as commander of an army.
     */
    assignAsCommander(characterId: string, armyId: string): void;
    /**
     * Detach character from army command.
     */
    detachFromArmy(characterId: string): void;
    /**
     * Get all updated characters.
     */
    getUpdatedCharacters(): Character[];
    /**
     * Get all updated locations.
     */
    getUpdatedLocations(): Location[];
    /**
     * Get IDs of modified characters.
     */
    getModifiedCharacterIds(): string[];
    /**
     * Get IDs of modified locations.
     */
    getModifiedLocationIds(): string[];
}
