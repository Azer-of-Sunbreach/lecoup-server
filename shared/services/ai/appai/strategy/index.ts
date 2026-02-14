// AI Strategy Module Index - Public exports

export * from './types';

// Theater analysis
export { analyzeTheaters } from './theaters';

// Mission generators
export { generateDefendMissions } from './defenseMissions';
export { generateCampaignMissions } from './campaignMissions';
export { generateDiplomacyMissions } from './diplomacyMissions';
export { generateRoadDefenseMissions } from './roadDefense';

// Insurrection defense (NEW - replaces legacy counterInsurrection.ts)
export {
    detectInsurrectionThreats,
    groupThreatsByPair,
    allocateGarrison,
    convertToAlerts,
    analyzeGarrisonDeficits,
    generateGarrisonMissions
} from './insurrectionDefense';
export type { InsurrectionThreat, InsurrectionAlert } from './insurrectionDefense';

// Legacy (DEPRECATED)
// export { generateCounterInsurrectionMissions } from './counterInsurrection';
