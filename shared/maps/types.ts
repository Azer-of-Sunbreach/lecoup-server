import { FactionId, GameState, Location, Army, Character, Road } from '../types';

export type MapId = 'larion' | 'larion_alternate' | 'valis';

export interface FactionMetadata {
    id: FactionId;
    nameKey: string;
    descriptionKey: string;
    colors: {
        primary: string; // Tail/Border
        secondary: string; // Background/Fill
        text: string;
    };
    style?: {
        bgGradient: string;
        borderColor: string;
        hoverBg: string;
        textColor: string;
        wornOverlay: string;
    };
}

export interface MapRules {
    calculateEconomy: (state: GameState, locations: Location[], armies: Army[], characters: Character[], roads: Road[]) => Location[];
    getInitialCharacters: () => any[]; // Returns CharacterNew[] or Character[]
}

export interface MapDefinition {
    id: MapId;
    nameKey: string;
    descriptionKey?: string; // Short description for selector if needed
    loreKey: string; // Key prefix for lore text (e.g. 'factionSelect.lore')
    factions: FactionId[];
    factionMetadata: Partial<Record<FactionId, FactionMetadata>>;
    uiConfig?: {
        mapImageStr?: string; // Base64 or path
        // Other UI specifics
    };
    rules?: MapRules; // If undefined, use default/legacy rules
}
