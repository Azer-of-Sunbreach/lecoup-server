import { MapDefinition, MapId } from './types';
export declare const MapRegistry: {
    get: (id: MapId) => MapDefinition;
    getAll: () => MapDefinition[];
    getAvailableMaps: () => {
        id: MapId;
        nameKey: string;
    }[];
};
