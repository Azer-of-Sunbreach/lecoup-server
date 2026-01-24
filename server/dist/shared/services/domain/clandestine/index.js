"use strict";
/**
 * Clandestine Operations Module
 *
 * Exports all clandestine action processing functions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyDetectionLevelReset = exports.shouldResetDetectionLevel = exports.clearPendingDetectionEffects = exports.markEffectsNotified = exports.shouldEffectsApply = exports.getDetectionGaugeFill = exports.getDetectionGaugeColor = exports.applyTurnDetectionIncrease = exports.applyOneTimeDetectionIncrease = exports.calculateTurnDetectionIncrease = exports.isThresholdExceeded = exports.calculateCaptureRisk = exports.getBaseDetectionThreshold = exports.calculateDetectionThreshold = exports.createCombinedParanoidHuntEvent = exports.createParanoidGovernorEvent = exports.createThresholdExceededEvent = exports.createHuntNetworksEvent = exports.createInfiltrationEvent = exports.clearFactionPendingAlerts = exports.clearPendingAlerts = exports.addLeaderAlertEvent = exports.buildClandestineAlerts = exports.shouldDisableUndermineAuthorities = exports.processUndermineAuthorities = exports.processClandestineActions = void 0;
var clandestineProcessor_1 = require("./clandestineProcessor");
Object.defineProperty(exports, "processClandestineActions", { enumerable: true, get: function () { return clandestineProcessor_1.processClandestineActions; } });
var undermineAuthorities_1 = require("./undermineAuthorities");
Object.defineProperty(exports, "processUndermineAuthorities", { enumerable: true, get: function () { return undermineAuthorities_1.processUndermineAuthorities; } });
Object.defineProperty(exports, "shouldDisableUndermineAuthorities", { enumerable: true, get: function () { return undermineAuthorities_1.shouldDisableUndermineAuthorities; } });
// Alert Service
var clandestineAlertService_1 = require("./clandestineAlertService");
Object.defineProperty(exports, "buildClandestineAlerts", { enumerable: true, get: function () { return clandestineAlertService_1.buildClandestineAlerts; } });
Object.defineProperty(exports, "addLeaderAlertEvent", { enumerable: true, get: function () { return clandestineAlertService_1.addLeaderAlertEvent; } });
Object.defineProperty(exports, "clearPendingAlerts", { enumerable: true, get: function () { return clandestineAlertService_1.clearPendingAlerts; } });
Object.defineProperty(exports, "clearFactionPendingAlerts", { enumerable: true, get: function () { return clandestineAlertService_1.clearFactionPendingAlerts; } });
Object.defineProperty(exports, "createInfiltrationEvent", { enumerable: true, get: function () { return clandestineAlertService_1.createInfiltrationEvent; } });
Object.defineProperty(exports, "createHuntNetworksEvent", { enumerable: true, get: function () { return clandestineAlertService_1.createHuntNetworksEvent; } });
Object.defineProperty(exports, "createThresholdExceededEvent", { enumerable: true, get: function () { return clandestineAlertService_1.createThresholdExceededEvent; } });
Object.defineProperty(exports, "createParanoidGovernorEvent", { enumerable: true, get: function () { return clandestineAlertService_1.createParanoidGovernorEvent; } });
Object.defineProperty(exports, "createCombinedParanoidHuntEvent", { enumerable: true, get: function () { return clandestineAlertService_1.createCombinedParanoidHuntEvent; } });
// Detection Level Service (2026-01-10)
var detectionLevelService_1 = require("./detectionLevelService");
Object.defineProperty(exports, "calculateDetectionThreshold", { enumerable: true, get: function () { return detectionLevelService_1.calculateDetectionThreshold; } });
Object.defineProperty(exports, "getBaseDetectionThreshold", { enumerable: true, get: function () { return detectionLevelService_1.getBaseDetectionThreshold; } });
Object.defineProperty(exports, "calculateCaptureRisk", { enumerable: true, get: function () { return detectionLevelService_1.calculateCaptureRisk; } });
Object.defineProperty(exports, "isThresholdExceeded", { enumerable: true, get: function () { return detectionLevelService_1.isThresholdExceeded; } });
Object.defineProperty(exports, "calculateTurnDetectionIncrease", { enumerable: true, get: function () { return detectionLevelService_1.calculateTurnDetectionIncrease; } });
Object.defineProperty(exports, "applyOneTimeDetectionIncrease", { enumerable: true, get: function () { return detectionLevelService_1.applyOneTimeDetectionIncrease; } });
Object.defineProperty(exports, "applyTurnDetectionIncrease", { enumerable: true, get: function () { return detectionLevelService_1.applyTurnDetectionIncrease; } });
Object.defineProperty(exports, "getDetectionGaugeColor", { enumerable: true, get: function () { return detectionLevelService_1.getDetectionGaugeColor; } });
Object.defineProperty(exports, "getDetectionGaugeFill", { enumerable: true, get: function () { return detectionLevelService_1.getDetectionGaugeFill; } });
Object.defineProperty(exports, "shouldEffectsApply", { enumerable: true, get: function () { return detectionLevelService_1.shouldEffectsApply; } });
Object.defineProperty(exports, "markEffectsNotified", { enumerable: true, get: function () { return detectionLevelService_1.markEffectsNotified; } });
Object.defineProperty(exports, "clearPendingDetectionEffects", { enumerable: true, get: function () { return detectionLevelService_1.clearPendingDetectionEffects; } });
Object.defineProperty(exports, "shouldResetDetectionLevel", { enumerable: true, get: function () { return detectionLevelService_1.shouldResetDetectionLevel; } });
Object.defineProperty(exports, "applyDetectionLevelReset", { enumerable: true, get: function () { return detectionLevelService_1.applyDetectionLevelReset; } });
