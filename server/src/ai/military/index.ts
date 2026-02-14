// AI Military Module Index - Public exports

export * from './types';

// Garrison calculation
export { getMinGarrison } from './garrison';

// Movement and reinforcement
export { moveArmiesTo, pullReinforcements } from './movement';

// Mission handlers
export { handleCampaign } from './campaign';
export { handleDefense } from './defense';
export { handleRoadDefense } from './roadDefense';
export { handleIdleArmies } from './idleHandler';

