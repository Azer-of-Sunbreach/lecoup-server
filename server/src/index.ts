/**
 * Le Coup - Multiplayer Server
 * Entry point - Clean Hexagonal Architecture
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Server } from 'socket.io';
import {
    ServerToClientEvents,
    ClientToServerEvents,
    InterServerEvents,
    SocketData
} from './types';
import { LobbyManager } from './lobbyManager';
import { GameRoomManager } from './gameRoom';
import { LobbyService, GameService, CombatService } from './application';
import { registerSocketHandlers } from './infrastructure/socket';

// Configuration
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Simple HTTP server with health check endpoint
const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.url === '/health') {
        res.writeHead(200);
        res.end('OK');
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

// Socket.IO server
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] }
});

// Initialize managers (data layer)
const lobbyManager = new LobbyManager();
const gameRoomManager = new GameRoomManager();

// Initialize services (application layer)
const lobbyService = new LobbyService(lobbyManager, gameRoomManager);
const gameService = new GameService(gameRoomManager);
const combatService = new CombatService(gameRoomManager);

// Startup banner
console.log('=================================');
console.log('  Le Coup - Multiplayer Server   ');
console.log('  Clean Hexagonal Architecture   ');
console.log('=================================');

// Register socket handlers on new connections
io.on('connection', (socket) => {
    console.log(`[Connection] New client: ${socket.id}`);
    registerSocketHandlers(io, socket, {
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
