"use strict";
/**
 * Le Coup - Shared Game Logic
 * This package contains all game logic shared between client (solo) and server (multiplayer)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// Core Types
__exportStar(require("./types"), exports);
// Constants
__exportStar(require("./constants"), exports);
// Data (Locations, Roads, Characters, Initial State)
__exportStar(require("./data"), exports);
// Services (Game Logic)
__exportStar(require("./services/domain"), exports);
__exportStar(require("./services/combat"), exports);
__exportStar(require("./services/combatDetection"), exports);
__exportStar(require("./services/turnProcessor"), exports);
// AI services not included in shared - kept client-side only
// Utilities
__exportStar(require("./utils/economy"), exports);
__exportStar(require("./utils/stateUtils"), exports);
