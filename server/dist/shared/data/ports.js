"use strict";
/**
 * Port Data for All Maps
 * Centralized port configurations for naval travel times
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNavalTravelTimeUnified = exports.ALL_NAVAL_TIMES = exports.getNavalTravelTimeForMap = exports.getNavalTimesForMap = exports.getPortsForMap = exports.isPort = exports.ALL_PORTS = exports.LARION_ALTERNATE_NAVAL_TIMES = exports.LARION_ALTERNATE_PORTS = exports.LARION_LARGE_NAVAL_TIMES = exports.LARION_LARGE_PORTS = exports.LARION_NAVAL_TIMES = exports.LARION_PORTS = void 0;
// ===========================================
// LARION (Original Map) - 7 ports
// ===========================================
exports.LARION_PORTS = [
    'mirebridge',
    'gre_au_vent',
    'port_de_sable',
    'sunbreach',
    'brinewaith',
    'stormbay',
    'gullwing'
];
exports.LARION_NAVAL_TIMES = {
    mirebridge: {
        port_de_sable: 2,
        gre_au_vent: 2,
        sunbreach: 4,
        brinewaith: 5,
        stormbay: 6,
        gullwing: 8
    },
    port_de_sable: {
        sunbreach: 2,
        gre_au_vent: 2,
        brinewaith: 3,
        stormbay: 4,
        gullwing: 6
    },
    gre_au_vent: {
        sunbreach: 4,
        brinewaith: 5,
        stormbay: 6,
        gullwing: 8
    },
    sunbreach: {
        brinewaith: 2,
        stormbay: 2,
        gullwing: 4
    },
    brinewaith: {
        stormbay: 2,
        gullwing: 4
    },
    stormbay: {
        gullwing: 2
    }
};
// ===========================================
// LARION LARGE - 10 ports (includes Antrustion, Istryr City and Cathair)
// ===========================================
exports.LARION_LARGE_PORTS = [
    'mirebridge',
    'antrustion',
    'gre_au_vent',
    'port_de_sable',
    'sunbreach',
    'brinewaith',
    'stormbay',
    'istryr_city',
    'gullwing',
    'cathair'
];
exports.LARION_LARGE_NAVAL_TIMES = {
    mirebridge: {
        antrustion: 1,
        gre_au_vent: 2,
        port_de_sable: 2,
        sunbreach: 4,
        brinewaith: 5,
        stormbay: 6,
        istryr_city: 7,
        gullwing: 8,
        cathair: 9
    },
    antrustion: {
        gre_au_vent: 1,
        port_de_sable: 1,
        sunbreach: 3,
        brinewaith: 4,
        stormbay: 5,
        istryr_city: 6,
        gullwing: 7,
        cathair: 8
    },
    gre_au_vent: {
        port_de_sable: 2,
        sunbreach: 4,
        brinewaith: 5,
        stormbay: 6,
        istryr_city: 7,
        gullwing: 8,
        cathair: 9
    },
    port_de_sable: {
        sunbreach: 2,
        brinewaith: 3,
        stormbay: 4,
        istryr_city: 5,
        gullwing: 6,
        cathair: 7
    },
    sunbreach: {
        brinewaith: 2,
        stormbay: 2,
        istryr_city: 3,
        gullwing: 4,
        cathair: 5
    },
    brinewaith: {
        stormbay: 2,
        istryr_city: 3,
        gullwing: 4,
        cathair: 5
    },
    stormbay: {
        istryr_city: 1,
        gullwing: 2,
        cathair: 3
    },
    istryr_city: {
        gullwing: 1,
        cathair: 2
    },
    gullwing: {
        cathair: 1
    }
};
// ===========================================
// LARION ALTERNATE - 8 ports (includes Cathair)
// ===========================================
exports.LARION_ALTERNATE_PORTS = [
    'mirebridge',
    'gre_au_vent',
    'port_de_sable',
    'sunbreach',
    'brinewaith',
    'stormbay',
    'gullwing',
    'cathair'
];
exports.LARION_ALTERNATE_NAVAL_TIMES = {
    mirebridge: {
        gre_au_vent: 2,
        port_de_sable: 2,
        sunbreach: 4,
        brinewaith: 5,
        stormbay: 6,
        gullwing: 8,
        cathair: 10
    },
    gre_au_vent: {
        port_de_sable: 2,
        sunbreach: 4,
        brinewaith: 5,
        stormbay: 6,
        gullwing: 8,
        cathair: 10
    },
    port_de_sable: {
        sunbreach: 2,
        brinewaith: 3,
        stormbay: 4,
        gullwing: 6,
        cathair: 8
    },
    sunbreach: {
        brinewaith: 2,
        stormbay: 2,
        gullwing: 4,
        cathair: 6
    },
    brinewaith: {
        stormbay: 2,
        gullwing: 4,
        cathair: 6
    },
    stormbay: {
        gullwing: 2,
        cathair: 4
    },
    gullwing: {
        cathair: 2
    }
};
// ===========================================
// ALL_PORTS - Union of all ports from all maps
// Used for map-agnostic port detection
// ===========================================
exports.ALL_PORTS = new Set([
    ...exports.LARION_PORTS,
    ...exports.LARION_LARGE_PORTS,
    ...exports.LARION_ALTERNATE_PORTS
]);
/**
 * Check if a location is a port (works across all maps)
 */
