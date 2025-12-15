"use strict";
/**
 * Military Domain Services - Barrel File
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeMergeRegiments = exports.executeFortify = exports.executeSplitArmy = exports.executeArmyMove = exports.canMoveArmy = exports.executeRecruitment = exports.canRecruit = void 0;
var recruitment_1 = require("./recruitment");
Object.defineProperty(exports, "canRecruit", { enumerable: true, get: function () { return recruitment_1.canRecruit; } });
Object.defineProperty(exports, "executeRecruitment", { enumerable: true, get: function () { return recruitment_1.executeRecruitment; } });
var movement_1 = require("./movement");
Object.defineProperty(exports, "canMoveArmy", { enumerable: true, get: function () { return movement_1.canMoveArmy; } });
Object.defineProperty(exports, "executeArmyMove", { enumerable: true, get: function () { return movement_1.executeArmyMove; } });
Object.defineProperty(exports, "executeSplitArmy", { enumerable: true, get: function () { return movement_1.executeSplitArmy; } });
var fortification_1 = require("./fortification");
Object.defineProperty(exports, "executeFortify", { enumerable: true, get: function () { return fortification_1.executeFortify; } });
var mergeRegiments_1 = require("./mergeRegiments");
Object.defineProperty(exports, "executeMergeRegiments", { enumerable: true, get: function () { return mergeRegiments_1.executeMergeRegiments; } });
