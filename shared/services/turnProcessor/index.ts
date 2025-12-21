// Turn Processor Module Index - Public exports

export * from './types';

// Logistics
export { processConvoys, processNavalConvoys } from './logistics';

// Famine
export { processFamine } from './famine';

// Stability
export {
    applyLeaderStabilityModifiers,
    applyLowTaxStabilityRecovery,
    applyHighTaxStabilityPenalty,
    processStability
} from './stability';

// Negotiations
export { processNegotiations } from './negotiations';

// AI Battle Resolution
export { resolveAIBattles, getPlayerBattles } from './aiBattleResolution';
