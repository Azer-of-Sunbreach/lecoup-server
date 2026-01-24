/**
 * Leader AI Processor - Main Orchestrator
 *
 * Central processing unit for AI leader decisions.
 * Coordinates analysis, role assignment, and decision execution.
 *
 * @module shared/services/ai/leaders/core
 */
import { GameState, FactionId } from '../../../../types';
import { AILeaderProcessingResult } from '../types';
/**
 * Process AI decisions for all leaders of a faction.
 * Entry point for the AI leader system.
 */
export declare function processLeaderAI(state: GameState, faction: FactionId, turn: number, debugMode?: boolean): AILeaderProcessingResult;
