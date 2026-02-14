"use strict";
/**
 * Socket Infrastructure - Main Export
 * Registers all socket event handlers from specialized modules
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCombatHandlers = exports.registerGameHandlers = exports.registerLobbyHandlers = void 0;
exports.registerSocketHandlers = registerSocketHandlers;
const lobbyHandlers_1 = require("./lobbyHandlers");
const gameHandlers_1 = require("./gameHandlers");
const combatHandlers_1 = require("./combatHandlers");
/**
 * Register all socket handlers for a new connection
 */
function registerSocketHandlers(io, socket, deps) {
    // Initialize socket data
    socket.data.odId = socket.id;
    socket.data.gameCode = null;
    socket.data.faction = null;
    // Register handlers from each domain (still using managers for now, can migrate to services incrementally)
    (0, lobbyHandlers_1.registerLobbyHandlers)(io, socket, deps.lobbyManager, deps.gameRoomManager);
    (0, gameHandlers_1.registerGameHandlers)(io, socket, deps.gameRoomManager);
    (0, combatHandlers_1.registerCombatHandlers)(io, socket, deps.gameRoomManager);
    // Disconnect handler
    socket.on('disconnect', (reason) => {
        console.log(`[Connection] Client disconnected: ${socket.id} (${reason})`);
        const lobby = deps.lobbyService.markDisconnected(socket.id);
        if (lobby) {
            io.to(lobby.code).emit('player_left', { odId: socket.id, lobby });
        }
    });
}
// Re-export individual handlers for testing
var lobbyHandlers_2 = require("./lobbyHandlers");
Object.defineProperty(exports, "registerLobbyHandlers", { enumerable: true, get: function () { return lobbyHandlers_2.registerLobbyHandlers; } });
var gameHandlers_2 = require("./gameHandlers");
Object.defineProperty(exports, "registerGameHandlers", { enumerable: true, get: function () { return gameHandlers_2.registerGameHandlers; } });
var combatHandlers_2 = require("./combatHandlers");
Object.defineProperty(exports, "registerCombatHandlers", { enumerable: true, get: function () { return combatHandlers_2.registerCombatHandlers; } });
