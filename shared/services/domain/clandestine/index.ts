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

// Immediate Grand Insurrection (PREEXISTING_CELLS ability)
export {
    executeImmediateGrandInsurrection,
    hasPreexistingCells,
    shouldExecuteImmediately
} from './executeImmediateGrandInsurrection';
export type { ImmediateGrandInsurrectionResult } from './executeImmediateGrandInsurrection';

// Update Leader Clandestine Actions (multiplayer support)
export { executeUpdateLeaderClandestineActions } from './updateLeaderClandestineActions';
export type { UpdateClandestineActionsResult } from './updateLeaderClandestineActions';
