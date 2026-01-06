"use strict";
// AI Economy Module Index - Public exports
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
exports.handleSeizeActions = exports.handleFortifications = exports.handleRecruitment = exports.manageLogistics = exports.handleGrainEmbargo = exports.optimizeRuralCollection = exports.optimizeCityTaxes = exports.calculateAvailableGold = exports.allocateSiegeBudget = exports.applyBalancedRecruitmentOverride = exports.applyWeakArmyOverride = exports.applyRepublicanEarlyGameOverride = void 0;
__exportStar(require("./types"), exports);
// Budget allocation
var budget_1 = require("./budget");
Object.defineProperty(exports, "applyRepublicanEarlyGameOverride", { enumerable: true, get: function () { return budget_1.applyRepublicanEarlyGameOverride; } });
Object.defineProperty(exports, "applyWeakArmyOverride", { enumerable: true, get: function () { return budget_1.applyWeakArmyOverride; } });
Object.defineProperty(exports, "applyBalancedRecruitmentOverride", { enumerable: true, get: function () { return budget_1.applyBalancedRecruitmentOverride; } });
Object.defineProperty(exports, "allocateSiegeBudget", { enumerable: true, get: function () { return budget_1.allocateSiegeBudget; } });
Object.defineProperty(exports, "calculateAvailableGold", { enumerable: true, get: function () { return budget_1.calculateAvailableGold; } });
// Tax optimization
var taxes_1 = require("./taxes");
Object.defineProperty(exports, "optimizeCityTaxes", { enumerable: true, get: function () { return taxes_1.optimizeCityTaxes; } });
Object.defineProperty(exports, "optimizeRuralCollection", { enumerable: true, get: function () { return taxes_1.optimizeRuralCollection; } });
// Grain embargo
var embargo_1 = require("./embargo");
Object.defineProperty(exports, "handleGrainEmbargo", { enumerable: true, get: function () { return embargo_1.handleGrainEmbargo; } });
// Logistics
var logistics_1 = require("./logistics");
Object.defineProperty(exports, "manageLogistics", { enumerable: true, get: function () { return logistics_1.manageLogistics; } });
// Recruitment
var recruitment_1 = require("./recruitment");
Object.defineProperty(exports, "handleRecruitment", { enumerable: true, get: function () { return recruitment_1.handleRecruitment; } });
// Fortifications
var fortifications_1 = require("./fortifications");
Object.defineProperty(exports, "handleFortifications", { enumerable: true, get: function () { return fortifications_1.handleFortifications; } });
// Emergency seize actions
var seize_1 = require("./seize");
Object.defineProperty(exports, "handleSeizeActions", { enumerable: true, get: function () { return seize_1.handleSeizeActions; } });
