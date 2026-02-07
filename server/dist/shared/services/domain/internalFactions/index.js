"use strict";
/**
 * Internal Factions Domain Module
 *
 * Exports domain logic for the Internal Factions recruitment system.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEffectiveStabilityModifier = exports.getActiveAbilities = exports.hasActiveAbility = exports.MERCHANT_DOMINATION_GOLD_COST = exports.executeMerchantDominationChoice = exports.RABBLE_MISSION_BUDGET = exports.executeRabbleVictoryChoice = exports.KNIGHTLY_COUP_GOLD_COST = exports.executeKnightlyCoupChoice = void 0;
var internalFactions_1 = require("./internalFactions");
// Knightly Coup
Object.defineProperty(exports, "executeKnightlyCoupChoice", { enumerable: true, get: function () { return internalFactions_1.executeKnightlyCoupChoice; } });
Object.defineProperty(exports, "KNIGHTLY_COUP_GOLD_COST", { enumerable: true, get: function () { return internalFactions_1.KNIGHTLY_COUP_GOLD_COST; } });
// Victory of the Rabble
Object.defineProperty(exports, "executeRabbleVictoryChoice", { enumerable: true, get: function () { return internalFactions_1.executeRabbleVictoryChoice; } });
Object.defineProperty(exports, "RABBLE_MISSION_BUDGET", { enumerable: true, get: function () { return internalFactions_1.RABBLE_MISSION_BUDGET; } });
// Merchant Domination
Object.defineProperty(exports, "executeMerchantDominationChoice", { enumerable: true, get: function () { return internalFactions_1.executeMerchantDominationChoice; } });
Object.defineProperty(exports, "MERCHANT_DOMINATION_GOLD_COST", { enumerable: true, get: function () { return internalFactions_1.MERCHANT_DOMINATION_GOLD_COST; } });
// Helper functions
Object.defineProperty(exports, "hasActiveAbility", { enumerable: true, get: function () { return internalFactions_1.hasActiveAbility; } });
Object.defineProperty(exports, "getActiveAbilities", { enumerable: true, get: function () { return internalFactions_1.getActiveAbilities; } });
Object.defineProperty(exports, "getEffectiveStabilityModifier", { enumerable: true, get: function () { return internalFactions_1.getEffectiveStabilityModifier; } });
