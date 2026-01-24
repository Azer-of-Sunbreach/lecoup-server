// Garrison Module - Calculate minimum garrison requirements

import { FactionId, Character, Location, Road } from '../../../../shared/types';
import { STRATEGIC_LOCATIONS } from './types';

/**
 * Calculate minimum garrison based on stability, population, and LEGENDARY leader presence.
 * 
 * Formula: (10 * (Population/100000)) * (120 - Stability) + 100
 * - Minimum 500, Maximum 4000
 * - Strategic locations have minimum 1000 garrison
 * - Frontier locations (adjacent to enemy) have minimum 1000 garrison
 * - LEGENDARY leaders can substitute for garrison (returns 0)
 * 
 * @param location - The location to calculate garrison for
 * @param characters - All characters (to check for LEGENDARY ability)
 * @param faction - The faction we're calculating for
 * @param roads - Optional roads array for frontier detection
 * @param locations - Optional locations array for frontier detection
 * @returns Minimum garrison requirement (0-4000)
 */
export function getMinGarrison(
    location: Location | undefined,
    characters: Character[],
    faction: FactionId,
    roads?: Road[],
    locations?: Location[]
): number {
    if (!location) return 500;

    // Check if LEGENDARY leader is present - they can substitute for garrison
    const hasLegendary = characters.some(c =>
        c.locationId === location.id &&
        c.faction === faction &&
        c.stats?.ability?.includes('LEGENDARY')
    );

    if (hasLegendary) return 0; // LEGENDARY leader protects the zone

    // Dynamic Garrison Formula
    // Formula: (10 * (Population/100000)) * (120 - Stability) + 100
    // Minimum 500, Maximum 4000

    const pop = location.population || 5000; // Default if missing
    const stab = location.stability || 50;

    const baseNeed = (10 * (pop / 100000)) * (120 - stab) + 100;

    // Apply bounds: Min 500, Max 4000
    let required = Math.min(4000, Math.max(500, Math.floor(baseNeed)));

    // STRATEGIC DEFENSE OVERRIDE
    // Strategic locations have minimum 1000 garrison
    const myStrategic = STRATEGIC_LOCATIONS[faction] || [];
    if (myStrategic.includes(location.id)) {
        required = Math.max(required, 1000);
    }

    // FRONTIER DEFENSE OVERRIDE
    // If location has enemy-controlled neighbor, minimum 1000 garrison
    if (roads && locations) {
        const isFrontier = roads.some(r => {
            if (r.from !== location.id && r.to !== location.id) return false;
            const neighborId = r.from === location.id ? r.to : r.from;
            const neighbor = locations.find(l => l.id === neighborId);
            return neighbor && neighbor.faction !== faction && neighbor.faction !== FactionId.NEUTRAL;
        });
        if (isFrontier) {
            required = Math.max(required, 1000);
        }
    }

    return required;
}
