/**
 * Port Data for All Maps
 * Centralized port configurations for naval travel times
 */
export declare const LARION_PORTS: string[];
export declare const LARION_NAVAL_TIMES: Record<string, Record<string, number>>;
export declare const LARION_LARGE_PORTS: string[];
export declare const LARION_LARGE_NAVAL_TIMES: Record<string, Record<string, number>>;
export declare const LARION_ALTERNATE_PORTS: string[];
export declare const LARION_ALTERNATE_NAVAL_TIMES: Record<string, Record<string, number>>;
export declare const ALL_PORTS: Set<string>;
/**
 * Check if a location is a port (works across all maps)
 */
export declare const isPort: (locationId: string) => boolean;
export type MapId = 'larion' | 'larion_large' | 'larion_alternate';
export declare const getPortsForMap: (mapId: MapId | undefined) => string[];
export declare const getNavalTimesForMap: (mapId: MapId | undefined) => Record<string, Record<string, number>>;
/**
 * Get naval travel time between two ports for a specific map
 * Handles symmetry (from-to and to-from are equivalent)
 */
export declare const getNavalTravelTimeForMap: (mapId: MapId | undefined, from: string, to: string) => number;
export declare const ALL_NAVAL_TIMES: Record<string, Record<string, number>>;
/**
 * Get naval travel time between any two ports (works across all maps)
 * Handles symmetry (from-to and to-from are equivalent)
 * Falls back to default of 2 if route not found
 */
export declare const getNavalTravelTimeUnified: (from: string, to: string) => number;
