"use strict";
/**
 * Politics Domain Services - Barrel File
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeMoveLeader = exports.executeDetachLeader = exports.executeAttachLeader = exports.executeNegotiate = exports.executeIncite = void 0;
var insurrection_1 = require("./insurrection");
Object.defineProperty(exports, "executeIncite", { enumerable: true, get: function () { return insurrection_1.executeIncite; } });
var negotiation_1 = require("./negotiation");
Object.defineProperty(exports, "executeNegotiate", { enumerable: true, get: function () { return negotiation_1.executeNegotiate; } });
var leaders_1 = require("./leaders");
Object.defineProperty(exports, "executeAttachLeader", { enumerable: true, get: function () { return leaders_1.executeAttachLeader; } });
Object.defineProperty(exports, "executeDetachLeader", { enumerable: true, get: function () { return leaders_1.executeDetachLeader; } });
Object.defineProperty(exports, "executeMoveLeader", { enumerable: true, get: function () { return leaders_1.executeMoveLeader; } });
