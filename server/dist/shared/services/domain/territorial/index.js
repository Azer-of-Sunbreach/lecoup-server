"use strict";
/**
 * Territorial Domain Module
 *
 * Exports all territorial stats calculation functions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.canChangeFoodCollection = exports.canChangeTaxLevel = exports.calculateFactionRevenue = exports.getLocationLeaders = exports.calculateDefenseStats = exports.calculateCityFoodStats = exports.calculateRuralFoodStats = exports.calculateRevenueStats = exports.calculateTerritorialStats = void 0;
var territorialStats_1 = require("./territorialStats");
// Main calculation function
Object.defineProperty(exports, "calculateTerritorialStats", { enumerable: true, get: function () { return territorialStats_1.calculateTerritorialStats; } });
// Individual stats calculators
Object.defineProperty(exports, "calculateRevenueStats", { enumerable: true, get: function () { return territorialStats_1.calculateRevenueStats; } });
Object.defineProperty(exports, "calculateRuralFoodStats", { enumerable: true, get: function () { return territorialStats_1.calculateRuralFoodStats; } });
Object.defineProperty(exports, "calculateCityFoodStats", { enumerable: true, get: function () { return territorialStats_1.calculateCityFoodStats; } });
Object.defineProperty(exports, "calculateDefenseStats", { enumerable: true, get: function () { return territorialStats_1.calculateDefenseStats; } });
Object.defineProperty(exports, "getLocationLeaders", { enumerable: true, get: function () { return territorialStats_1.getLocationLeaders; } });
// Faction-level calculations
Object.defineProperty(exports, "calculateFactionRevenue", { enumerable: true, get: function () { return territorialStats_1.calculateFactionRevenue; } });
// UI helper functions
Object.defineProperty(exports, "canChangeTaxLevel", { enumerable: true, get: function () { return territorialStats_1.canChangeTaxLevel; } });
Object.defineProperty(exports, "canChangeFoodCollection", { enumerable: true, get: function () { return territorialStats_1.canChangeFoodCollection; } });
