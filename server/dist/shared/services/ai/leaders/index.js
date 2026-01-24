"use strict";
/**
 * AI Leader System - Module Entry Point
 *
 * Clean Hexagonal Architecture implementation for AI leader management.
 * Handles role assignment and decision-making for:
 * - Governors (territory policies)
 * - Clandestine Agents (undercover operations)
 * - Commanders (army leadership)
 * - Protectors (LEGENDARY insurrection blockers)
 * - Stabilizers (passive stability bonus)
 *
 * @module shared/services/ai/leaders
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processClandestineAgent = exports.generateUnifiedAssignments = exports.getRolePriority = exports.isLeaderVIP = exports.getLeaderProfile = exports.getLeaderProfiles = exports.shouldExfiltrate = exports.shouldGoDark = exports.getStrategyForFaction = exports.evaluateClandestineOpportunity = exports.makeClandestineDecisions = exports.analyzeTerritoryForGovernor = exports.makeGovernorDecisions = exports.AILogger = exports.LeaderStateManager = exports.processLeaderAI = void 0;
// Core exports
var LeaderAIProcessor_1 = require("./core/LeaderAIProcessor");
Object.defineProperty(exports, "processLeaderAI", { enumerable: true, get: function () { return LeaderAIProcessor_1.processLeaderAI; } });
var LeaderStateManager_1 = require("./core/LeaderStateManager");
Object.defineProperty(exports, "LeaderStateManager", { enumerable: true, get: function () { return LeaderStateManager_1.LeaderStateManager; } });
var AILogger_1 = require("./core/AILogger");
Object.defineProperty(exports, "AILogger", { enumerable: true, get: function () { return AILogger_1.AILogger; } });
// Type exports
__exportStar(require("./types"), exports);
// Role exports
var GovernorRole_1 = require("./roles/GovernorRole");
Object.defineProperty(exports, "makeGovernorDecisions", { enumerable: true, get: function () { return GovernorRole_1.makeGovernorDecisions; } });
Object.defineProperty(exports, "analyzeTerritoryForGovernor", { enumerable: true, get: function () { return GovernorRole_1.analyzeTerritoryForGovernor; } });
var ClandestineRole_1 = require("./roles/ClandestineRole");
Object.defineProperty(exports, "makeClandestineDecisions", { enumerable: true, get: function () { return ClandestineRole_1.makeClandestineDecisions; } });
Object.defineProperty(exports, "evaluateClandestineOpportunity", { enumerable: true, get: function () { return ClandestineRole_1.evaluateClandestineOpportunity; } });
// Strategy exports
var factionStrategy_1 = require("./strategies/factionStrategy");
Object.defineProperty(exports, "getStrategyForFaction", { enumerable: true, get: function () { return factionStrategy_1.getStrategyForFaction; } });
Object.defineProperty(exports, "shouldGoDark", { enumerable: true, get: function () { return factionStrategy_1.shouldGoDark; } });
Object.defineProperty(exports, "shouldExfiltrate", { enumerable: true, get: function () { return factionStrategy_1.shouldExfiltrate; } });
// Utility exports
var LeaderProfiles_1 = require("./utils/LeaderProfiles");
Object.defineProperty(exports, "getLeaderProfiles", { enumerable: true, get: function () { return LeaderProfiles_1.getLeaderProfiles; } });
Object.defineProperty(exports, "getLeaderProfile", { enumerable: true, get: function () { return LeaderProfiles_1.getLeaderProfile; } });
Object.defineProperty(exports, "isLeaderVIP", { enumerable: true, get: function () { return LeaderProfiles_1.isLeaderVIP; } });
Object.defineProperty(exports, "getRolePriority", { enumerable: true, get: function () { return LeaderProfiles_1.getRolePriority; } });
__exportStar(require("./utils/IPGCalculator"), exports);
__exportStar(require("./utils/AIRiskDecisionService"), exports);
// Unified Assignment System
var UnifiedAssignmentService_1 = require("./core/UnifiedAssignmentService");
Object.defineProperty(exports, "generateUnifiedAssignments", { enumerable: true, get: function () { return UnifiedAssignmentService_1.generateUnifiedAssignments; } });
// Clandestine Agent Processing (for UNDERCOVER agents)
var ClandestineAgentProcessor_1 = require("./core/ClandestineAgentProcessor");
Object.defineProperty(exports, "processClandestineAgent", { enumerable: true, get: function () { return ClandestineAgentProcessor_1.processClandestineAgent; } });
// ClandestineActionId and ActiveClandestineAction are exported from shared/types/clandestineTypes.ts
