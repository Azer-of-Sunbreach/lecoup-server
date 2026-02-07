import { MapDefinition } from '../types';
import { FactionId } from '../../types';

const FACTION_STYLE = {
    [FactionId.NOBLES]: {
        bgGradient: 'linear-gradient(180deg, #4a2020 0%, #2a1010 100%)',
        borderColor: '#8b4040',
        hoverBg: 'linear-gradient(180deg, #5a2828 0%, #3a1818 100%)',
        textColor: '#fca5a5',
        wornOverlay: 'radial-gradient(ellipse at 20% 30%, rgba(0,0,0,0.3) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(0,0,0,0.25) 0%, transparent 40%)',
    },
    [FactionId.CONSPIRATORS]: {
        bgGradient: 'linear-gradient(180deg, #4a3a20 0%, #2a2010 100%)',
        borderColor: '#8b7040',
        hoverBg: 'linear-gradient(180deg, #5a4828 0%, #3a2818 100%)',
        textColor: '#fcd34d',
        wornOverlay: 'radial-gradient(ellipse at 70% 20%, rgba(0,0,0,0.3) 0%, transparent 45%), radial-gradient(ellipse at 30% 80%, rgba(0,0,0,0.2) 0%, transparent 50%)',
    },
    [FactionId.REPUBLICANS]: {
        bgGradient: 'linear-gradient(180deg, #203050 0%, #101828 100%)',
        borderColor: '#4070a0',
        hoverBg: 'linear-gradient(180deg, #284060 0%, #182030 100%)',
        textColor: '#93c5fd',
        wornOverlay: 'radial-gradient(ellipse at 60% 40%, rgba(0,0,0,0.25) 0%, transparent 45%), radial-gradient(ellipse at 10% 60%, rgba(0,0,0,0.3) 0%, transparent 40%)',
    },
    [FactionId.NEUTRAL]: {
        bgGradient: '',
        borderColor: '',
        hoverBg: '',
        textColor: '',
        wornOverlay: '',
    }
};

const LARION_METADATA = {
    [FactionId.REPUBLICANS]: {
        id: FactionId.REPUBLICANS,
        nameKey: 'factions.republicans',
        descriptionKey: 'common:factionSelect.descriptions.republicans',
        colors: { primary: '#4070a0', secondary: '#101828', text: '#93c5fd' },
        style: FACTION_STYLE[FactionId.REPUBLICANS]
    },
    [FactionId.CONSPIRATORS]: {
        id: FactionId.CONSPIRATORS,
        nameKey: 'factions.conspirators',
        descriptionKey: 'common:factionSelect.descriptions.conspirators',
        colors: { primary: '#8b7040', secondary: '#2a2010', text: '#fcd34d' },
        style: FACTION_STYLE[FactionId.CONSPIRATORS]
    },
    [FactionId.NOBLES]: {
        id: FactionId.NOBLES,
        nameKey: 'factions.nobles',
        descriptionKey: 'common:factionSelect.descriptions.nobles',
        colors: { primary: '#8b4040', secondary: '#2a1010', text: '#fca5a5' },
        style: FACTION_STYLE[FactionId.NOBLES]
    },
    [FactionId.NEUTRAL]: {
        id: FactionId.NEUTRAL,
        nameKey: 'factions.neutral',
        descriptionKey: '',
        colors: { primary: '#888888', secondary: '#444444', text: '#bbbbbb' },
        style: FACTION_STYLE[FactionId.NEUTRAL]
    }
};

import { LarionMapRules } from '../rules/LarionMapRules';

export const LarionDefinition: MapDefinition = {
    id: 'larion',
    nameKey: 'maps.larion',
    loreKey: 'common:factionSelect.lore',
    factions: [FactionId.NOBLES, FactionId.CONSPIRATORS, FactionId.REPUBLICANS],
    factionMetadata: LARION_METADATA,
    rules: new LarionMapRules()
};

export const LarionAlternateDefinition: MapDefinition = {
    id: 'larion_alternate',
    nameKey: 'maps.larion_alternate',
    loreKey: 'common:factionSelect.lore',
    factions: [FactionId.NOBLES, FactionId.CONSPIRATORS, FactionId.REPUBLICANS],
    factionMetadata: LARION_METADATA,
    rules: new LarionMapRules()
};
