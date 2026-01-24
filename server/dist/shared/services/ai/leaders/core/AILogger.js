"use strict";
/**
 * AI Decision Logger
 *
 * Provides structured logging for AI decisions to enable debugging
 * and understanding of AI behavior.
 *
 * @module shared/services/ai/leaders/core
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AILogger = void 0;
/**
 * Logger for AI leader decisions.
 * Collects logs during processing and returns them for display/storage.
 */
class AILogger {
    constructor(turn, faction, debugMode = false) {
        this.logs = [];
        this.turn = turn;
        this.faction = faction;
        this.debugMode = debugMode;
    }
    /**
     * Log a role assignment decision.
     */
    logRoleAssignment(leaderId, leaderName, role, targetLocation, reasoning) {
        const log = {
            turn: this.turn,
            faction: this.faction,
            leaderId,
            leaderName,
            action: `Assigned role: ${role}${targetLocation ? ` at ${targetLocation}` : ''}`,
            reasoning: reasoning || 'Best available role based on current situation'
        };
        this.logs.push(log);
        if (this.debugMode) {
            console.log(`[AI ${this.faction}] ${leaderName}: ${log.action} - ${log.reasoning}`);
        }
    }
    /**
     * Log a governor policy decision.
     */
    logGovernorAction(leaderId, leaderName, location, policies, reasoning) {
        const log = {
            turn: this.turn,
            faction: this.faction,
            leaderId,
            leaderName,
            action: `Governor at ${location}: ${policies.join(', ')}`,
            reasoning
        };
        this.logs.push(log);
        if (this.debugMode) {
            console.log(`[AI ${this.faction}] ${leaderName}: ${log.action}`);
        }
    }
    /**
     * Log a clandestine action decision.
     */
    logClandestineAction(leaderId, leaderName, location, actions, risk, reasoning) {
        const log = {
            turn: this.turn,
            faction: this.faction,
            leaderId,
            leaderName,
            action: `Agent at ${location} (${Math.round(risk * 100)}% risk): ${actions.join(', ')}`,
            reasoning
        };
        this.logs.push(log);
        if (this.debugMode) {
            console.log(`[AI ${this.faction}] ${leaderName}: ${log.action}`);
        }
    }
    /**
     * Log a movement decision.
     */
    logMovement(leaderId, leaderName, from, to, purpose) {
        const log = {
            turn: this.turn,
            faction: this.faction,
            leaderId,
            leaderName,
            action: `Moving from ${from} to ${to}`,
            reasoning: purpose
        };
        this.logs.push(log);
        if (this.debugMode) {
            console.log(`[AI ${this.faction}] ${leaderName}: Moving to ${to} - ${purpose}`);
        }
    }
    /**
     * Log a special event or decision.
     */
    logEvent(leaderId, leaderName, event, details) {
        const log = {
            turn: this.turn,
            faction: this.faction,
            leaderId,
            leaderName,
            action: event,
            reasoning: details || ''
        };
        this.logs.push(log);
        if (this.debugMode) {
            console.log(`[AI ${this.faction}] ${leaderName}: ${event}`);
        }
    }
    /**
     * Get all collected logs.
     */
    getLogs() {
        return [...this.logs];
    }
    /**
     * Get logs formatted as strings for console output.
     */
    getFormattedLogs() {
        return this.logs.map(log => `[T${log.turn}] ${log.leaderName}: ${log.action}${log.reasoning ? ` (${log.reasoning})` : ''}`);
    }
}
exports.AILogger = AILogger;
