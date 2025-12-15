import { GameState, FactionId, AIMission } from '../../../types';
/**
 * Strategic road stage targets by faction.
 *
 * Each target has:
 * - stageId: The road stage name/ID
 * - roadId: The road this stage is on
 * - priority: Base priority (0-100)
 * - hasNaturalDefense: If true, garrison only (no fortification)
 */
export interface RoadDefenseTarget {
    stageId: string;
    roadId: string;
    priority: number;
    hasNaturalDefense: boolean;
}
export declare const ROAD_DEFENSE_TARGETS: Record<FactionId, RoadDefenseTarget[]>;
/**
 * Generate ROAD_DEFENSE missions for strategic road stage control.
 *
 * Creates missions to:
 * - Garrison natural defense stages when threatened (500+ troops)
 * - Fortify empty stages with Pikes and Trenches / Stone Tower
 *
 * Uses weighted scoring with randomization to avoid predictable starts.
 *
 * @param state - Current game state
 * @param faction - Faction to generate for
 * @param turn - Current turn number
 * @param activeMissions - Current active missions (modified in place)
 */
export declare function generateRoadDefenseMissions(state: GameState, faction: FactionId, turn: number, activeMissions: AIMission[]): void;
