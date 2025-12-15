/**
 * Data Module - Central export for all game data
 */

// Game constants (pure values)
export {
    BONUS_HUNTING_ONLY,
    BONUS_FISHING_HUNTING,
    RECRUIT_COST,
    RECRUIT_AMOUNT,
    MAX_RECRUITS_PER_TURN,
    COST_INCITE,
    INCITE_BASE_STABILITY_DAMAGE,
    INCITE_BASE_CHANCE,
    REQUISITION_AMOUNT,
    REQUISITION_STABILITY_PENALTY,
    FOOD_PER_SOLDIER,
    PORT_SEQUENCE,
    NAVAL_STAGE_DAYS,
    getNavalTravelTime,
    FORTIFICATION_LEVELS,
    INITIAL_PLAYER_RESOURCES,
    INITIAL_AI_RESOURCES,
    FORTIFY_COST,
    FORTIFY_DEFENSE_BONUS,
} from './gameConstants';

export type { FortificationLevel } from './gameConstants';

// Initial data
export { INITIAL_LOCATIONS, INITIAL_GARRISONS } from './locations';
export { ROADS } from './roads';
export { CHARACTERS } from './characters';

// State factories
export { createInitialState, generateInitialArmies, getInitialResources } from './initialState';
