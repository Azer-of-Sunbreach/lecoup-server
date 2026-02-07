"use strict";
/**
 * Leaders Domain Services - Index
 */
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
exports.executeNoblesRecruitLeader = exports.isLeaderBlocked = exports.getDukeEsmarchDestination = exports.getSpecialLeaderEffectText = exports.hasSpecialEffect = exports.getNoblesRecruitmentDestination = exports.canRecruitNoblesLeader = exports.getDefaultNoblesRecruitmentLocation = exports.getBaronLekalLocation = exports.isLocationBasedRecruitment = exports.getRecruitableNoblesLeaders = exports.getLivingNoblesLeaders = exports.DUKE_ESMARCH_SOLDIERS = exports.BARON_YSTRIR_GOLD = exports.DUKE_GREAT_PLAINS_BUDGET = exports.DUKE_HORNVALE_BUDGET = exports.GEORGES_CADAL_BUDGET = exports.DUKE_HORNVALE_TERRITORIES = exports.GEORGES_CADAL_TERRITORIES = exports.SPECIAL_EFFECT_LEADERS = exports.NOBLES_LOCATION_LEADERS = exports.NOBLES_RECRUITABLE_ORDER = exports.NOBLES_FIEFDOM_PENALTY = exports.executeConspiratorRecruitLeader = exports.getConspiratorRecruitmentDestination = exports.getDefaultConspiratorRecruitmentLocation = exports.canRecruitConspiratorLeader = exports.getRecruitableConspiratorLeaders = exports.getLivingConspiratorLeaders = exports.CONSPIRATORS_RECRUITABLE_ORDER = exports.CONSPIRATORS_MAX_LEADERS = exports.CONSPIRATORS_RECRUITMENT_COST = void 0;
__exportStar(require("./leaderPathfinding"), exports);
__exportStar(require("./infiltrationRisk"), exports);
// Conspirators Recruitment - explicit exports to avoid conflicts with Nobles
var conspiratorsRecruitment_1 = require("./conspiratorsRecruitment");
Object.defineProperty(exports, "CONSPIRATORS_RECRUITMENT_COST", { enumerable: true, get: function () { return conspiratorsRecruitment_1.CONSPIRATORS_RECRUITMENT_COST; } });
Object.defineProperty(exports, "CONSPIRATORS_MAX_LEADERS", { enumerable: true, get: function () { return conspiratorsRecruitment_1.CONSPIRATORS_MAX_LEADERS; } });
Object.defineProperty(exports, "CONSPIRATORS_RECRUITABLE_ORDER", { enumerable: true, get: function () { return conspiratorsRecruitment_1.CONSPIRATORS_RECRUITABLE_ORDER; } });
Object.defineProperty(exports, "getLivingConspiratorLeaders", { enumerable: true, get: function () { return conspiratorsRecruitment_1.getLivingConspiratorLeaders; } });
Object.defineProperty(exports, "getRecruitableConspiratorLeaders", { enumerable: true, get: function () { return conspiratorsRecruitment_1.getRecruitableConspiratorLeaders; } });
Object.defineProperty(exports, "canRecruitConspiratorLeader", { enumerable: true, get: function () { return conspiratorsRecruitment_1.canRecruitLeader; } });
Object.defineProperty(exports, "getDefaultConspiratorRecruitmentLocation", { enumerable: true, get: function () { return conspiratorsRecruitment_1.getDefaultRecruitmentLocation; } });
Object.defineProperty(exports, "getConspiratorRecruitmentDestination", { enumerable: true, get: function () { return conspiratorsRecruitment_1.getRecruitmentDestination; } });
Object.defineProperty(exports, "executeConspiratorRecruitLeader", { enumerable: true, get: function () { return conspiratorsRecruitment_1.executeRecruitLeader; } });
// Nobles Recruitment - explicit exports to avoid conflicts with Conspirators
var noblesRecruitment_1 = require("./noblesRecruitment");
Object.defineProperty(exports, "NOBLES_FIEFDOM_PENALTY", { enumerable: true, get: function () { return noblesRecruitment_1.NOBLES_FIEFDOM_PENALTY; } });
Object.defineProperty(exports, "NOBLES_RECRUITABLE_ORDER", { enumerable: true, get: function () { return noblesRecruitment_1.NOBLES_RECRUITABLE_ORDER; } });
Object.defineProperty(exports, "NOBLES_LOCATION_LEADERS", { enumerable: true, get: function () { return noblesRecruitment_1.NOBLES_LOCATION_LEADERS; } });
Object.defineProperty(exports, "SPECIAL_EFFECT_LEADERS", { enumerable: true, get: function () { return noblesRecruitment_1.SPECIAL_EFFECT_LEADERS; } });
Object.defineProperty(exports, "GEORGES_CADAL_TERRITORIES", { enumerable: true, get: function () { return noblesRecruitment_1.GEORGES_CADAL_TERRITORIES; } });
Object.defineProperty(exports, "DUKE_HORNVALE_TERRITORIES", { enumerable: true, get: function () { return noblesRecruitment_1.DUKE_HORNVALE_TERRITORIES; } });
Object.defineProperty(exports, "GEORGES_CADAL_BUDGET", { enumerable: true, get: function () { return noblesRecruitment_1.GEORGES_CADAL_BUDGET; } });
Object.defineProperty(exports, "DUKE_HORNVALE_BUDGET", { enumerable: true, get: function () { return noblesRecruitment_1.DUKE_HORNVALE_BUDGET; } });
Object.defineProperty(exports, "DUKE_GREAT_PLAINS_BUDGET", { enumerable: true, get: function () { return noblesRecruitment_1.DUKE_GREAT_PLAINS_BUDGET; } });
Object.defineProperty(exports, "BARON_YSTRIR_GOLD", { enumerable: true, get: function () { return noblesRecruitment_1.BARON_YSTRIR_GOLD; } });
Object.defineProperty(exports, "DUKE_ESMARCH_SOLDIERS", { enumerable: true, get: function () { return noblesRecruitment_1.DUKE_ESMARCH_SOLDIERS; } });
Object.defineProperty(exports, "getLivingNoblesLeaders", { enumerable: true, get: function () { return noblesRecruitment_1.getLivingNoblesLeaders; } });
Object.defineProperty(exports, "getRecruitableNoblesLeaders", { enumerable: true, get: function () { return noblesRecruitment_1.getRecruitableNoblesLeaders; } });
Object.defineProperty(exports, "isLocationBasedRecruitment", { enumerable: true, get: function () { return noblesRecruitment_1.isLocationBasedRecruitment; } });
Object.defineProperty(exports, "getBaronLekalLocation", { enumerable: true, get: function () { return noblesRecruitment_1.getBaronLekalLocation; } });
Object.defineProperty(exports, "getDefaultNoblesRecruitmentLocation", { enumerable: true, get: function () { return noblesRecruitment_1.getDefaultRecruitmentLocation; } });
Object.defineProperty(exports, "canRecruitNoblesLeader", { enumerable: true, get: function () { return noblesRecruitment_1.canRecruitLeader; } });
Object.defineProperty(exports, "getNoblesRecruitmentDestination", { enumerable: true, get: function () { return noblesRecruitment_1.getRecruitmentDestination; } });
Object.defineProperty(exports, "hasSpecialEffect", { enumerable: true, get: function () { return noblesRecruitment_1.hasSpecialEffect; } });
Object.defineProperty(exports, "getSpecialLeaderEffectText", { enumerable: true, get: function () { return noblesRecruitment_1.getSpecialLeaderEffectText; } });
Object.defineProperty(exports, "getDukeEsmarchDestination", { enumerable: true, get: function () { return noblesRecruitment_1.getDukeEsmarchDestination; } });
Object.defineProperty(exports, "isLeaderBlocked", { enumerable: true, get: function () { return noblesRecruitment_1.isLeaderBlocked; } });
Object.defineProperty(exports, "executeNoblesRecruitLeader", { enumerable: true, get: function () { return noblesRecruitment_1.executeRecruitLeader; } });
// Nobles Leader Availability
__exportStar(require("./noblesLeaderAvailability"), exports);
