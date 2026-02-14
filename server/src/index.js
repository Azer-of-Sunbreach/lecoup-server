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
// Socket.IO server with robust connection settings
const io = new socket_io_1.Server(httpServer, {
    cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] },
    // Increase timeouts for better stability on cloud hosting / proxies
    pingTimeout: 60000, // 60 seconds before considering connection dead
    pingInterval: 25000, // Ping every 25 seconds to keep connection alive
    // Allow both websocket and polling (polling as fallback)
    transports: ['websocket', 'polling'],
    // Allow upgrade from polling to websocket
    allowUpgrades: true,
    // Increase buffer size for large state updates
    maxHttpBufferSize: 1e6 // 1MB
});
// Initialize managers (data layer)
const lobbyManager = new lobbyManager_1.LobbyManager();
const gameRoomManager = new gameRoom_1.GameRoomManager();
// Initialize services (application layer)
const lobbyService = new application_1.LobbyService(lobbyManager, gameRoomManager);
const gameService = new application_1.GameService(gameRoomManager);
const combatService = new application_1.CombatService(gameRoomManager);
// Global error handlers to prevent server crashes
process.on('uncaughtException', (error) => {
    console.error('=== UNCAUGHT EXCEPTION ===');
    console.error('This would have crashed the server:');
    console.error(error);
    console.error('Stack:', error.stack);
    console.error('==========================');
    // Don't exit - try to keep server alive
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('=== UNHANDLED REJECTION ===');
    console.error('Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
    console.error('===========================');
    // Don't exit - try to keep server alive
});
// Memory usage logging - helps diagnose OOM kills
setInterval(() => {
    const used = process.memoryUsage();
    const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
    const rssMB = Math.round(used.rss / 1024 / 1024);
    // Only log if approaching limit (Render free = 512MB)
    if (rssMB > 200) {
        console.log(`[Memory] RSS: ${rssMB}MB | Heap: ${heapUsedMB}/${heapTotalMB}MB`);
    }
}, 60000); // Every 60 seconds
// Heartbeat to keep server alive and help diagnose unexpected shutdowns
setInterval(() => {
    console.log(`[Heartbeat] Server alive - ${new Date().toISOString()}`);
}, 5 * 60 * 1000); // Every 5 minutes
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
