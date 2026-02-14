/**
 * Port Data for All Maps
 * Centralized port configurations for naval travel times
 */

// ===========================================
// LARION (Original Map) - 7 ports
// ===========================================
export const LARION_PORTS = [
    'mirebridge',
    'gre_au_vent',
    'port_de_sable',
    'sunbreach',
    'brinewaith',
    'stormbay',
    'gullwing'
];

export const LARION_NAVAL_TIMES: Record<string, Record<string, number>> = {
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
export const LARION_LARGE_PORTS = [
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

export const LARION_LARGE_NAVAL_TIMES: Record<string, Record<string, number>> = {
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
export const LARION_ALTERNATE_PORTS = [
    'mirebridge',
    'gre_au_vent',
    'port_de_sable',
    'sunbreach',
    'brinewaith',
    'stormbay',
    'gullwing',
    'cathair'
];

export const LARION_ALTERNATE_NAVAL_TIMES: Record<string, Record<string, number>> = {
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
// THYRAKAT - 6 ports
// ===========================================
export const THYRAKAT_PORTS = [
    'faith_pier',
    'harabour',
    'yehid',
    'Maqom',
    'het-yod',
    'saphir',
];

export const THYRAKAT_NAVAL_TIMES: Record<string, Record<string, number>> = {
    faith_pier: {
        harabour: 3,
        yehid: 6,
        Maqom: 7,
        'het-yod': 10,
        saphir: 12
    },
    harabour: {
        yehid: 3,
        Maqom: 4,
        'het-yod': 7,
        saphir: 9
    },
    yehid: {
        Maqom: 1,
        'het-yod': 4,
        saphir: 6
    },
    Maqom: {
        'het-yod': 3,
        saphir: 5
    },
    'het-yod': {
        saphir: 2
    },
};

// ===========================================
// ALL_PORTS - Union of all ports from all maps
// Used for map-agnostic port detection
// ===========================================
export const ALL_PORTS: Set<string> = new Set([
    ...LARION_PORTS,
    ...LARION_LARGE_PORTS,
    ...LARION_ALTERNATE_PORTS,
    ...THYRAKAT_PORTS
]);

/**
 * Check if a location is a port (works across all maps)
 */
export const isPort = (locationId: string): boolean => ALL_PORTS.has(locationId);

// ===========================================
// Map-specific accessors
// ===========================================
export type MapId = 'larion' | 'larion_large' | 'larion_alternate' | 'thyrakat' | 'thyrakat_tutorial';

export const getPortsForMap = (mapId: MapId | undefined): string[] => {
    switch (mapId) {
        case 'larion_large':
            return LARION_LARGE_PORTS;
        case 'larion':
            return LARION_PORTS;
        case 'thyrakat':
        case 'thyrakat_tutorial':
            return THYRAKAT_PORTS;
        case 'larion_alternate':
        default:
            return LARION_ALTERNATE_PORTS;
    }
};

export const getNavalTimesForMap = (mapId: MapId | undefined): Record<string, Record<string, number>> => {
    switch (mapId) {
        case 'larion_large':
            return LARION_LARGE_NAVAL_TIMES;
        case 'larion':
            return LARION_NAVAL_TIMES;
        case 'thyrakat':
        case 'thyrakat_tutorial':
            return THYRAKAT_NAVAL_TIMES;
        case 'larion_alternate':
        default:
            return LARION_ALTERNATE_NAVAL_TIMES;
    }
};

/**
 * Get naval travel time between two ports for a specific map
 * Handles symmetry (from-to and to-from are equivalent)
 */
export const getNavalTravelTimeForMap = (mapId: MapId | undefined, from: string, to: string): number => {
    if (from === to) return 0;
    const times = getNavalTimesForMap(mapId);
    return times[from]?.[to] || times[to]?.[from] || 2;
};

// ===========================================
// ALL_NAVAL_TIMES - Merged naval times from all maps
// Used for map-agnostic travel time lookup
// ===========================================
const mergeNavalTimes = (...timesTables: Record<string, Record<string, number>>[]): Record<string, Record<string, number>> => {
    const merged: Record<string, Record<string, number>> = {};
    for (const table of timesTables) {
        for (const [from, destinations] of Object.entries(table)) {
            if (!merged[from]) merged[from] = {};
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

export const ALL_NAVAL_TIMES: Record<string, Record<string, number>> = mergeNavalTimes(
    LARION_NAVAL_TIMES,
    LARION_LARGE_NAVAL_TIMES,
    LARION_ALTERNATE_NAVAL_TIMES,
    THYRAKAT_NAVAL_TIMES
);

/**
 * Get naval travel time between any two ports (works across all maps)
 * Handles symmetry (from-to and to-from are equivalent)
 * Falls back to default of 2 if route not found
 */
export const getNavalTravelTimeUnified = (from: string, to: string): number => {
    if (from === to) return 0;
    return ALL_NAVAL_TIMES[from]?.[to] || ALL_NAVAL_TIMES[to]?.[from] || 2;
};
