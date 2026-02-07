"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI_PROFILES = void 0;
const types_1 = require("../../../shared/types");
exports.AI_PROFILES = {
    [types_1.FactionId.REPUBLICANS]: {
        name: types_1.FACTION_NAMES[types_1.FactionId.REPUBLICANS],
        aggressiveness: 0.3, // Lowered: They are weak initially
        defensiveness: 0.8, // Increased: Must hold Sunbreach
        subversiveness: 1.0, // Primary weapon
        expansionism: 0.8,
        riskTolerance: 0.7,
        preferredTargets: ['port_de_sable', 'northern_barony', 'esmarch_duchy', 'gullwing_duchy'],
        canUseGrainEmbargo: false,
        useFortifications: true,
    },
    [types_1.FactionId.CONSPIRATORS]: {
        name: types_1.FACTION_NAMES[types_1.FactionId.CONSPIRATORS],
        aggressiveness: 0.6, // Methodical: Aggressive when stable
        defensiveness: 0.7, // Still careful, but not passive turtles
        subversiveness: 0.6,
        expansionism: 0.6,
        riskTolerance: 0.5, // Calculated risks
        preferredTargets: ['sunbreach_lands', 'gullwing_duchy', 'thane_duchy'],
        canUseGrainEmbargo: true,
        useFortifications: true,
    },
    [types_1.FactionId.NOBLES]: {
        name: types_1.FACTION_NAMES[types_1.FactionId.NOBLES],
        aggressiveness: 0.9, // "Course contre la montre"
        defensiveness: 0.3, // Vulnerable rears
        subversiveness: 0.5, // INCREASED: Nobles use insurrections (Lys, Gullwing, Haraldic)
        expansionism: 0.4,
        riskTolerance: 0.6,
        preferredTargets: ['windward', 'great_plains', 'sunbreach_lands', 'hornvale_viscounty'],
        canUseGrainEmbargo: true,
        useFortifications: true,
    },
    [types_1.FactionId.NEUTRAL]: {
        name: types_1.FACTION_NAMES[types_1.FactionId.NEUTRAL],
        aggressiveness: 0,
        defensiveness: 1,
        subversiveness: 0,
        expansionism: 0,
        riskTolerance: 0,
        preferredTargets: [],
        canUseGrainEmbargo: false,
        useFortifications: false,
    },
    [types_1.FactionId.LOYALISTS]: { name: 'Loyalists', aggressiveness: 0, defensiveness: 0, subversiveness: 0, expansionism: 0, riskTolerance: 0, preferredTargets: [], canUseGrainEmbargo: false, useFortifications: false },
    [types_1.FactionId.PRINCELY_ARMY]: { name: 'Princely Army', aggressiveness: 0, defensiveness: 0, subversiveness: 0, expansionism: 0, riskTolerance: 0, preferredTargets: [], canUseGrainEmbargo: false, useFortifications: false },
    [types_1.FactionId.CONFEDERATE_CITIES]: { name: 'Confederate Cities', aggressiveness: 0, defensiveness: 0, subversiveness: 0, expansionism: 0, riskTolerance: 0, preferredTargets: [], canUseGrainEmbargo: false, useFortifications: false }
};
