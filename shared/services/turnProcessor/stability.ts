// Stability Module - Process stability changes from leaders and low taxes

import { Location, Character, CharacterStatus, LocationType } from '../../types';
import { StabilityProcessingResult } from './types';

/**
 * Apply leader stability modifiers to locations.
 * Leaders with AVAILABLE status apply their stabilityPerTurn bonus to their current location,
 * BUT ONLY if the location is controlled by the leader's faction.
 * 
 * @param locations - All locations
 * @param characters - All characters
 * @returns Updated locations with stability changes
 */
export function applyLeaderStabilityModifiers(
    locations: Location[],
    characters: Character[]
): StabilityProcessingResult {
    let updatedLocations = locations.map(l => ({ ...l }));

    characters.forEach(char => {
        if (char.status === CharacterStatus.AVAILABLE && char.stats.stabilityPerTurn !== 0) {
            const targetLocId = char.locationId;
            const loc = updatedLocations.find(l => l.id === targetLocId);

            // Only apply stability modifier if location is controlled by leader's faction
            if (loc && loc.faction === char.faction) {
                updatedLocations = updatedLocations.map(l => {
                    if (l.id === targetLocId) {
                        const newStab = Math.min(100, Math.max(0, l.stability + char.stats.stabilityPerTurn));
                        return { ...l, stability: newStab };
                    }
                    return l;
                });
            }
        }
    });

    return { locations: updatedLocations };
}

/**
 * Apply passive stability recovery for locations with very low taxes.
 * 
 * Spec 5.1.2:
 * - Cities with VERY_LOW personal taxes: +5/turn if stability < 25%, +3/turn if 25-51%
 * - Rural with VERY_LOW food collection: +4/turn if stability < 25%, +3/turn if 25-51%
 * 
 * @param locations - All locations
 * @returns Updated locations with stability recovery
 */
export function applyLowTaxStabilityRecovery(locations: Location[]): StabilityProcessingResult {
    const updatedLocations = locations.map(loc => {
        // Cities: Check personal tax level
        if (loc.type === LocationType.CITY && loc.taxLevel === 'VERY_LOW') {
            if (loc.stability < 25) {
                return { ...loc, stability: Math.min(100, loc.stability + 5) };
            } else if (loc.stability < 52) {
                return { ...loc, stability: Math.min(100, loc.stability + 3) };
            }
        }

        // Rural: Check food collection level
        if (loc.type === LocationType.RURAL && loc.foodCollectionLevel === 'VERY_LOW') {
            if (loc.stability < 25) {
                return { ...loc, stability: Math.min(100, loc.stability + 4) };
            } else if (loc.stability < 52) {
                return { ...loc, stability: Math.min(100, loc.stability + 3) };
            }
        }

        return loc;
    });

    return { locations: updatedLocations };
}

/**
 * Process all stability changes for a turn.
 * Combines leader modifiers and low tax recovery.
 * 
 * @param locations - All locations
 * @param characters - All characters
 * @returns Updated locations
 */
export function processStability(
    locations: Location[],
    characters: Character[]
): StabilityProcessingResult {
    // First apply leader modifiers
    let result = applyLeaderStabilityModifiers(locations, characters);

    // Then apply low tax recovery
    result = applyLowTaxStabilityRecovery(result.locations);

    return result;
}
