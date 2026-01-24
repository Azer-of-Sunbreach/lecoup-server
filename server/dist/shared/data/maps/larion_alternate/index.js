"use strict";
/**
 * Larion Alternate Map Data - Shared
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LARION_ALTERNATE_ROADS = exports.LARION_ALTERNATE_GARRISONS = exports.LARION_ALTERNATE_LOCATIONS = void 0;
// Re-export locations and roads data
var locations_1 = require("./locations");
Object.defineProperty(exports, "LARION_ALTERNATE_LOCATIONS", { enumerable: true, get: function () { return locations_1.NEW_LOCATIONS; } });
Object.defineProperty(exports, "LARION_ALTERNATE_GARRISONS", { enumerable: true, get: function () { return locations_1.NEW_GARRISONS; } });
var roads_1 = require("./roads");
Object.defineProperty(exports, "LARION_ALTERNATE_ROADS", { enumerable: true, get: function () { return roads_1.NEW_ROADS; } });
