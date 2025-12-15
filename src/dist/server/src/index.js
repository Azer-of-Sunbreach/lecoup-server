"use strict";
// Le Coup Multiplayer Server
// Main entry point
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const types_1 = require("./types");
const lobbyManager_1 = require("./lobbyManager");
const gameRoom_1 = require("./gameRoom");
const gameLogic_1 = require("./gameLogic");
const PORT = process.env.PORT || 3001;
// Create HTTP server
const httpServer = (0, http_1.createServer)();
// Create Socket.IO server with CORS configuration
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    }
});
// Initialize managers
const lobbyManager = new lobbyManager_1.LobbyManager();
const gameRoomManager = new gameRoom_1.GameRoomManager();
console.log('=================================');
console.log('  Le Coup - Multiplayer Server   ');
console.log('=================================');
io.on('connection', (socket) => {
    console.log(`[Connection] New client: ${socket.id}`);
    // Initialize socket data
    socket.data.odId = socket.id;
    socket.data.gameCode = null;
    socket.data.faction = null;
    // ==================
    // LOBBY EVENTS
    // ==================
    socket.on('create_game', ({ maxPlayers, nickname }) => {
        const lobby = lobbyManager.createLobby(socket.id, maxPlayers, nickname);
        socket.data.gameCode = lobby.code;
        socket.join(lobby.code);
        socket.emit('game_created', { code: lobby.code, lobby });
    });
    socket.on('join_game', ({ code, nickname }) => {
        const result = lobbyManager.joinLobby(code, socket.id, nickname);
        if (!result.success || !result.lobby) {
            socket.emit('error', { message: result.error || 'Failed to join game' });
            return;
        }
        socket.data.gameCode = result.lobby.code;
        socket.join(result.lobby.code);
        // Notify all players in the lobby
        io.to(result.lobby.code).emit('player_joined', {
            player: result.lobby.players.find(p => p.odId === socket.id),
            lobby: result.lobby
        });
    });
    socket.on('leave_game', () => {
        const { lobby, wasHost } = lobbyManager.leaveLobby(socket.id);
        const code = socket.data.gameCode;
        if (code) {
            socket.leave(code);
            socket.data.gameCode = null;
            socket.data.faction = null;
            if (wasHost) {
                // Notify all players that the game was closed
                io.to(code).emit('error', { message: 'Host left the game', code: 'HOST_LEFT' });
            }
            else if (lobby) {
                io.to(code).emit('player_left', { odId: socket.id, lobby });
            }
        }
    });
    socket.on('select_faction', ({ faction }) => {
        const result = lobbyManager.selectFaction(socket.id, faction);
        if (!result.success || !result.lobby) {
            socket.emit('error', { message: result.error || 'Failed to select faction' });
            return;
        }
        socket.data.faction = faction;
        io.to(result.lobby.code).emit('faction_selected', {
            odId: socket.id,
            faction,
            lobby: result.lobby
        });
    });
    socket.on('set_ready', ({ isReady }) => {
        const result = lobbyManager.setPlayerReady(socket.id, isReady);
        if (!result.success || !result.lobby) {
            socket.emit('error', { message: result.error || 'Failed to set ready' });
            return;
        }
        io.to(result.lobby.code).emit('player_ready', {
            odId: socket.id,
            isReady,
            lobby: result.lobby
        });
    });
    socket.on('start_game', () => {
        const lobby = lobbyManager.getPlayerLobby(socket.id);
        if (!lobby) {
            socket.emit('error', { message: 'Not in a game' });
            return;
        }
        // Only host can start
        if (lobby.hostSocketId !== socket.id) {
            socket.emit('error', { message: 'Only the host can start the game' });
            return;
        }
        const startResult = lobbyManager.startGame(lobby.code);
        if (!startResult.success) {
            socket.emit('error', { message: startResult.error || 'Cannot start game' });
            return;
        }
        // Notify all players that game is starting
        io.to(lobby.code).emit('game_starting', { lobby: startResult.lobby });
        // Determine human and AI factions
        const humanFactions = startResult.lobby.players
            .map(p => p.faction)
            .filter((f) => f !== null);
        let aiFaction = null;
        if (startResult.lobby.maxPlayers === 2) {
            const allFactions = [types_1.FactionId.REPUBLICANS, types_1.FactionId.CONSPIRATORS, types_1.FactionId.NOBLES];
            aiFaction = allFactions.find(f => !humanFactions.includes(f)) || null;
        }
        // Create REAL server-side game state using shared logic
        const serverGameState = (0, gameLogic_1.createMultiplayerGameState)(humanFactions, aiFaction);
        // Create game room with the proper state
        const room = gameRoomManager.createRoom(startResult.lobby, serverGameState);
        lobbyManager.setGameInProgress(lobby.code);
        // Notify all players that game has started with the full state
        io.to(lobby.code).emit('game_started', {
            gameState: (0, gameLogic_1.getClientState)(serverGameState),
            turnOrder: room.turnOrder
        });
        console.log(`[Game] Started: ${lobby.code} with factions: humans=${humanFactions}, AI=${aiFaction}`);
    });
    // ==================
    // GAME EVENTS
    // ==================
    socket.on('player_action', ({ action }) => {
        const code = socket.data.gameCode;
        if (!code) {
            socket.emit('error', { message: 'Not in a game' });
            return;
        }
        const room = gameRoomManager.getRoom(code);
        if (!room) {
            socket.emit('error', { message: 'Game room not found' });
            return;
        }
        // Get player's faction
        const playerFaction = room.playerFactions.get(socket.id);
        if (!playerFaction) {
            socket.emit('action_result', { success: false, error: 'Player faction not found' });
            return;
        }
        // Process action on server using shared game logic
        console.log(`[Game] ${code}: Processing ${action.type} from ${playerFaction}`);
        const sharedAction = { ...action, faction: playerFaction }; // Add faction for shared type
        const result = (0, gameLogic_1.processPlayerAction)(room.gameState, sharedAction, playerFaction);
        if (!result.success) {
            socket.emit('action_result', { success: false, error: result.error });
            return;
        }
        // Update server state
        room.gameState = result.newState;
        // Broadcast updated state to ALL players
        const clientState = (0, gameLogic_1.getClientState)(result.newState);
        io.to(code).emit('state_update', { gameState: clientState });
        socket.emit('action_result', { success: true });
        console.log(`[Game] ${code}: Action ${action.type} processed successfully`);
    });
    socket.on('end_turn', () => {
        const code = socket.data.gameCode;
        if (!code) {
            socket.emit('error', { message: 'Not in a game' });
            return;
        }
        if (!gameRoomManager.isPlayerTurn(code, socket.id)) {
            socket.emit('error', { message: 'Not your turn' });
            return;
        }
        const turnResult = gameRoomManager.advanceTurn(code);
        if (!turnResult) {
            socket.emit('error', { message: 'Failed to advance turn' });
            return;
        }
        // Notify all players of turn change
        io.to(code).emit('turn_changed', {
            currentFaction: turnResult.newFaction,
            turnNumber: turnResult.newTurnNumber
        });
        // If it's AI turn, we'll need to trigger AI processing
        // For now, AI processing happens client-side on the host
        if (turnResult.isAITurn) {
            console.log(`[Game] ${code}: AI turn for ${turnResult.newFaction}`);
            // The host client will process the AI turn and send updates
        }
    });
    // ==================
    // COMBAT EVENTS
    // ==================
    socket.on('combat_choice', ({ choice, siegeCost }) => {
        const code = socket.data.gameCode;
        if (!code) {
            socket.emit('error', { message: 'Not in a game' });
            return;
        }
        const room = gameRoomManager.getRoom(code);
        if (!room || !room.pendingCombat) {
            socket.emit('error', { message: 'No pending combat' });
            return;
        }
        const combat = room.pendingCombat;
        // Determine if this is attacker or defender choice
        if (socket.id === combat.attackerSocketId) {
            if (choice === 'FIGHT' || choice === 'RETREAT' || choice === 'SIEGE') {
                gameRoomManager.setAttackerChoice(code, choice);
                // If defender is human, request their choice
                if (combat.defenderSocketId) {
                    io.to(combat.defenderSocketId).emit('combat_choice_requested', {
                        combatState: combat.combatState,
                        role: 'DEFENDER'
                    });
                }
            }
        }
        else if (socket.id === combat.defenderSocketId) {
            if (choice === 'FIGHT' || choice === 'RETREAT_CITY') {
                gameRoomManager.setDefenderChoice(code, choice);
            }
        }
        // Check if combat is ready to resolve
        if (gameRoomManager.isCombatReady(code)) {
            // Combat resolution happens client-side for now
            // The host will send the resolved state
            io.to(code).emit('combat_resolved', {
                result: room.pendingCombat,
                gameState: room.gameState
            });
            gameRoomManager.clearCombat(code);
        }
    });
    // ==================
    // DISCONNECT
    // ==================
    socket.on('disconnect', (reason) => {
        console.log(`[Connection] Client disconnected: ${socket.id} (${reason})`);
        const lobby = lobbyManager.markPlayerDisconnected(socket.id);
        if (lobby) {
            io.to(lobby.code).emit('player_left', { odId: socket.id, lobby });
        }
    });
});
// Start server - bind to 0.0.0.0 for Render compatibility
httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`CORS enabled for: ${process.env.CLIENT_URL || "http://localhost:5173"}`);
    console.log('');
    console.log('Ready for connections...');
});
