"use strict";
// Shared Types - Used by both client and server
// These mirror the types in Application/types.ts but are standalone for the server
Object.defineProperty(exports, "__esModule", { value: true });
exports.FactionId = void 0;
var FactionId;
(function (FactionId) {
    FactionId["REPUBLICANS"] = "REPUBLICANS";
    FactionId["CONSPIRATORS"] = "CONSPIRATORS";
    FactionId["NOBLES"] = "NOBLES";
    FactionId["NEUTRAL"] = "NEUTRAL";
    // Valis Factions (Future support)
    FactionId["LOYALISTS"] = "LOYALISTS";
    FactionId["PRINCELY_ARMY"] = "PRINCELY_ARMY";
    FactionId["CONFEDERATE_CITIES"] = "CONFEDERATE_CITIES";
})(FactionId || (exports.FactionId = FactionId = {}));
