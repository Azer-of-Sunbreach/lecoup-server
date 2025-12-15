"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FACTION_NAMES = exports.FACTION_COLORS = exports.CharacterStatus = exports.RuralCategory = exports.LocationType = exports.RoadQuality = exports.FactionId = void 0;
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
    CharacterStatus["DEAD"] = "DEAD";
})(CharacterStatus || (exports.CharacterStatus = CharacterStatus = {}));
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
