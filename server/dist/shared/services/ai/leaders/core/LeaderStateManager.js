"use strict";
/**
 * Leader State Manager
 *
 * Centralized state management for AI leader mutations.
 * All character state changes go through this manager to ensure consistency.
 *
 * @module shared/services/ai/leaders/core
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderStateManager = void 0;
const types_1 = require("../../../../types");
/**
 * Manages all leader state mutations during AI processing.
 * Provides a clean API for state changes and tracks all modifications.
 */
class LeaderStateManager {
    constructor(characters, locations) {
        this.modifiedCharacterIds = new Set();
        this.modifiedLocationIds = new Set();
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
    getCharacter(id) {
        return this.characters.find(c => c.id === id);
    }
    /**
     * Get all characters for a faction.
     */
    getFactionCharacters(faction) {
        return this.characters.filter(c => c.faction === faction && !c.isDead);
    }
    /**
     * Get all available leaders (AVAILABLE or UNDERCOVER status).
     */
    getAvailableLeaders(faction) {
        return this.characters.filter(c => c.faction === faction &&
            !c.isDead &&
            (c.status === types_1.CharacterStatus.AVAILABLE ||
                c.status === types_1.CharacterStatus.UNDERCOVER ||
                c.status === types_1.CharacterStatus.GOVERNING));
    }
    /**
     * Get undercover agents for a faction.
     */
    getUndercoverAgents(faction) {
        return this.characters.filter(c => c.faction === faction &&
            !c.isDead &&
            c.status === types_1.CharacterStatus.UNDERCOVER);
    }
    /**
     * Update a character with new data.
     * Used to sync results from external processors (e.g., travel).
     */
    updateCharacter(updated) {
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
    getLocation(id) {
        return this.locations.find(l => l.id === id);
    }
    /**
     * Get all locations controlled by a faction.
     */
    getFactionLocations(faction) {
        return this.locations.filter(l => l.faction === faction);
    }
    /**
     * Get enemy locations (potential clandestine targets).
     */
    getEnemyLocations(faction) {
        return this.locations.filter(l => l.faction !== faction &&
            l.faction !== types_1.FactionId.NEUTRAL);
    }
    // =========================================================================
    // BUDGET MANAGEMENT
    // =========================================================================
    /**
     * Normalize budget for a character.
     * Ensures clandestineBudget is set if budget exists.
     */
    normalizeBudget(characterId) {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1)
            return;
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
    getEffectiveBudget(characterId) {
        const char = this.getCharacter(characterId);
        if (!char)
            return 0;
        return char.clandestineBudget ?? char.budget ?? 0;
    }
    /**
     * Set budget for a character.
     */
    setBudget(characterId, amount) {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1)
            return;
        this.characters[idx] = {
            ...this.characters[idx],
            clandestineBudget: amount
        };
        this.modifiedCharacterIds.add(characterId);
    }
    /**
     * Deduct from budget.
     */
    deductBudget(characterId, amount) {
        const current = this.getEffectiveBudget(characterId);
        if (current < amount)
            return false;
        this.setBudget(characterId, current - amount);
        return true;
    }
    // =========================================================================
    // STATUS MANAGEMENT
    // =========================================================================
    /**
     * Set character status.
     */
    setStatus(characterId, status) {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1)
            return;
        this.characters[idx] = {
            ...this.characters[idx],
            status
        };
        this.modifiedCharacterIds.add(characterId);
    }
    /**
     * Move character to a location.
     */
    moveToLocation(characterId, locationId) {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1)
            return;
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
    startMovement(characterId, destinationId, turns, turn) {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1)
            return;
        this.characters[idx] = {
            ...this.characters[idx],
            status: types_1.CharacterStatus.MOVING,
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
    assignAsGovernor(characterId, locationId, policies) {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1)
            return;
        this.characters[idx] = {
            ...this.characters[idx],
            status: types_1.CharacterStatus.GOVERNING,
            locationId,
            activeGovernorPolicies: policies
        };
        this.modifiedCharacterIds.add(characterId);
    }
    /**
     * Update governor policies.
     */
    setGovernorPolicies(characterId, policies) {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1)
            return;
        this.characters[idx] = {
            ...this.characters[idx],
            activeGovernorPolicies: policies
        };
        this.modifiedCharacterIds.add(characterId);
    }
    /**
     * Remove governor assignment.
     */
    removeGovernor(characterId) {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1)
            return;
        this.characters[idx] = {
            ...this.characters[idx],
            status: types_1.CharacterStatus.AVAILABLE,
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
    assignAsAgent(characterId, locationId) {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1)
            return;
        // Normalize budget first
        this.normalizeBudget(characterId);
        this.characters[idx] = {
            ...this.characters[idx],
            status: types_1.CharacterStatus.UNDERCOVER,
            locationId,
            activeClandestineActions: this.characters[idx].activeClandestineActions || []
        };
        this.modifiedCharacterIds.add(characterId);
    }
    /**
     * Set clandestine actions for an agent.
     */
    setClandestineActions(characterId, actions) {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1)
            return;
        this.characters[idx] = {
            ...this.characters[idx],
            activeClandestineActions: actions
        };
        this.modifiedCharacterIds.add(characterId);
    }
    /**
     * Add a clandestine action to an agent.
     */
    addClandestineAction(characterId, actionId, turn, goldAmount, turnStartedOverride // Use undefined to trigger initialization logic
    ) {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1)
            return;
        const current = this.characters[idx].activeClandestineActions || [];
        // Don't add duplicates
        if (current.some(a => a.actionId === actionId))
            return;
        const newAction = {
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
    removeClandestineAction(characterId, actionId) {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1)
            return;
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
    clearClandestineActions(characterId) {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1)
            return;
        this.characters[idx] = {
            ...this.characters[idx],
            activeClandestineActions: []
        };
        this.modifiedCharacterIds.add(characterId);
    }
    /**
     * Exfiltrate an agent (return to friendly territory).
     */
    exfiltrateAgent(characterId, safeLocationId) {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1)
            return;
        this.clearClandestineActions(characterId);
        this.characters[idx] = {
            ...this.characters[idx],
            status: types_1.CharacterStatus.AVAILABLE,
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
    assignAsCommander(characterId, armyId) {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1)
            return;
        this.characters[idx] = {
            ...this.characters[idx],
            armyId
        };
        // Lint fix: assignedArmyId is not on Character type in this context, use armyId
        this.characters[idx].assignedArmyId = armyId;
        this.modifiedCharacterIds.add(characterId);
    }
    /**
     * Detach character from army command.
     */
    detachFromArmy(characterId) {
        const idx = this.characters.findIndex(c => c.id === characterId);
        if (idx === -1)
            return;
        this.characters[idx] = {
            ...this.characters[idx],
            armyId: null
        };
        // Lint fix: assignedArmyId is not on Character type in this context
        this.characters[idx].assignedArmyId = undefined;
        this.modifiedCharacterIds.add(characterId);
    }
    // =========================================================================
    // OUTPUT
    // =========================================================================
    /**
     * Get all updated characters.
     */
    getUpdatedCharacters() {
        return this.characters;
    }
    /**
     * Get all updated locations.
     */
    getUpdatedLocations() {
        return this.locations;
    }
    /**
     * Get IDs of modified characters.
     */
    getModifiedCharacterIds() {
        return Array.from(this.modifiedCharacterIds);
    }
    /**
     * Get IDs of modified locations.
     */
    getModifiedLocationIds() {
        return Array.from(this.modifiedLocationIds);
    }
}
exports.LeaderStateManager = LeaderStateManager;
