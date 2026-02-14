import { MapDefinition } from '../types';
import { FactionId } from '../../types';
import { ThyrakatMapRules } from '../rules/ThyrakatMapRules';

/**
 * Thyrakat Map Definition
 * A new map with three factions for solo and multiplayer gameplay.
 * 
 * Factions:
 * - LINEAGES_COUNCIL (Council of Lineages): Purple theme
 * - OATH_COALITION (Coalition of the Oath): Ivory/white theme
 * - LARION_EXPEDITION (Larion's Expedition): Red theme
 */

// Thyrakat Faction Styles
const THYRAKAT_FACTION_STYLE = {
    [FactionId.LINEAGES_COUNCIL]: {
        // Purple theme (from Thyrakat Sultanate)
        bgGradient: 'linear-gradient(180deg, #3d1f4e 0%, #1e0f28 100%)',
        borderColor: '#7b3fa0',
        hoverBg: 'linear-gradient(180deg, #4d2860 0%, #281530 100%)',
        textColor: '#c084fc',
        wornOverlay: 'radial-gradient(ellipse at 70% 20%, rgba(0,0,0,0.3) 0%, transparent 45%), radial-gradient(ellipse at 30% 80%, rgba(0,0,0,0.2) 0%, transparent 50%)',
    },
    [FactionId.OATH_COALITION]: {
        // Ivory/White theme
        bgGradient: 'linear-gradient(180deg, #3a3830 0%, #252420 100%)',
        borderColor: '#c9c4b5',
        hoverBg: 'linear-gradient(180deg, #4a4840 0%, #353430 100%)',
        textColor: '#f5f0e5',
        wornOverlay: 'radial-gradient(ellipse at 40% 30%, rgba(255,255,255,0.08) 0%, transparent 50%), radial-gradient(ellipse at 60% 70%, rgba(0,0,0,0.2) 0%, transparent 40%)',
    },
    [FactionId.LARION_EXPEDITION]: {
        // Red theme (from Nobles)
        bgGradient: 'linear-gradient(180deg, #4a2020 0%, #2a1010 100%)',
        borderColor: '#8b4040',
        hoverBg: 'linear-gradient(180deg, #5a2828 0%, #3a1818 100%)',
        textColor: '#fca5a5',
        wornOverlay: 'radial-gradient(ellipse at 20% 30%, rgba(0,0,0,0.3) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(0,0,0,0.25) 0%, transparent 40%)',
    },
    [FactionId.NEUTRAL]: {
        bgGradient: '',
        borderColor: '',
        hoverBg: '',
        textColor: '',
        wornOverlay: '',
    }
};

const THYRAKAT_METADATA = {
    [FactionId.LINEAGES_COUNCIL]: {
        id: FactionId.LINEAGES_COUNCIL,
        nameKey: 'factions.thyrakat_lineages_council',
        descriptionKey: 'common:factionSelect.descriptions.thyrakat_lineages_council',
        colors: { primary: '#7b3fa0', secondary: '#1e0f28', text: '#c084fc' },
        style: THYRAKAT_FACTION_STYLE[FactionId.LINEAGES_COUNCIL]
    },
    [FactionId.OATH_COALITION]: {
        id: FactionId.OATH_COALITION,
        nameKey: 'factions.thyrakat_oath_coalition',
        descriptionKey: 'common:factionSelect.descriptions.thyrakat_oath_coalition',
        colors: { primary: '#c9c4b5', secondary: '#252420', text: '#f5f0e5' },
        style: THYRAKAT_FACTION_STYLE[FactionId.OATH_COALITION]
    },
    [FactionId.LARION_EXPEDITION]: {
        id: FactionId.LARION_EXPEDITION,
        nameKey: 'factions.thyrakat_larion_expedition',
        descriptionKey: 'common:factionSelect.descriptions.thyrakat_larion_expedition',
        colors: { primary: '#8b4040', secondary: '#2a1010', text: '#fca5a5' },
        style: THYRAKAT_FACTION_STYLE[FactionId.LARION_EXPEDITION]
    },
    [FactionId.NEUTRAL]: {
        id: FactionId.NEUTRAL,
        nameKey: 'factions.neutral',
        descriptionKey: '',
        colors: { primary: '#888888', secondary: '#444444', text: '#bbbbbb' },
        style: THYRAKAT_FACTION_STYLE[FactionId.NEUTRAL]
    }
};

export const ThyrakatDefinition: MapDefinition = {
    id: 'thyrakat',
    nameKey: 'maps.thyrakat',
    loreKey: 'common:factionSelect.thyrakatLore',
    factions: [FactionId.LINEAGES_COUNCIL, FactionId.OATH_COALITION, FactionId.LARION_EXPEDITION],
    factionMetadata: THYRAKAT_METADATA,
    rules: new ThyrakatMapRules(),
    uiConfig: {
        mapImageStr: '/assets/ThyrakatMap.jpg'
    }
};
