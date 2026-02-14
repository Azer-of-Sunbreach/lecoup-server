import { MapDefinition } from '../types';
import { FactionId } from '../../types';
import { BaseMapRules } from '../rules/BaseMapRules';

const FACTION_STYLE = {
    [FactionId.LARION_KNIGHTS]: {
        bgGradient: 'linear-gradient(180deg, #2a2a2a 0%, #151515 100%)',
        borderColor: '#b8960c',
        hoverBg: 'linear-gradient(180deg, #353535 0%, #1a1a1a 100%)',
        textColor: '#d4af37',
        wornOverlay: 'radial-gradient(ellipse at 20% 30%, rgba(0,0,0,0.3) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(0,0,0,0.25) 0%, transparent 40%)',
    },
    [FactionId.THYRAKAT_SULTANATE]: {
        bgGradient: 'linear-gradient(180deg, #3d1f4e 0%, #1e0f28 100%)',
        borderColor: '#7b3fa0',
        hoverBg: 'linear-gradient(180deg, #4d2860 0%, #281530 100%)',
        textColor: '#c084fc',
        wornOverlay: 'radial-gradient(ellipse at 70% 20%, rgba(0,0,0,0.3) 0%, transparent 45%), radial-gradient(ellipse at 30% 80%, rgba(0,0,0,0.2) 0%, transparent 50%)',
    },
    [FactionId.NEUTRAL]: {
        bgGradient: '',
        borderColor: '',
        hoverBg: '',
        textColor: '',
        wornOverlay: '',
    }
};

const THYRAKAT_TUTORIAL_METADATA = {
    [FactionId.LARION_KNIGHTS]: {
        id: FactionId.LARION_KNIGHTS,
        nameKey: 'map:factions.larion_knights',
        descriptionKey: 'map:factionSelect.descriptions.larion_knights',
        colors: { primary: '#b8960c', secondary: '#151515', text: '#d4af37' },
        style: FACTION_STYLE[FactionId.LARION_KNIGHTS]
    },
    [FactionId.THYRAKAT_SULTANATE]: {
        id: FactionId.THYRAKAT_SULTANATE,
        nameKey: 'map:factions.thyrakat_sultanate',
        descriptionKey: 'map:factionSelect.descriptions.thyrakat_sultanate',
        colors: { primary: '#7b3fa0', secondary: '#1e0f28', text: '#c084fc' },
        style: FACTION_STYLE[FactionId.THYRAKAT_SULTANATE]
    },
    [FactionId.NEUTRAL]: {
        id: FactionId.NEUTRAL,
        nameKey: 'factions.neutral',
        descriptionKey: '',
        colors: { primary: '#888888', secondary: '#444444', text: '#bbbbbb' },
        style: FACTION_STYLE[FactionId.NEUTRAL]
    }
};

export const ThyrakatTutorialDefinition: MapDefinition = {
    id: 'thyrakat_tutorial',
    nameKey: 'map:maps.thyrakat_tutorial',
    loreKey: 'map:factionSelect.lore',
    factions: [FactionId.LARION_KNIGHTS, FactionId.THYRAKAT_SULTANATE],
    factionMetadata: THYRAKAT_TUTORIAL_METADATA,
    rules: new BaseMapRules()
};
