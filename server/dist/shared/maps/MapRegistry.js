"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapRegistry = void 0;
const larion_1 = require("./definitions/larion");
const valis_1 = require("./definitions/valis");
const REGISTRY = {
    'larion': larion_1.LarionDefinition,
    'larion_alternate': larion_1.LarionAlternateDefinition,
    'valis': valis_1.ValisDefinition
};
exports.MapRegistry = {
    get: (id) => {
        return REGISTRY[id] || larion_1.LarionAlternateDefinition;
    },
    getAll: () => {
        return Object.values(REGISTRY);
    },
    // Helper to get available maps for UI
    getAvailableMaps: () => {
        // Return valid maps. Can filter out 'larion' if we want to hide deprecated ones later.
        return [
            { id: 'larion_alternate', nameKey: 'maps.larion_alternate' },
            { id: 'valis', nameKey: 'maps.valis' }
        ];
    }
};
