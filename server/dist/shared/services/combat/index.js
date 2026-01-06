"use strict";
// Combat Module Index - Public exports for combat resolution
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
exports.getPlayerBattles = exports.resolveAIBattleCascade = exports.handleSiege = exports.handleDefenderRetreatToCity = exports.handleAttackerRetreat = exports.resolveFight = exports.processLeaderSurvival = exports.getRetreatPosition = exports.calculateCombatStrength = exports.applySequentialLosses = void 0;
// Types
__exportStar(require("./types"), exports);
// Helpers
__exportStar(require("./helpers"), exports);
// Power Calculation
var powerCalculation_1 = require("./powerCalculation");
Object.defineProperty(exports, "applySequentialLosses", { enumerable: true, get: function () { return powerCalculation_1.applySequentialLosses; } });
Object.defineProperty(exports, "calculateCombatStrength", { enumerable: true, get: function () { return powerCalculation_1.calculateCombatStrength; } });
// Retreat Logic
var retreatLogic_1 = require("./retreatLogic");
Object.defineProperty(exports, "getRetreatPosition", { enumerable: true, get: function () { return retreatLogic_1.getRetreatPosition; } });
// Leader Survival
var leaderSurvival_1 = require("./leaderSurvival");
Object.defineProperty(exports, "processLeaderSurvival", { enumerable: true, get: function () { return leaderSurvival_1.processLeaderSurvival; } });
// Fight Resolution
var fightResolver_1 = require("./fightResolver");
Object.defineProperty(exports, "resolveFight", { enumerable: true, get: function () { return fightResolver_1.resolveFight; } });
// Retreat Handling
var retreatHandler_1 = require("./retreatHandler");
Object.defineProperty(exports, "handleAttackerRetreat", { enumerable: true, get: function () { return retreatHandler_1.handleAttackerRetreat; } });
Object.defineProperty(exports, "handleDefenderRetreatToCity", { enumerable: true, get: function () { return retreatHandler_1.handleDefenderRetreatToCity; } });
// Siege Handling
var siegeHandler_1 = require("./siegeHandler");
Object.defineProperty(exports, "handleSiege", { enumerable: true, get: function () { return siegeHandler_1.handleSiege; } });
// AI Battle Cascade
var aiBattleCascade_1 = require("./aiBattleCascade");
Object.defineProperty(exports, "resolveAIBattleCascade", { enumerable: true, get: function () { return aiBattleCascade_1.resolveAIBattleCascade; } });
Object.defineProperty(exports, "getPlayerBattles", { enumerable: true, get: function () { return aiBattleCascade_1.getPlayerBattles; } });
