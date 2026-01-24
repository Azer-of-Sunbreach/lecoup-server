/**
 * Clandestine Operations Module
 *
 * Exports all clandestine action processing functions.
 */
export { processClandestineActions } from './clandestineProcessor';
export type { ClandestineProcessingResult } from './clandestineProcessor';
export { processUndermineAuthorities, shouldDisableUndermineAuthorities } from './undermineAuthorities';
export { buildClandestineAlerts, addLeaderAlertEvent, clearPendingAlerts, clearFactionPendingAlerts, createInfiltrationEvent, createHuntNetworksEvent, createThresholdExceededEvent, createParanoidGovernorEvent, createCombinedParanoidHuntEvent } from './clandestineAlertService';
export type { ClandestineAlert } from './clandestineAlertService';
export { calculateDetectionThreshold, getBaseDetectionThreshold, calculateCaptureRisk, isThresholdExceeded, calculateTurnDetectionIncrease, applyOneTimeDetectionIncrease, applyTurnDetectionIncrease, getDetectionGaugeColor, getDetectionGaugeFill, shouldEffectsApply, markEffectsNotified, clearPendingDetectionEffects, shouldResetDetectionLevel, applyDetectionLevelReset } from './detectionLevelService';
