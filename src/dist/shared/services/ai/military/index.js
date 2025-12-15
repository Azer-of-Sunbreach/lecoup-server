"use strict";
// AI Military Module Index - Public exports
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
exports.handleIdleArmies = exports.handleRoadDefense = exports.handleDefense = exports.handleCampaign = exports.pullReinforcements = exports.moveArmiesTo = exports.getMinGarrison = void 0;
__exportStar(require("./types"), exports);
// Garrison calculation
var garrison_1 = require("./garrison");
Object.defineProperty(exports, "getMinGarrison", { enumerable: true, get: function () { return garrison_1.getMinGarrison; } });
// Movement and reinforcement
var movement_1 = require("./movement");
Object.defineProperty(exports, "moveArmiesTo", { enumerable: true, get: function () { return movement_1.moveArmiesTo; } });
Object.defineProperty(exports, "pullReinforcements", { enumerable: true, get: function () { return movement_1.pullReinforcements; } });
// Mission handlers
var campaign_1 = require("./campaign");
Object.defineProperty(exports, "handleCampaign", { enumerable: true, get: function () { return campaign_1.handleCampaign; } });
var defense_1 = require("./defense");
Object.defineProperty(exports, "handleDefense", { enumerable: true, get: function () { return defense_1.handleDefense; } });
var roadDefense_1 = require("./roadDefense");
Object.defineProperty(exports, "handleRoadDefense", { enumerable: true, get: function () { return roadDefense_1.handleRoadDefense; } });
var idleHandler_1 = require("./idleHandler");
Object.defineProperty(exports, "handleIdleArmies", { enumerable: true, get: function () { return idleHandler_1.handleIdleArmies; } });
