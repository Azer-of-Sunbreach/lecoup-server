"use strict";
// AI Strategy Types - Interfaces and constants for strategic operations
Object.defineProperty(exports, "__esModule", { value: true });
exports.INSURRECTION_PRIORITIES = exports.STRATEGIC_LOCATIONS = exports.VITAL_CITIES = void 0;
const types_1 = require("../../../../shared/types");
/**
 * Vital cities that require prioritized defense
 */
exports.VITAL_CITIES = ['sunbreach', 'windward', 'port_de_sable', 'stormbay', 'karamos', 'hornvale'];
/**
 * Strategic locations per faction - critical defensive points
 */
exports.STRATEGIC_LOCATIONS = {
    [types_1.FactionId.REPUBLICANS]: ['sunbreach', 'sunbreach_lands'],
    [types_1.FactionId.CONSPIRATORS]: ['stormbay', 'order_lands', 'great_plains', 'windward'],
    [types_1.FactionId.NOBLES]: ['port_de_sable', 'northern_barony'],
    [types_1.FactionId.NEUTRAL]: [],
    [types_1.FactionId.LOYALISTS]: [],
    [types_1.FactionId.PRINCELY_ARMY]: [],
    [types_1.FactionId.CONFEDERATE_CITIES]: []
};
/**
 * Faction-specific priority targets for insurrections
 */
exports.INSURRECTION_PRIORITIES = {
    [types_1.FactionId.NOBLES]: ['sunbreach_lands', 'hornvale_viscounty', 'sunbreach'],
    [types_1.FactionId.CONSPIRATORS]: ['sunbreach_lands', 'northern_barony', 'thane_duchy'],
    [types_1.FactionId.REPUBLICANS]: ['northern_barony', 'esmarch_duchy', 'larion_islands'],
    [types_1.FactionId.NEUTRAL]: [],
    [types_1.FactionId.LOYALISTS]: [],
    [types_1.FactionId.PRINCELY_ARMY]: [],
    [types_1.FactionId.CONFEDERATE_CITIES]: []
};
