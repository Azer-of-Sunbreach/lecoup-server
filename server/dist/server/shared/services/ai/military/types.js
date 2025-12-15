"use strict";
// AI Military Types - Interfaces for military operations
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIEGE_COST_TABLE = exports.IDLE_DEPLOYMENT_TARGETS = exports.STRATEGIC_LOCATIONS = void 0;
/**
 * Strategic locations configuration per faction
 */
exports.STRATEGIC_LOCATIONS = {
    'REPUBLICANS': ['sunbreach', 'sunbreach_lands'],
    'CONSPIRATORS': ['stormbay', 'order_lands', 'great_plains', 'windward'],
    'NOBLES': ['port_de_sable', 'northern_barony']
};
/**
 * Idle army strategic deployment targets per faction
 */
exports.IDLE_DEPLOYMENT_TARGETS = {
    'REPUBLICANS': ['sunbreach'],
    'CONSPIRATORS': ['stormbay', 'windward'],
    'NOBLES': ['port_de_sable']
};
/**
 * Siege cost table based on fortification level
 */
exports.SIEGE_COST_TABLE = {
    1: 15,
    2: 30,
    3: 50,
    4: 100
};
