/**
 * AI Strategy Module
 * 
 * Shared AI strategic decision-making logic.
 * 
 * @module shared/services/ai/strategy
 */

export {
    detectInsurrectionThreats,
    convertToAlerts,
    getInsurrectionAlerts,
    getCurrentGarrison,
    analyzeGarrisonDeficits,
    groupThreatsByPair,
    allocateGarrison,
    dispatchEmergencyReinforcements
} from './insurrectionDefense';

export type {
    InsurrectionThreat,
    InsurrectionThreatType,
    InsurrectionAlert
} from './insurrectionDefense';
