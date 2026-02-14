"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateEconomyAndFood = void 0;
const MapRegistry_1 = require("../maps/MapRegistry");
const calculateEconomyAndFood = (state, locs, armies, chars, roads) => {
    // Determine which map we are on. If state has mapId use it, otherwise fallback to larion_alternate (legacy)
    const mapId = state.mapId || 'larion_alternate';
    const mapDef = MapRegistry_1.MapRegistry.get(mapId);
    // Delegate to map rules. If no rules defined (shouldn't happen with new architecture), return locs as is.
    if (mapDef && mapDef.rules) {
        return mapDef.rules.calculateEconomy(state, locs, armies, chars, roads);
    }
    console.warn(`No rules found for map ${mapId}, returning locations unmodified.`);
    return locs;
};
exports.calculateEconomyAndFood = calculateEconomyAndFood;
