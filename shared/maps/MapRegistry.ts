import { MapDefinition, MapId } from './types';
import { LarionDefinition, LarionAlternateDefinition } from './definitions/larion';
import { ValisDefinition } from './definitions/valis';

const REGISTRY: Record<MapId, MapDefinition> = {
    'larion': LarionDefinition,
    'larion_alternate': LarionAlternateDefinition,
    'valis': ValisDefinition
};

export const MapRegistry = {
    get: (id: MapId): MapDefinition => {
        return REGISTRY[id] || LarionAlternateDefinition;
    },
    getAll: (): MapDefinition[] => {
        return Object.values(REGISTRY);
    },
    // Helper to get available maps for UI
    getAvailableMaps: (): { id: MapId, nameKey: string }[] => {
        // Return valid maps. Can filter out 'larion' if we want to hide deprecated ones later.
        return [
            { id: 'larion_alternate', nameKey: 'maps.larion_alternate' },
            { id: 'valis', nameKey: 'maps.valis' }
        ];
    }
};