const isPort = (locationId) => exports.ALL_PORTS.has(locationId);
exports.isPort = isPort;
const getPortsForMap = (mapId) => {
    switch (mapId) {
        case 'larion_large':
            return exports.LARION_LARGE_PORTS;
        case 'larion':
            return exports.LARION_PORTS;
        case 'larion_alternate':
        default:
            return exports.LARION_ALTERNATE_PORTS;
    }
};
exports.getPortsForMap = getPortsForMap;
const getNavalTimesForMap = (mapId) => {
    switch (mapId) {
        case 'larion_large':
            return exports.LARION_LARGE_NAVAL_TIMES;
        case 'larion':
            return exports.LARION_NAVAL_TIMES;
        case 'larion_alternate':
        default:
            return exports.LARION_ALTERNATE_NAVAL_TIMES;
    }
};
exports.getNavalTimesForMap = getNavalTimesForMap;
/**
 * Get naval travel time between two ports for a specific map
 * Handles symmetry (from-to and to-from are equivalent)
 */
const getNavalTravelTimeForMap = (mapId, from, to) => {
    if (from === to)
        return 0;
    const times = (0, exports.getNavalTimesForMap)(mapId);
    return times[from]?.[to] || times[to]?.[from] || 2;
};
exports.getNavalTravelTimeForMap = getNavalTravelTimeForMap;
// ===========================================
// ALL_NAVAL_TIMES - Merged naval times from all maps
// Used for map-agnostic travel time lookup
// ===========================================
const mergeNavalTimes = (...timesTables) => {
    const merged = {};
    for (const table of timesTables) {
        for (const [from, destinations] of Object.entries(table)) {
            if (!merged[from])
                merged[from] = {};
            for (const [to, time] of Object.entries(destinations)) {
                // Use the first non-undefined value (they should be consistent across maps)
                if (merged[from][to] === undefined) {
                    merged[from][to] = time;
                }
            }
        }
    }
    return merged;
};
exports.ALL_NAVAL_TIMES = mergeNavalTimes(exports.LARION_NAVAL_TIMES, exports.LARION_LARGE_NAVAL_TIMES, exports.LARION_ALTERNATE_NAVAL_TIMES);
/**
 * Get naval travel time between any two ports (works across all maps)
 * Handles symmetry (from-to and to-from are equivalent)
 * Falls back to default of 2 if route not found
 */
const getNavalTravelTimeUnified = (from, to) => {
    if (from === to)
        return 0;
    return exports.ALL_NAVAL_TIMES[from]?.[to] || exports.ALL_NAVAL_TIMES[to]?.[from] || 2;
};
exports.getNavalTravelTimeUnified = getNavalTravelTimeUnified;
