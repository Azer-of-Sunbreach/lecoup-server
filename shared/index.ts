/**
 * Le Coup - Shared Game Logic
 * This package contains all game logic shared between client (solo) and server (multiplayer)
 */

// Core Types
export * from './types';

// Constants
export * from './constants';

// Data (Locations, Roads, Characters, Initial State)
export * from './data';

// Services (Game Logic)
export * from './services/domain';
export * from './services/combat';
export * from './services/combatDetection';
export * from './services/turnProcessor';
// AI services not included in shared - kept client-side only

// Utilities
export * from './utils/economy';
export * from './utils/stateUtils';
