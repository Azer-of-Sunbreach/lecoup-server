"use strict";
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
exports.FACTION_NAMES = exports.FACTION_COLORS = exports.LogType = exports.LogSeverity = exports.CharacterStatus = exports.RuralCategory = exports.LocationType = exports.RoadQuality = exports.FactionId = void 0;
__exportStar(require("./types/governorTypes"), exports);
var FactionId;
(function (FactionId) {
    FactionId["REPUBLICANS"] = "REPUBLICANS";
    FactionId["CONSPIRATORS"] = "CONSPIRATORS";
    FactionId["NOBLES"] = "NOBLES";
    FactionId["NEUTRAL"] = "NEUTRAL";
})(FactionId || (exports.FactionId = FactionId = {}));
var RoadQuality;
(function (RoadQuality) {
    RoadQuality["GOOD"] = "GOOD";
    RoadQuality["MEDIOCRE"] = "MEDIOCRE";
    RoadQuality["BAD"] = "BAD";
    RoadQuality["LOCAL"] = "LOCAL";
})(RoadQuality || (exports.RoadQuality = RoadQuality = {}));
var LocationType;
(function (LocationType) {
    LocationType["CITY"] = "CITY";
    LocationType["RURAL"] = "RURAL";
    LocationType["ROAD_STAGE"] = "ROAD_STAGE";
})(LocationType || (exports.LocationType = LocationType = {}));
var RuralCategory;
(function (RuralCategory) {
    RuralCategory["FERTILE"] = "FERTILE";
    RuralCategory["ORDINARY"] = "ORDINARY";
    RuralCategory["INHOSPITABLE"] = "INHOSPITABLE";
})(RuralCategory || (exports.RuralCategory = RuralCategory = {}));
var CharacterStatus;
(function (CharacterStatus) {
    CharacterStatus["AVAILABLE"] = "AVAILABLE";
    CharacterStatus["ON_MISSION"] = "ON_MISSION";
    CharacterStatus["MOVING"] = "MOVING";
    CharacterStatus["UNDERCOVER"] = "UNDERCOVER";
    CharacterStatus["GOVERNING"] = "GOVERNING";
    CharacterStatus["DEAD"] = "DEAD";
})(CharacterStatus || (exports.CharacterStatus = CharacterStatus = {}));
// --- STRUCTURED LOG SYSTEM ---
var LogSeverity;
(function (LogSeverity) {
    LogSeverity["INFO"] = "INFO";
    LogSeverity["WARNING"] = "WARNING";
    LogSeverity["CRITICAL"] = "CRITICAL";
    LogSeverity["GOOD"] = "GOOD";
})(LogSeverity || (exports.LogSeverity = LogSeverity = {}));
var LogType;
(function (LogType) {
    LogType["TURN_MARKER"] = "TURN_MARKER";
    LogType["GAME_START"] = "GAME_START";
    LogType["MOVEMENT"] = "MOVEMENT";
    LogType["CAPTURE"] = "CAPTURE";
    LogType["CONVOY"] = "CONVOY";
    LogType["INSURRECTION"] = "INSURRECTION";
    LogType["NEGOTIATION"] = "NEGOTIATION";
    LogType["FAMINE"] = "FAMINE";
    LogType["COMBAT"] = "COMBAT";
    LogType["ECONOMY"] = "ECONOMY";
    LogType["COMMERCE"] = "COMMERCE";
    LogType["LEADER"] = "LEADER";
    LogType["NARRATIVE"] = "NARRATIVE";
    LogType["CLANDESTINE"] = "CLANDESTINE";
})(LogType || (exports.LogType = LogType = {}));
// Re-export new leader types for easy access
__exportStar(require("./types/leaderTypes"), exports);
__exportStar(require("./types/governorTypes"), exports);
__exportStar(require("./types/clandestineTypes"), exports);
exports.FACTION_COLORS = {
    [FactionId.REPUBLICANS]: 'text-blue-400 bg-blue-900 border-blue-500',
    [FactionId.CONSPIRATORS]: 'text-amber-400 bg-amber-900 border-amber-500',
    [FactionId.NOBLES]: 'text-red-400 bg-red-900 border-red-500',
    [FactionId.NEUTRAL]: 'text-gray-400 bg-gray-800 border-gray-500',
};
exports.FACTION_NAMES = {
    [FactionId.REPUBLICANS]: 'Republicans',
    [FactionId.CONSPIRATORS]: 'Conspirators',
    [FactionId.NOBLES]: "Nobles' rights faction",
    [FactionId.NEUTRAL]: 'Neutral',
};
