"use strict";
/**
 * AI Strategy Module
 *
 * Shared AI strategic decision-making logic.
 *
 * @module shared/services/ai/strategy
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.allocateGarrison = exports.groupThreatsByPair = exports.analyzeGarrisonDeficits = exports.getCurrentGarrison = exports.getInsurrectionAlerts = exports.convertToAlerts = exports.detectInsurrectionThreats = void 0;
var insurrectionDefense_1 = require("./insurrectionDefense");
Object.defineProperty(exports, "detectInsurrectionThreats", { enumerable: true, get: function () { return insurrectionDefense_1.detectInsurrectionThreats; } });
Object.defineProperty(exports, "convertToAlerts", { enumerable: true, get: function () { return insurrectionDefense_1.convertToAlerts; } });
Object.defineProperty(exports, "getInsurrectionAlerts", { enumerable: true, get: function () { return insurrectionDefense_1.getInsurrectionAlerts; } });
Object.defineProperty(exports, "getCurrentGarrison", { enumerable: true, get: function () { return insurrectionDefense_1.getCurrentGarrison; } });
Object.defineProperty(exports, "analyzeGarrisonDeficits", { enumerable: true, get: function () { return insurrectionDefense_1.analyzeGarrisonDeficits; } });
Object.defineProperty(exports, "groupThreatsByPair", { enumerable: true, get: function () { return insurrectionDefense_1.groupThreatsByPair; } });
Object.defineProperty(exports, "allocateGarrison", { enumerable: true, get: function () { return insurrectionDefense_1.allocateGarrison; } });
