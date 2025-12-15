"use strict";
// Turn Processor Module Index - Public exports
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
exports.getPlayerBattles = exports.resolveAIBattles = exports.processNegotiations = exports.processStability = exports.applyLowTaxStabilityRecovery = exports.applyLeaderStabilityModifiers = exports.processFamine = exports.processNavalConvoys = exports.processConvoys = void 0;
__exportStar(require("./types"), exports);
// Logistics
var logistics_1 = require("./logistics");
Object.defineProperty(exports, "processConvoys", { enumerable: true, get: function () { return logistics_1.processConvoys; } });
Object.defineProperty(exports, "processNavalConvoys", { enumerable: true, get: function () { return logistics_1.processNavalConvoys; } });
// Famine
var famine_1 = require("./famine");
Object.defineProperty(exports, "processFamine", { enumerable: true, get: function () { return famine_1.processFamine; } });
// Stability
var stability_1 = require("./stability");
Object.defineProperty(exports, "applyLeaderStabilityModifiers", { enumerable: true, get: function () { return stability_1.applyLeaderStabilityModifiers; } });
Object.defineProperty(exports, "applyLowTaxStabilityRecovery", { enumerable: true, get: function () { return stability_1.applyLowTaxStabilityRecovery; } });
Object.defineProperty(exports, "processStability", { enumerable: true, get: function () { return stability_1.processStability; } });
// Negotiations
var negotiations_1 = require("./negotiations");
Object.defineProperty(exports, "processNegotiations", { enumerable: true, get: function () { return negotiations_1.processNegotiations; } });
// AI Battle Resolution
var aiBattleResolution_1 = require("./aiBattleResolution");
Object.defineProperty(exports, "resolveAIBattles", { enumerable: true, get: function () { return aiBattleResolution_1.resolveAIBattles; } });
Object.defineProperty(exports, "getPlayerBattles", { enumerable: true, get: function () { return aiBattleResolution_1.getPlayerBattles; } });
