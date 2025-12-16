"use strict";
// AI Strategy Module Index - Public exports
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
exports.generateRoadDefenseMissions = exports.generateDiplomacyMissions = exports.generateCampaignMissions = exports.generateDefendMissions = exports.analyzeTheaters = void 0;
__exportStar(require("./types"), exports);
// Theater analysis
var theaters_1 = require("./theaters");
Object.defineProperty(exports, "analyzeTheaters", { enumerable: true, get: function () { return theaters_1.analyzeTheaters; } });
// Mission generators
var defenseMissions_1 = require("./defenseMissions");
Object.defineProperty(exports, "generateDefendMissions", { enumerable: true, get: function () { return defenseMissions_1.generateDefendMissions; } });
var campaignMissions_1 = require("./campaignMissions");
Object.defineProperty(exports, "generateCampaignMissions", { enumerable: true, get: function () { return campaignMissions_1.generateCampaignMissions; } });
var diplomacyMissions_1 = require("./diplomacyMissions");
Object.defineProperty(exports, "generateDiplomacyMissions", { enumerable: true, get: function () { return diplomacyMissions_1.generateDiplomacyMissions; } });
var roadDefense_1 = require("./roadDefense");
Object.defineProperty(exports, "generateRoadDefenseMissions", { enumerable: true, get: function () { return roadDefense_1.generateRoadDefenseMissions; } });
