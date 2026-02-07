"use strict";
/**
 * AI Leader Recruitment Module
 *
 * Exports all recruitment-related services for AI leader management.
 *
 * @module shared/services/ai/leaders/recruitment
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIN_LEADER_VALUE_FOR_CITY_FIEF = exports.RURAL_FIEF_FOOD_COST_PER_TURN = exports.CITY_FIEF_GOLD_COST_PER_TURN = exports.MIN_FOOD_SURPLUS_FOR_RURAL_FIEF = exports.getFactionRevenues = exports.canAffordRecruitment = exports.selectFiefLocation = exports.calculateFoodSurplus = exports.applyNoblesRecruitmentResults = exports.processAINoblesRecruitment = exports.ENABLE_RECRUITMENT_LOGS = exports.SEIZE_GOLD_MIN_STABILITY = exports.RECRUITMENT_TARGET = exports.findSeizeGoldTarget = exports.getRecruitmentFund = exports.consumeRecruitmentFund = exports.updateRecruitmentFund = exports.calculateSavingsForTurn = exports.calculateSavingsAmount = exports.processConspiratorRecruitmentTurn = exports.processAIRecruitment = exports.calculateRecruitmentBudgetReservation = void 0;
// CONSPIRATORS Recruitment
var AIConspiratorsRecruitment_1 = require("./AIConspiratorsRecruitment");
Object.defineProperty(exports, "calculateRecruitmentBudgetReservation", { enumerable: true, get: function () { return AIConspiratorsRecruitment_1.calculateRecruitmentBudgetReservation; } });
Object.defineProperty(exports, "processAIRecruitment", { enumerable: true, get: function () { return AIConspiratorsRecruitment_1.processAIRecruitment; } });
Object.defineProperty(exports, "processConspiratorRecruitmentTurn", { enumerable: true, get: function () { return AIConspiratorsRecruitment_1.processConspiratorRecruitmentTurn; } });
var RecruitmentFundManager_1 = require("./RecruitmentFundManager");
Object.defineProperty(exports, "calculateSavingsAmount", { enumerable: true, get: function () { return RecruitmentFundManager_1.calculateSavingsAmount; } });
Object.defineProperty(exports, "calculateSavingsForTurn", { enumerable: true, get: function () { return RecruitmentFundManager_1.calculateSavingsForTurn; } });
Object.defineProperty(exports, "updateRecruitmentFund", { enumerable: true, get: function () { return RecruitmentFundManager_1.updateRecruitmentFund; } });
Object.defineProperty(exports, "consumeRecruitmentFund", { enumerable: true, get: function () { return RecruitmentFundManager_1.consumeRecruitmentFund; } });
Object.defineProperty(exports, "getRecruitmentFund", { enumerable: true, get: function () { return RecruitmentFundManager_1.getRecruitmentFund; } });
Object.defineProperty(exports, "findSeizeGoldTarget", { enumerable: true, get: function () { return RecruitmentFundManager_1.findSeizeGoldTarget; } });
Object.defineProperty(exports, "RECRUITMENT_TARGET", { enumerable: true, get: function () { return RecruitmentFundManager_1.RECRUITMENT_TARGET; } });
Object.defineProperty(exports, "SEIZE_GOLD_MIN_STABILITY", { enumerable: true, get: function () { return RecruitmentFundManager_1.SEIZE_GOLD_MIN_STABILITY; } });
Object.defineProperty(exports, "ENABLE_RECRUITMENT_LOGS", { enumerable: true, get: function () { return RecruitmentFundManager_1.ENABLE_RECRUITMENT_LOGS; } });
// NOBLES Recruitment
var AINoblesRecruitment_1 = require("./AINoblesRecruitment");
Object.defineProperty(exports, "processAINoblesRecruitment", { enumerable: true, get: function () { return AINoblesRecruitment_1.processAINoblesRecruitment; } });
Object.defineProperty(exports, "applyNoblesRecruitmentResults", { enumerable: true, get: function () { return AINoblesRecruitment_1.applyNoblesRecruitmentResults; } });
var NoblesRecruitmentFiefManager_1 = require("./NoblesRecruitmentFiefManager");
Object.defineProperty(exports, "calculateFoodSurplus", { enumerable: true, get: function () { return NoblesRecruitmentFiefManager_1.calculateFoodSurplus; } });
Object.defineProperty(exports, "selectFiefLocation", { enumerable: true, get: function () { return NoblesRecruitmentFiefManager_1.selectFiefLocation; } });
Object.defineProperty(exports, "canAffordRecruitment", { enumerable: true, get: function () { return NoblesRecruitmentFiefManager_1.canAffordRecruitment; } });
Object.defineProperty(exports, "getFactionRevenues", { enumerable: true, get: function () { return NoblesRecruitmentFiefManager_1.getFactionRevenues; } });
Object.defineProperty(exports, "MIN_FOOD_SURPLUS_FOR_RURAL_FIEF", { enumerable: true, get: function () { return NoblesRecruitmentFiefManager_1.MIN_FOOD_SURPLUS_FOR_RURAL_FIEF; } });
Object.defineProperty(exports, "CITY_FIEF_GOLD_COST_PER_TURN", { enumerable: true, get: function () { return NoblesRecruitmentFiefManager_1.CITY_FIEF_GOLD_COST_PER_TURN; } });
Object.defineProperty(exports, "RURAL_FIEF_FOOD_COST_PER_TURN", { enumerable: true, get: function () { return NoblesRecruitmentFiefManager_1.RURAL_FIEF_FOOD_COST_PER_TURN; } });
Object.defineProperty(exports, "MIN_LEADER_VALUE_FOR_CITY_FIEF", { enumerable: true, get: function () { return NoblesRecruitmentFiefManager_1.MIN_LEADER_VALUE_FOR_CITY_FIEF; } });
