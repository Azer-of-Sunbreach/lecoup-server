// Retreat Logic Module - Calculate retreat positions for armies

import { GameState, Army, Road, RoadQuality } from '../../types';
import { RetreatPosition } from './types';

/**
 * Calculate the retreat position for an army after losing combat or choosing to retreat.
 * 
 * This function handles complex retreat scenarios including:
 * - Road stage retreat (forward/backward direction)
 * - Location retreat using startOfTurnPosition
 * - Fallback to tripOriginId or adjacent friendly locations
 * 
 * @param army - The army that needs to retreat
 * @param roads - All roads in the game
 * @param locations - All locations in the game
 * @returns Partial Army object with new position fields
 */
export const getRetreatPosition = (
    army: Army,
    roads: Road[],
    locations: { id: string; faction: typeof army.faction }[]
): RetreatPosition => {
    // Road retreat logic
    if (army.locationType === 'ROAD' && army.roadId && army.stageIndex !== undefined) {
        const road = roads.find(r => r.id === army.roadId);
        if (!road) return {};

        if (army.direction === 'FORWARD') {
            if (army.stageIndex > 0) {
                return {
                    locationType: 'ROAD',
                    roadId: army.roadId,
                    stageIndex: army.stageIndex - 1,
                    locationId: null
                };
            } else {
                return {
                    locationType: 'LOCATION',
                    locationId: road.from,
                    roadId: null,
                    stageIndex: 0
                };
            }
        } else {
            if (army.stageIndex < road.stages.length - 1) {
                return {
                    locationType: 'ROAD',
                    roadId: army.roadId,
                    stageIndex: army.stageIndex + 1,
                    locationId: null
                };
            } else {
                return {
                    locationType: 'LOCATION',
                    locationId: road.to,
                    roadId: null,
                    stageIndex: 0
                };
            }
        }
    }

    // Location retreat logic
    if (army.locationType === 'LOCATION' && army.locationId) {
        const originId = army.originLocationId;
        const currentId = army.locationId;

        // Use startOfTurnPosition as primary retreat destination
        if (army.startOfTurnPosition) {
            if (army.startOfTurnPosition.type === 'ROAD') {
                return {
                    locationType: 'ROAD',
                    roadId: army.startOfTurnPosition.id,
                    stageIndex: army.startOfTurnPosition.stageIndex || 0,
                    locationId: null
                };
            } else if (army.startOfTurnPosition.type === 'LOCATION') {
                if (army.startOfTurnPosition.id === currentId) {
                    // Fallback to tripOriginId if available and different
                    if (army.tripOriginId && army.tripOriginId !== currentId) {
                        const road = roads.find(r =>
                            (r.from === currentId && r.to === army.tripOriginId) ||
                            (r.to === currentId && r.from === army.tripOriginId)
                        );
                        if (road && road.stages && road.stages.length > 0) {
                            const idx = road.from === currentId ? 0 : road.stages.length - 1;
                            return { locationType: 'ROAD', roadId: road.id, stageIndex: idx, locationId: null };
                        } else if (road) {
                            // LOCAL road or empty stages - retreat to the other end of the road
                            const retreatLocId = road.from === currentId ? road.to : road.from;
                            return { locationType: 'LOCATION', locationId: retreatLocId, roadId: null, stageIndex: 0 };
                        }
                    }
                } else {
                    // Started at OTHER location - go back there
                    const targetId = army.startOfTurnPosition.id;
                    const road = roads.find(r =>
                        (r.from === currentId && r.to === targetId) ||
                        (r.to === currentId && r.from === targetId)
                    );
                    if (road && road.stages && road.stages.length > 0) {
                        const idx = road.from === currentId ? 0 : road.stages.length - 1;
                        return { locationType: 'ROAD', roadId: road.id, stageIndex: idx, locationId: null };
                    } else if (road) {
                        // LOCAL road or empty stages - retreat to the target location
                        return { locationType: 'LOCATION', locationId: targetId, roadId: null, stageIndex: 0 };
                    }
                }
            }
        }

        // Fallback: If origin is current (spawned here), try to find ANY friendly adjacent
        if (originId === currentId) {
            const adjRoads = roads.filter(r => r.from === currentId || r.to === currentId);

            // Check for friendly Road Stages connected to this location
            for (const road of adjRoads) {
                const stageIdx = road.from === currentId ? 0 : road.stages.length - 1;
                const stage = road.stages[stageIdx];

                if (stage.faction === army.faction || stage.faction === 'NEUTRAL') {
                    // Only retreat to road stage if stageIdx is valid
                    if (stageIdx >= 0 && stageIdx < road.stages.length) {
                        return { locationType: 'ROAD', roadId: road.id, stageIndex: stageIdx, locationId: null };
                    }
                }
            }

            // Check for friendly Locations
            for (const road of adjRoads) {
                const neighborId = road.from === currentId ? road.to : road.from;
                const neighbor = locations.find(l => l.id === neighborId);
                if (neighbor && neighbor.faction === army.faction) {
                    return { locationType: 'LOCATION', locationId: neighborId, roadId: null, stageIndex: 0 };
                }
            }

            // If nowhere to run, stay
            return { locationType: 'LOCATION', locationId: currentId, roadId: null, stageIndex: 0 };
        }

        // Find the correct connecting road
        let road = roads.find(r =>
            (r.from === originId && r.to === currentId) ||
            (r.to === originId && r.from === currentId)
        );

        // Fallback: search for ANY road connected to currentId
        if (!road) {
            const connectedRoads = roads.filter(r =>
                r.from === currentId || r.to === currentId
            );
            // Prefer roads leading to friendly territory
            road = connectedRoads.find(r => {
                const otherId = r.from === currentId ? r.to : r.from;
                const otherLoc = locations.find(l => l.id === otherId);
                return otherLoc && otherLoc.faction === army.faction;
            }) || connectedRoads[0];
        }

        if (road) {
            if (road.quality === RoadQuality.LOCAL) {
                // LOCAL road = instant travel, retreat to origin
                return { locationType: 'LOCATION', locationId: originId, roadId: null, stageIndex: 0 };
            } else {
                // REGIONAL road = has stages, retreat to last stage before the location
                // FIX: Ensure stages array is not empty to avoid stageIndex = -1
                if (!road.stages || road.stages.length === 0) {
                    // Road has no stages, retreat to origin
                    return { locationType: 'LOCATION', locationId: originId, roadId: null, stageIndex: 0 };
                }
                if (road.to === currentId) {
                    return { locationType: 'ROAD', roadId: road.id, stageIndex: road.stages.length - 1, locationId: null };
                } else {
                    return { locationType: 'ROAD', roadId: road.id, stageIndex: 0, locationId: null };
                }
            }
        } else {
            // If no road found, fallback to origin
            return { locationType: 'LOCATION', locationId: originId, roadId: null, stageIndex: 0 };
        }
    }

    return {};
};
