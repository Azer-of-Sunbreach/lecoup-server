/**
 * AI Decision Logger
 * 
 * Provides structured logging for AI decisions to enable debugging
 * and understanding of AI behavior.
 * 
 * @module shared/services/ai/leaders/core
 */

import { FactionId } from '../../../../types';
import { AIDecisionLog, AILeaderRole } from '../types';

/**
 * Logger for AI leader decisions.
 * Collects logs during processing and returns them for display/storage.
 */
export class AILogger {
    private logs: AIDecisionLog[] = [];
    private turn: number;
    private faction: FactionId;
    private debugMode: boolean;

    constructor(turn: number, faction: FactionId, debugMode: boolean = false) {
        this.turn = turn;
        this.faction = faction;
        this.debugMode = debugMode;
    }

    /**
     * Log a role assignment decision.
     */
    logRoleAssignment(
        leaderId: string,
        leaderName: string,
        role: AILeaderRole,
        targetLocation?: string,
        reasoning?: string
    ): void {
        const log: AIDecisionLog = {
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
    logGovernorAction(
        leaderId: string,
        leaderName: string,
        location: string,
        policies: string[],
        reasoning: string
    ): void {
        const log: AIDecisionLog = {
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
    logClandestineAction(
        leaderId: string,
        leaderName: string,
        location: string,
        actions: string[],
        risk: number,
        reasoning: string
    ): void {
        const log: AIDecisionLog = {
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
    logMovement(
        leaderId: string,
        leaderName: string,
        from: string,
        to: string,
        purpose: string
    ): void {
        const log: AIDecisionLog = {
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
    logEvent(
        leaderId: string,
        leaderName: string,
        event: string,
        details?: string
    ): void {
        const log: AIDecisionLog = {
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
    getLogs(): AIDecisionLog[] {
        return [...this.logs];
    }

    /**
     * Get logs formatted as strings for console output.
     */
    getFormattedLogs(): string[] {
        return this.logs.map(log =>
            `[T${log.turn}] ${log.leaderName}: ${log.action}${log.reasoning ? ` (${log.reasoning})` : ''}`
        );
    }
}
