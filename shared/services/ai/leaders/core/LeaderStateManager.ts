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
export class LeaderStateManager {
    private characters: Character[];
    private locations: Location[];
    private modifiedCharacterIds: Set<string> = new Set();
    private modifiedLocationIds: Set<string> = new Set();

    constructor(characters: Character[], locations: Location[]) {
        // Create deep copies to allow safe mutation
        this.characters = characters.map(c => ({ ...c }));
        this.locations = locations.map(l => ({ ...l }));
    }

    // =========================================================================
    // CHARACTER GETTERS
    // =========================================================================

    /**
     * Get a character by ID.
     */
    getCharacter(id: string): Character | undefined {
        return this.characters.find(c => c.id === id);
    }

    /**
     * Get all characters for a faction.
     */
    getFactionCharacters(faction: FactionId): Character[] {
        return this.characters.filter(c => c.faction === faction && !c.isDead);
    }

    /**
     * Get all available leaders (AVAILABLE or UNDERCOVER status).
     */
    getAvailableLeaders(faction: FactionId): Character[] {
        return this.characters.filter(c =>
            c.faction === faction &&
            !c.isDead &&
            (c.status === CharacterStatus.AVAILABLE ||
                c.status === CharacterStatus.UNDERCOVER ||
                c.status === CharacterStatus.GOVERNING)
        );
    }

    /**
     * Get undercover agents for a faction.
     */
    getUndercoverAgents(faction: FactionId): Character[] {
        return this.characters.filter(c =>
            c.faction === faction &&
            !c.isDead &&
            c.status === CharacterStatus.UNDERCOVER
        );
    }

    /**
     * Update a character with new data.
     * Used to sync results from external processors (e.g., travel).
     */
    updateCharacter(updated: Character): void {
        const index = this.characters.findIndex(c => c.id === updated.id);
        if (index !== -1) {
            this.characters[index] = { ...updated };
            this.modifiedCharacterIds.add(updated.id);
        }
    }

    // =========================================================================
    // LOCATION GETTERS
    // =========================================================================

    /**
     * Get a location by ID.
     */
    getLocation(id: string): Location | undefined {
        return this.locations.find(l => l.id === id);
    }

    /**
     * Get all locations controlled by a faction.
     */
    getFactionLocations(faction: FactionId): Location[] {
        return this.locations.filter(l => l.faction === faction);
    }

    /**
     * Get enemy locations (potential clandestine targets).
     */
    getEnemyLocations(faction: FactionId): Location[] {
        return this.locations.filter(l =>
            l.faction !== faction &&
            l.faction !== FactionId.NEUTRAL
        );
    }

    // =========================================================================
    // BUDGET MANAGEMENT
    // =========================================================================

    /**
     * Normalize budget for a character.
     * Ensures clandestineBudget is set if budget exists.
     */
    normalizeBudget(characterId: string): void {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1) return;

