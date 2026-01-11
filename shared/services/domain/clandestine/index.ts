/**
 * Clandestine Operations Module
 * 
 * Exports all clandestine action processing functions.
 */

export { processClandestineActions } from './clandestineProcessor';
export type { ClandestineProcessingResult } from './clandestineProcessor';
export { processUndermineAuthorities, shouldDisableUndermineAuthorities } from './undermineAuthorities';

// Alert Service
export {
    buildClandestineAlerts,
    addLeaderAlertEvent,
    clearPendingAlerts,
    clearFactionPendingAlerts,
    createInfiltrationEvent,
    createHuntNetworksEvent,
    createThresholdExceededEvent,
    createParanoidGovernorEvent,
    createCombinedParanoidHuntEvent
} from './clandestineAlertService';
export type { ClandestineAlert } from './clandestineAlertService';

// Detection Level Service (2026-01-10)
export {
    calculateDetectionThreshold,
    getBaseDetectionThreshold,
    calculateCaptureRisk,
    isThresholdExceeded,
    calculateTurnDetectionIncrease,
    applyOneTimeDetectionIncrease,
    applyTurnDetectionIncrease,
    getDetectionGaugeColor,
    getDetectionGaugeFill,
    shouldEffectsApply,
    markEffectsNotified,
    clearPendingDetectionEffects,
    shouldResetDetectionLevel,
    applyDetectionLevelReset
} from './detectionLevelService';
