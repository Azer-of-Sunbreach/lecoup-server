"use strict";
/**
 * Le Coup - Multiplayer Server
 * Entry point - Clean Hexagonal Architecture
 */
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const lobbyManager_1 = require("./lobbyManager");
const gameRoom_1 = require("./gameRoom");
const application_1 = require("./application");
const socket_1 = require("./infrastructure/socket");
// Configuration
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
// Simple HTTP server with health check endpoint
const httpServer = (0, http_1.createServer)((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200);
        res.end('OK');
    }
    else {
        res.writeHead(404);
        res.end('Not found');
    }
});
// Socket.IO server
const io = new socket_io_1.Server(httpServer, {
    cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] }
});
// Initialize managers (data layer)
const lobbyManager = new lobbyManager_1.LobbyManager();
const gameRoomManager = new gameRoom_1.GameRoomManager();
// Initialize services (application layer)
const lobbyService = new application_1.LobbyService(lobbyManager, gameRoomManager);
const gameService = new application_1.GameService(gameRoomManager);
const combatService = new application_1.CombatService(gameRoomManager);
// Startup banner
console.log('=================================');
console.log('  Le Coup - Multiplayer Server   ');
console.log('  Clean Hexagonal Architecture   ');
console.log('=================================');
// Register socket handlers on new connections
io.on('connection', (socket) => {
    console.log(`[Connection] New client: ${socket.id}`);
    (0, socket_1.registerSocketHandlers)(io, socket, {
        lobbyManager,
        gameRoomManager,
        lobbyService,
        gameService,
        combatService
    });
});
// Start server
httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`CORS enabled for: ${CLIENT_URL}`);
    console.log('');
    console.log('Ready for connections...');
});
