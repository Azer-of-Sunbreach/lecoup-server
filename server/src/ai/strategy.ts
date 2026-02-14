// AI Strategy Module - Server exports (direct imports to avoid re-export chain issues)

export * from '../../../shared/services/ai/appai/strategy/types';

// Theater analysis
export { analyzeTheaters } from '../../../shared/services/ai/appai/strategy/theaters';

// Mission generators
export { generateDefendMissions } from '../../../shared/services/ai/appai/strategy/defenseMissions';
export { generateCampaignMissions } from '../../../shared/services/ai/appai/strategy/campaignMissions';
export { generateDiplomacyMissions } from '../../../shared/services/ai/appai/strategy/diplomacyMissions';
export { generateRoadDefenseMissions } from '../../../shared/services/ai/appai/strategy/roadDefense';

// Insurrection defense - Import directly from shared source
export {
    detectInsurrectionThreats,
    groupThreatsByPair,
    allocateGarrison,
    convertToAlerts,
    analyzeGarrisonDeficits,
    dispatchEmergencyReinforcements
} from '../../../shared/services/ai/strategy/insurrectionDefense';
export type { InsurrectionThreat, InsurrectionAlert } from '../../../shared/services/ai/strategy/insurrectionDefense';

// Garrison missions from appai wrapper
export { generateGarrisonMissions } from '../../../shared/services/ai/appai/strategy/insurrectionDefense';

// Main strategy functions
export { analyzeTheaters as analyzeTheatersMain, updateMissions } from '../../../shared/services/ai/appai/strategy';
