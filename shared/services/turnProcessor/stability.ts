// Stability Module - Process stability changes from leaders, low taxes, and high tax penalties

import { Location, Character, CharacterStatus, LocationType, LogEntry, LogSeverity, LogType, FactionId } from '../../types';
import { StabilityProcessingResult } from './types';

/**
 * Get the effective stability modifier for a character.
 * Uses stabilityModifierOverride if set (from Internal Factions effects),
 * otherwise falls back to stats.stabilityPerTurn.
 */
export function getEffectiveStabilityModifier(character: Character): number {
    return character.stabilityModifierOverride ?? character.stats.stabilityPerTurn;
}

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
        const effectiveStability = getEffectiveStabilityModifier(char);
        if ((char.status === CharacterStatus.AVAILABLE || char.status === CharacterStatus.GOVERNING) && effectiveStability !== 0) {
            const targetLocId = char.locationId;
            const loc = updatedLocations.find(l => l.id === targetLocId);

            // Only apply stability modifier if location is controlled by leader's faction
            if (loc && loc.faction === char.faction) {
                updatedLocations = updatedLocations.map(l => {
                    if (l.id === targetLocId) {
                        const newStab = Math.min(100, Math.max(0, l.stability + effectiveStability));
                        return { ...l, stability: newStab };
                    }
                    return l;
                });
            }
        }
    });

    return { locations: updatedLocations, logs: [] };
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

    return { locations: updatedLocations, logs: [] };
}

/**
 * Apply stability penalties for locations with very high taxes/food collection.
 * Only applies if NO leader of the controlling faction is present.
 * 
 * Spec:
 * - Cities with VERY_HIGH personal taxes + no leader: -5/turn
 * - Cities with VERY_HIGH commercial taxes + no leader: -2/turn
 * - Rural with VERY_HIGH food collection + no leader: -4/turn
 * 
 * @param locations - All locations
 * @param characters - All characters
 * @param turn - Current turn number
 * @returns Updated locations and warning logs
 */
export function applyHighTaxStabilityPenalty(
    locations: Location[],
    characters: Character[],
    turn: number
): StabilityProcessingResult {
    const logs: LogEntry[] = [];

    // Find which locations have a leader present from the controlling faction
    const leaderLocationsByFaction: Map<string, FactionId[]> = new Map();
    characters.forEach(char => {
        if ((char.status === CharacterStatus.AVAILABLE || char.status === CharacterStatus.GOVERNING) && char.locationId) {
            const existingFactions = leaderLocationsByFaction.get(char.locationId) || [];
            if (!existingFactions.includes(char.faction)) {
                leaderLocationsByFaction.set(char.locationId, [...existingFactions, char.faction]);
            }
        }
    });

    const hasLeaderPresent = (locId: string, faction: FactionId): boolean => {
        const factionsAtLocation = leaderLocationsByFaction.get(locId) || [];
        return factionsAtLocation.includes(faction);
    };

    const updatedLocations = locations.map(loc => {
        if (loc.faction === FactionId.NEUTRAL) return loc;

        let stabilityPenalty = 0;
        const messages: string[] = [];

        // CITY: Check personal taxes (VERY_HIGH = -5)
        if (loc.type === LocationType.CITY && loc.taxLevel === 'VERY_HIGH') {
            if (!hasLeaderPresent(loc.id, loc.faction)) {
                stabilityPenalty += 5;
                messages.push(`Citizens are becoming restless about the confiscatory personal taxes in ${loc.name}. Stability drops by 5.`);
            }
        }

        // CITY: Check commercial taxes (VERY_HIGH = -2)
        if (loc.type === LocationType.CITY && loc.tradeTaxLevel === 'VERY_HIGH') {
            if (!hasLeaderPresent(loc.id, loc.faction)) {
                stabilityPenalty += 2;
                messages.push(`Merchants are becoming restless about the confiscatory commercial taxes in ${loc.name}. Stability drops by 2.`);
            }
        }

        // RURAL: Check food collection (VERY_HIGH = -4)
        if (loc.type === LocationType.RURAL && loc.foodCollectionLevel === 'VERY_HIGH') {
            if (!hasLeaderPresent(loc.id, loc.faction)) {
                stabilityPenalty += 4;
                messages.push(`Peasants and farmers are becoming restless about the confiscatory food collection in ${loc.name}. Stability drops by 4.`);
            }
        }

        // Generate logs for each penalty
        messages.forEach(message => {
            logs.push({
                id: `stability_penalty_${loc.id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                type: LogType.ECONOMY,
                message,
                turn,
                visibleToFactions: [loc.faction], // Only visible to controlling faction
                baseSeverity: LogSeverity.WARNING,
                warningForFactions: [loc.faction],
                highlightTarget: {
                    type: 'LOCATION',
                    id: loc.id
                }
            });
        });

        if (stabilityPenalty > 0) {
            const newStability = Math.max(0, loc.stability - stabilityPenalty);
            return { ...loc, stability: newStability };
        }

        return loc;
    });

    return { locations: updatedLocations, logs };
}

/**
 * Process all stability changes for a turn.
 * Combines leader modifiers, low tax recovery, and high tax penalties.
 * 
 * @param locations - All locations
 * @param characters - All characters
 * @param turn - Current turn number
 * @returns Updated locations and logs
 */
export function processStability(
    locations: Location[],
    characters: Character[],
    turn: number = 1
): StabilityProcessingResult {
    let allLogs: LogEntry[] = [];

    // First apply leader modifiers
    let result = applyLeaderStabilityModifiers(locations, characters);
    allLogs = [...allLogs, ...result.logs];

    // Then apply low tax recovery
    result = applyLowTaxStabilityRecovery(result.locations);
    allLogs = [...allLogs, ...result.logs];

    // Then apply high tax penalties (new)
    result = applyHighTaxStabilityPenalty(result.locations, characters, turn);
    allLogs = [...allLogs, ...result.logs];

    return { locations: result.locations, logs: allLogs };
}

