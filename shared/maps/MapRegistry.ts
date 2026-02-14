import { MapDefinition, MapId } from './types';
import { LarionDefinition, LarionAlternateDefinition } from './definitions/larion';
import { ValisDefinition } from './definitions/valis';
import { ThyrakatTutorialDefinition } from './definitions/thyrakat_tutorial';
import { ThyrakatDefinition } from './definitions/thyrakat';

const REGISTRY: Record<MapId, MapDefinition> = {
    'larion': LarionDefinition,
    'larion_alternate': LarionAlternateDefinition,
    'valis': ValisDefinition,
    'thyrakat_tutorial': ThyrakatTutorialDefinition,
    'thyrakat': ThyrakatDefinition
};

export const MapRegistry = {
    get: (id: MapId): MapDefinition => {
        return REGISTRY[id] || LarionAlternateDefinition;
    },
    getFactions: (id: MapId) => {
        return (REGISTRY[id] || LarionAlternateDefinition).factions;
    },
    getAll: (): MapDefinition[] => {
        return Object.values(REGISTRY);
    },
    // Helper to get available maps for UI
    getAvailableMaps: (): { id: MapId, nameKey: string }[] => {
        // Return valid maps. Can filter out 'larion' if we want to hide deprecated ones later.
        return [
            { id: 'larion_alternate', nameKey: 'maps.larion_alternate' },
            { id: 'valis', nameKey: 'maps.valis' },
            { id: 'thyrakat', nameKey: 'maps.thyrakat' }
        ];
    }
};
