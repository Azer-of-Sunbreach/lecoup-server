import { Location, Army, Character, Road, FactionId } from '../types';
import { GameState } from '../types';
import { MapRegistry } from '../maps/MapRegistry';

export const calculateEconomyAndFood = (state: GameState, locs: Location[], armies: Army[], chars: Character[], roads: any[]) => {
    // Determine which map we are on. If state has mapId use it, otherwise fallback to larion_alternate (legacy)
    const mapId = (state as any).mapId || 'larion_alternate';
    const mapDef = MapRegistry.get(mapId);

    // Delegate to map rules. If no rules defined (shouldn't happen with new architecture), return locs as is.
    if (mapDef && mapDef.rules) {
        return mapDef.rules.calculateEconomy(state, locs, armies, chars, roads);
    }

    console.warn(`No rules found for map ${mapId}, returning locations unmodified.`);
    return locs;
};
