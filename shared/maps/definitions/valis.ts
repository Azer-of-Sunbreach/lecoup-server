import { MapDefinition } from '../types';
import { FactionId } from '../../types';

// Valis Faction Styles
// Loyalists: Royal Purple
// Princely Army: Black/Dark Gray
// Confederate Cities: Red-Orange

const VALIS_FACTION_STYLE = {
    [FactionId.LOYALISTS]: {
        // Royal Purple theme
        bgGradient: 'linear-gradient(180deg, #4a1540 0%, #2a0a20 100%)',
        borderColor: '#9d408b',
        hoverBg: 'linear-gradient(180deg, #5e2050 0%, #3a1030 100%)',
        textColor: '#e8a5ff',
        wornOverlay: 'radial-gradient(ellipse at 30% 20%, rgba(200, 100, 255, 0.1) 0%, transparent 50%)',
    },
    [FactionId.PRINCELY_ARMY]: {
        // Black/Dark Gray theme (Iron/Steel)
        bgGradient: 'linear-gradient(180deg, #2a2a2a 0%, #050505 100%)',
        borderColor: '#5a5a5a',
        hoverBg: 'linear-gradient(180deg, #3a3a3a 0%, #151515 100%)',
        textColor: '#d4d4d4',
        wornOverlay: 'radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.05) 0%, transparent 60%)',
    },
    [FactionId.CONFEDERATE_CITIES]: {
        // Red-Orange theme (Fire/Rust)
        bgGradient: 'linear-gradient(180deg, #5a200a 0%, #301005 100%)',
        borderColor: '#c05020',
        hoverBg: 'linear-gradient(180deg, #703010 0%, #451508 100%)',
        textColor: '#ffb590',
        wornOverlay: 'radial-gradient(ellipse at 60% 30%, rgba(255, 100, 50, 0.15) 0%, transparent 45%)',
    },
    [FactionId.NEUTRAL]: {
        bgGradient: '', // Not playable usually
        borderColor: '',
        hoverBg: '',
        textColor: '',
        wornOverlay: '',
    }
};

const VALIS_METADATA = {
    [FactionId.LOYALISTS]: {
        id: FactionId.LOYALISTS,
        nameKey: 'factions.valis_loyalists',
        descriptionKey: 'common:factionSelect.descriptions.valis_loyalists',
        colors: { primary: '#9d408b', secondary: '#2a0a20', text: '#e8a5ff' },
        style: VALIS_FACTION_STYLE[FactionId.LOYALISTS]
    },
    [FactionId.PRINCELY_ARMY]: {
        id: FactionId.PRINCELY_ARMY,
        nameKey: 'factions.valis_princely_army',
        descriptionKey: 'common:factionSelect.descriptions.valis_princely_army',
        colors: { primary: '#5a5a5a', secondary: '#050505', text: '#d4d4d4' },
        style: VALIS_FACTION_STYLE[FactionId.PRINCELY_ARMY]
    },
    [FactionId.CONFEDERATE_CITIES]: {
        id: FactionId.CONFEDERATE_CITIES,
        nameKey: 'factions.valis_confederate_cities',
        descriptionKey: 'common:factionSelect.descriptions.valis_confederate_cities',
        colors: { primary: '#c05020', secondary: '#301005', text: '#ffb590' },
        style: VALIS_FACTION_STYLE[FactionId.CONFEDERATE_CITIES]
    },
    [FactionId.NEUTRAL]: {
        id: FactionId.NEUTRAL,
        nameKey: 'factions.neutral',
        descriptionKey: '',
        colors: { primary: '#888888', secondary: '#444444', text: '#bbbbbb' },
        style: VALIS_FACTION_STYLE[FactionId.NEUTRAL]
    }
};

import { ValisMapRules } from '../rules/ValisMapRules';

export const ValisDefinition: MapDefinition = {
    id: 'valis',
    nameKey: 'maps.valis',
    loreKey: 'common:factionSelect.valisLore',
    factions: [FactionId.LOYALISTS, FactionId.PRINCELY_ARMY, FactionId.CONFEDERATE_CITIES],
    factionMetadata: VALIS_METADATA,
    rules: new ValisMapRules(),
    uiConfig: {
        mapImageStr: '/assets/Valismap.jpg'
    }
};
