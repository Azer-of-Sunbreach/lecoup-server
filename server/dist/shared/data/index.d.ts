/**
 * Data Module - Central export for all game data
 */
export { BONUS_HUNTING_ONLY, BONUS_FISHING_HUNTING, RECRUIT_COST, RECRUIT_AMOUNT, MAX_RECRUITS_PER_TURN, COST_INCITE, INCITE_BASE_STABILITY_DAMAGE, INCITE_BASE_CHANCE, REQUISITION_AMOUNT, REQUISITION_STABILITY_PENALTY, FOOD_PER_SOLDIER, PORT_SEQUENCE, NAVAL_STAGE_DAYS, getNavalTravelTime, FORTIFICATION_LEVELS, INITIAL_PLAYER_RESOURCES, INITIAL_AI_RESOURCES, FORTIFY_COST, FORTIFY_DEFENSE_BONUS, APPEASE_POPULATION_COSTS, getAppeaseFoodCost, } from './gameConstants';
export { LARION_PORTS, LARION_NAVAL_TIMES, LARION_LARGE_PORTS, LARION_LARGE_NAVAL_TIMES, LARION_ALTERNATE_PORTS, LARION_ALTERNATE_NAVAL_TIMES, ALL_PORTS, isPort, ALL_NAVAL_TIMES, getNavalTravelTimeUnified, getPortsForMap, getNavalTimesForMap, getNavalTravelTimeForMap, } from './ports';
export type { MapId as PortMapId } from './ports';
export type { FortificationLevel } from './gameConstants';
export { INITIAL_LOCATIONS, INITIAL_GARRISONS } from './locations';
export { ROADS } from './roads';
export { CHARACTERS } from './characters';
export { createInitialState, generateInitialArmies, getInitialResources } from './initialState';