        const char = this.characters[idx];
        if (!char.clandestineBudget && char.budget) {
            this.characters[idx] = {
                ...char,
                clandestineBudget: char.budget
            };
            this.modifiedCharacterIds.add(characterId);
        }
    }

    /**
     * Get effective budget for a character.
     */
    getEffectiveBudget(characterId: string): number {
        const char = this.getCharacter(characterId);
        if (!char) return 0;
        return char.clandestineBudget ?? char.budget ?? 0;
    }

    /**
     * Set budget for a character.
     */
    setBudget(characterId: string, amount: number): void {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1) return;

        this.characters[idx] = {
            ...this.characters[idx],
            clandestineBudget: amount
        };
        this.modifiedCharacterIds.add(characterId);
    }

    /**
     * Deduct from budget.
     */
    deductBudget(characterId: string, amount: number): boolean {
        const current = this.getEffectiveBudget(characterId);
        if (current < amount) return false;

        this.setBudget(characterId, current - amount);
        return true;
    }

    // =========================================================================
    // STATUS MANAGEMENT
    // =========================================================================

    /**
     * Set character status.
     */
    setStatus(characterId: string, status: CharacterStatus): void {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1) return;

        this.characters[idx] = {
            ...this.characters[idx],
            status
        };
        this.modifiedCharacterIds.add(characterId);
    }

    /**
     * Move character to a location.
     */
    moveToLocation(characterId: string, locationId: string): void {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1) return;

        this.characters[idx] = {
            ...this.characters[idx],
            locationId,
            destinationId: null,
            turnsUntilArrival: 0
        };
        this.modifiedCharacterIds.add(characterId);
    }

    /**
     * Start moving character to a destination.
     */
    /**
     * Start moving character to a destination.
     */
    startMovement(characterId: string, destinationId: string, turns: number, turn?: number): void {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1) return;

        this.characters[idx] = {
            ...this.characters[idx],
            status: CharacterStatus.MOVING,
            destinationId,
            turnsUntilArrival: turns,
            undercoverMission: {
                destinationId,
                turnsRemaining: turns,
                turnStarted: turn
            }
        };
        this.modifiedCharacterIds.add(characterId);
    }

    // =========================================================================
    // GOVERNOR MANAGEMENT
    // =========================================================================

    /**
     * Assign character as governor with policies.
     */
    assignAsGovernor(characterId: string, locationId: string, policies: GovernorPolicy[]): void {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1) return;

        this.characters[idx] = {
            ...this.characters[idx],
            status: CharacterStatus.GOVERNING,
            locationId,
            activeGovernorPolicies: policies
        };
        this.modifiedCharacterIds.add(characterId);
    }

    /**
     * Update governor policies.
     */
    setGovernorPolicies(characterId: string, policies: GovernorPolicy[]): void {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1) return;

        this.characters[idx] = {
            ...this.characters[idx],
            activeGovernorPolicies: policies
        };
        this.modifiedCharacterIds.add(characterId);
    }

    /**
     * Remove governor assignment.
     */
    removeGovernor(characterId: string): void {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1) return;

        this.characters[idx] = {
            ...this.characters[idx],
            status: CharacterStatus.AVAILABLE,
            activeGovernorPolicies: []
        };
        this.modifiedCharacterIds.add(characterId);
    }

    // =========================================================================
    // CLANDESTINE MANAGEMENT
    // =========================================================================

    /**
     * Assign character as undercover agent.
     */
    assignAsAgent(characterId: string, locationId: string): void {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1) return;

        // Normalize budget first
        this.normalizeBudget(characterId);

        this.characters[idx] = {
            ...this.characters[idx],
            status: CharacterStatus.UNDERCOVER,
            locationId,
            activeClandestineActions: this.characters[idx].activeClandestineActions || []
        };
        this.modifiedCharacterIds.add(characterId);
    }

    /**
     * Set clandestine actions for an agent.
     */
    setClandestineActions(characterId: string, actions: ActiveClandestineAction[]): void {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1) return;

        this.characters[idx] = {
            ...this.characters[idx],
            activeClandestineActions: actions
        };
        this.modifiedCharacterIds.add(characterId);
    }

    /**
     * Add a clandestine action to an agent.
     */
    addClandestineAction(
        characterId: string,
        actionId: ClandestineActionId,
        turn: number,
        goldAmount?: number,
        turnStartedOverride?: number | undefined // Use undefined to trigger initialization logic
    ): void {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1) return;

        const current = this.characters[idx].activeClandestineActions || [];

        // Don't add duplicates
        if (current.some(a => a.actionId === actionId)) return;

        const newAction: ActiveClandestineAction = {
            actionId,
            turnStarted: turnStartedOverride !== undefined ? turnStartedOverride : turn,
            oneTimeGoldAmount: goldAmount
        };

        this.characters[idx] = {
            ...this.characters[idx],
            activeClandestineActions: [...current, newAction]
        };
        this.modifiedCharacterIds.add(characterId);
    }

    /**
     * Remove a clandestine action from an agent.
     */
    removeClandestineAction(characterId: string, actionId: ClandestineActionId): void {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1) return;

        const current = this.characters[idx].activeClandestineActions || [];

        this.characters[idx] = {
            ...this.characters[idx],
            activeClandestineActions: current.filter(a => a.actionId !== actionId)
        };
        this.modifiedCharacterIds.add(characterId);
    }

    /**
     * Clear all clandestine actions (for exfiltration).
     */
    clearClandestineActions(characterId: string): void {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1) return;

        this.characters[idx] = {
            ...this.characters[idx],
            activeClandestineActions: []
        };
        this.modifiedCharacterIds.add(characterId);
    }

    /**
     * Exfiltrate an agent (return to friendly territory).
     */
    exfiltrateAgent(characterId: string, safeLocationId: string): void {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1) return;

        this.clearClandestineActions(characterId);
        this.characters[idx] = {
            ...this.characters[idx],
            status: CharacterStatus.AVAILABLE,
            locationId: safeLocationId
        };
        this.modifiedCharacterIds.add(characterId);
    }

    // =========================================================================
    // COMMANDER MANAGEMENT
    // =========================================================================

    /**
     * Assign character as commander of an army.
     */
    assignAsCommander(characterId: string, armyId: string): void {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1) return;

        this.characters[idx] = {
            ...this.characters[idx],
            armyId
        };
        // Lint fix: assignedArmyId is not on Character type in this context, use armyId
        (this.characters[idx] as any).assignedArmyId = armyId;
        this.modifiedCharacterIds.add(characterId);
    }

    /**
     * Detach character from army command.
     */
    detachFromArmy(characterId: string): void {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1) return;

        this.characters[idx] = {
            ...this.characters[idx],
            armyId: null
        };
        // Lint fix: assignedArmyId is not on Character type in this context
        (this.characters[idx] as any).assignedArmyId = undefined;
        this.modifiedCharacterIds.add(characterId);
    }

    // =========================================================================
    // OUTPUT
    // =========================================================================

    /**
     * Get all updated characters.
     */
    getUpdatedCharacters(): Character[] {
        return this.characters;
    }

    /**
     * Get all updated locations.
     */
    getUpdatedLocations(): Location[] {
        return this.locations;
    }

    /**
     * Get IDs of modified characters.
     */
    getModifiedCharacterIds(): string[] {
        return Array.from(this.modifiedCharacterIds);
    }

    /**
     * Get IDs of modified locations.
     */
    getModifiedLocationIds(): string[] {
        return Array.from(this.modifiedLocationIds);
    }
}
