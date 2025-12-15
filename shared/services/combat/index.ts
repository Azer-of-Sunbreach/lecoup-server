// Combat Module Index - Public exports for combat resolution

// Types
export * from './types';

// Helpers
export * from './helpers';

// Power Calculation
export { applySequentialLosses, calculateCombatStrength } from './powerCalculation';

// Retreat Logic
export { getRetreatPosition } from './retreatLogic';

// Leader Survival
export { processLeaderSurvival } from './leaderSurvival';

// Fight Resolution
export { resolveFight, type FightResult } from './fightResolver';

// Retreat Handling
export { handleAttackerRetreat, handleDefenderRetreatToCity, type RetreatResult } from './retreatHandler';

// Siege Handling
export { handleSiege, type SiegeResult } from './siegeHandler';

// AI Battle Cascade
export { resolveAIBattleCascade, getPlayerBattles, type CascadeResult } from './aiBattleCascade';
