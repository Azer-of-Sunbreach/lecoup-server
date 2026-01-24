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
export declare class AILogger {
    private logs;
    private turn;
    private faction;
    private debugMode;
    constructor(turn: number, faction: FactionId, debugMode?: boolean);
    /**
     * Log a role assignment decision.
     */
    logRoleAssignment(leaderId: string, leaderName: string, role: AILeaderRole, targetLocation?: string, reasoning?: string): void;
    /**
     * Log a governor policy decision.
     */
    logGovernorAction(leaderId: string, leaderName: string, location: string, policies: string[], reasoning: string): void;
    /**
     * Log a clandestine action decision.
     */
    logClandestineAction(leaderId: string, leaderName: string, location: string, actions: string[], risk: number, reasoning: string): void;
    /**
     * Log a movement decision.
     */
    logMovement(leaderId: string, leaderName: string, from: string, to: string, purpose: string): void;
    /**
     * Log a special event or decision.
     */
    logEvent(leaderId: string, leaderName: string, event: string, details?: string): void;
    /**
     * Get all collected logs.
     */
    getLogs(): AIDecisionLog[];
    /**
     * Get logs formatted as strings for console output.
     */
    getFormattedLogs(): string[];
}
