// Defense Missions Module - Generate DEFEND missions

import { GameState, FactionId, AIMission } from '../../../../shared/types';
import { AITheater, FactionPersonality } from '../types';
import { VITAL_CITIES, STRATEGIC_LOCATIONS } from './types';

/**
 * Generate DEFEND missions for threatened locations.
 * 
 * Priority: Vital Cities > Strategic Locations > Unstable Regions
 * 
 * @param state - Current game state
 * @param faction - Faction to generate for
 * @param theaters - Analyzed theaters
 * @param profile - Faction personality
 * @param activeMissions - Current active missions (modified in place)
 */
export function generateDefendMissions(
    state: GameState,
    faction: FactionId,
    theaters: AITheater[],
    profile: FactionPersonality,
    activeMissions: AIMission[]
): void {
    // Find vulnerable locations
    const vulnerableLocs = state.locations.filter(l =>
        l.faction === faction &&
        (l.stability < 50 || (l.stability < 70 && l.type === 'CITY'))
    );

    const locationsToDefend = new Set<string>();

    // Collect locations needing defense
    for (const theater of theaters) {
        // Vital cities
        theater.locationIds
            .filter(id => VITAL_CITIES.includes(id))
            .forEach(id => locationsToDefend.add(id));

        // Vulnerable locations
        vulnerableLocs
            .filter(l => theater.locationIds.includes(l.id))
            .forEach(l => locationsToDefend.add(l.id));

        // Strategic locations (force defense even if safe)
        const myStrategic = STRATEGIC_LOCATIONS[faction] || [];
        theater.locationIds
            .filter(id => myStrategic.includes(id))
            .forEach(id => locationsToDefend.add(id));
    }

    // Create DEFEND missions
    for (const locId of locationsToDefend) {
        // Skip if already defended
        if (activeMissions.some(m => m.type === 'DEFEND' && m.targetId === locId)) continue;

        const loc = state.locations.find(l => l.id === locId);
        if (!loc) continue;

        // Calculate required strength
        let requiredStr = 1000;
        if (loc.type === 'CITY') requiredStr += 500;

        // Strategic locations need more troops
        const myStrategic = STRATEGIC_LOCATIONS[faction] || [];
        if (myStrategic.includes(locId)) {
            requiredStr = Math.max(requiredStr, 1500);
        }

        // Adjust by personality
        requiredStr = requiredStr * (0.8 + (profile.defensiveness * 0.4));

        // Check current garrison
        const garrisonStr = state.armies
            .filter(a => a.locationId === locId && a.faction === faction)
            .reduce((s, a) => s + a.strength, 0);

        // Create mission if under-strength
        if (garrisonStr < requiredStr * 0.8) {
            activeMissions.push({
                id: `defend_${locId}_${state.turn}`,
                type: 'DEFEND',
                priority: myStrategic.includes(locId) ? 90 : (loc.stability < 40 ? 95 : 80),
                status: 'PLANNING',
                targetId: locId,
                stage: 'GATHERING',
                assignedArmyIds: [],
                data: { requiredStrength: Math.floor(requiredStr) }
            });
        }
    }
}
