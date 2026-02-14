import { FactionId, GameState, Location, Army, Character, Road } from '../types';
export type MapId = 'larion' | 'larion_alternate' | 'valis';
export interface FactionMetadata {
    id: FactionId;
    nameKey: string;
    descriptionKey: string;
    colors: {
        primary: string;
        secondary: string;
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
    getInitialCharacters: () => any[];
}
export interface MapDefinition {
    id: MapId;
    nameKey: string;
    descriptionKey?: string;
    loreKey: string;
    factions: FactionId[];
    factionMetadata: Partial<Record<FactionId, FactionMetadata>>;
    uiConfig?: {
        mapImageStr?: string;
    };
    rules?: MapRules;
}
