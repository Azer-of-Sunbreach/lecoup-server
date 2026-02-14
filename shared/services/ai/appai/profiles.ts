
import { FactionId, FACTION_NAMES } from '../../../types';
import { FactionPersonality } from './types';

export const AI_PROFILES: Record<FactionId, FactionPersonality> = {
    [FactionId.REPUBLICANS]: {
        name: FACTION_NAMES[FactionId.REPUBLICANS],
        aggressiveness: 0.3, // Lowered: They are weak initially
        defensiveness: 0.8, // Increased: Must hold Sunbreach
        subversiveness: 1.0, // Primary weapon
        expansionism: 0.9,
        riskTolerance: 0.7,
        preferredTargets: ['port_de_sable', 'northern_barony', 'esmarch_duchy', 'gullwing_duchy'],
        canUseGrainEmbargo: false,
        useFortifications: true,
    },
    [FactionId.CONSPIRATORS]: {
        name: FACTION_NAMES[FactionId.CONSPIRATORS],
        aggressiveness: 0.6, // Methodical: Aggressive when stable
        defensiveness: 0.7, // Still careful, but not passive turtles
        subversiveness: 0.6,
        expansionism: 0.9,
        riskTolerance: 0.5, // Calculated risks
        preferredTargets: ['sunbreach_lands', 'gullwing_duchy', 'thane_duchy'],
        canUseGrainEmbargo: true,
        useFortifications: true,
    },
    [FactionId.NOBLES]: {
        name: FACTION_NAMES[FactionId.NOBLES],
        aggressiveness: 0.9, // "Course contre la montre"
        defensiveness: 0.3, // Vulnerable rears
        subversiveness: 0.5, // INCREASED: Nobles use insurrections (Lys, Gullwing, Haraldic)
        expansionism: 0.4,
        riskTolerance: 0.6,
        preferredTargets: ['windward', 'great_plains', 'sunbreach_lands', 'hornvale_viscounty'],
        canUseGrainEmbargo: true,
        useFortifications: true,
    },
    [FactionId.NEUTRAL]: {
        name: FACTION_NAMES[FactionId.NEUTRAL],
        aggressiveness: 0,
        defensiveness: 1,
        subversiveness: 0,
        expansionism: 0,
        riskTolerance: 0,
        preferredTargets: [],
        canUseGrainEmbargo: false,
        useFortifications: false,
    },

    // Valis (placeholder)
    [FactionId.LOYALISTS]: {
        name: 'Loyalists',
        aggressiveness: 0.5, defensiveness: 0.6, subversiveness: 0.3,
        expansionism: 0.5, riskTolerance: 0.5, preferredTargets: [],
        canUseGrainEmbargo: false, useFortifications: true,
    },
    [FactionId.PRINCELY_ARMY]: {
        name: 'Princely Army',
        aggressiveness: 0.7, defensiveness: 0.4, subversiveness: 0.2,
        expansionism: 0.6, riskTolerance: 0.6, preferredTargets: [],
        canUseGrainEmbargo: false, useFortifications: true,
    },
    [FactionId.CONFEDERATE_CITIES]: {
        name: 'Confederate Cities',
        aggressiveness: 0.4, defensiveness: 0.7, subversiveness: 0.5,
        expansionism: 0.5, riskTolerance: 0.4, preferredTargets: [],
        canUseGrainEmbargo: false, useFortifications: true,
    },

    // Thyrakat Tutorial
    [FactionId.LARION_KNIGHTS]: {
        name: FACTION_NAMES[FactionId.LARION_KNIGHTS],
        aggressiveness: 0.5,
        defensiveness: 0.7,
        subversiveness: 0.2,
        expansionism: 0.6,
        riskTolerance: 0.5,
        preferredTargets: [],
        canUseGrainEmbargo: false,
        useFortifications: true,
    },
    [FactionId.THYRAKAT_SULTANATE]: {
        name: FACTION_NAMES[FactionId.THYRAKAT_SULTANATE],
        aggressiveness: 0.7,
        defensiveness: 0.5,
        subversiveness: 0.3,
        expansionism: 0.7,
        riskTolerance: 0.6,
        preferredTargets: [],
        canUseGrainEmbargo: false,
        useFortifications: true,
    },

    // Thyrakat main factions
    [FactionId.LINEAGES_COUNCIL]: {
        name: FACTION_NAMES[FactionId.LINEAGES_COUNCIL],
        aggressiveness: 0.4,
        defensiveness: 0.7,
        subversiveness: 0.6,
        expansionism: 0.8,
        riskTolerance: 0.5,
        preferredTargets: ['saphir', 'endless_rivages'],
        canUseGrainEmbargo: false,
        useFortifications: true,
    },
    [FactionId.OATH_COALITION]: {
        name: FACTION_NAMES[FactionId.OATH_COALITION],
        aggressiveness: 0.8,
        defensiveness: 0.5,
        subversiveness: 0.4,
        expansionism: 0.8,
        riskTolerance: 0.8,
        preferredTargets: ['harabour', 'grenecoste_protectorate'],
        canUseGrainEmbargo: false,
        useFortifications: true,
    },
    [FactionId.LARION_EXPEDITION]: {
        name: FACTION_NAMES[FactionId.LARION_EXPEDITION],
        aggressiveness: 0.7,
        defensiveness: 0.5,
        subversiveness: 0.7,
        expansionism: 0.8,
        riskTolerance: 0.8,
        preferredTargets: ['harabour', 'grenecoste_protectorate', 'endless_rivages', 'saphir'],
        canUseGrainEmbargo: false,
        useFortifications: true,
    }
};
