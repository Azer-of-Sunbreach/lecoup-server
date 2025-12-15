"use strict";
// Game Room - Manages a single multiplayer game session
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRoomManager = void 0;
const types_1 = require("./types");
class GameRoomManager {
    constructor() {
        this.rooms = new Map();
    }
    createRoom(lobby, initialGameState) {
        const playerFactions = new Map();
        const humanFactions = [];
        for (const player of lobby.players) {
            if (player.faction) {
                playerFactions.set(player.odId, player.faction);
                humanFactions.push(player.faction);
            }
        }
        // Determine AI faction (if 2 players)
        let aiFaction = null;
        if (lobby.maxPlayers === 2) {
            const allFactions = [types_1.FactionId.REPUBLICANS, types_1.FactionId.CONSPIRATORS, types_1.FactionId.NOBLES];
            aiFaction = allFactions.find(f => !humanFactions.includes(f)) || null;
        }
        // Calculate turn order: humans first (in faction order), then AI
        const factionOrder = [types_1.FactionId.REPUBLICANS, types_1.FactionId.CONSPIRATORS, types_1.FactionId.NOBLES];
        const humanTurnOrder = factionOrder.filter(f => humanFactions.includes(f));
        const turnOrder = aiFaction ? [...humanTurnOrder, aiFaction] : humanTurnOrder;
        const room = {
            code: lobby.code,
            gameState: initialGameState,
            turnOrder,
            currentTurnIndex: 0,
            playerFactions,
            aiFaction,
            pendingCombat: null
        };
        this.rooms.set(lobby.code, room);
        console.log(`[GameRoom] Created: ${lobby.code} with turn order: ${turnOrder.join(' -> ')}`);
        return room;
    }
    getRoom(code) {
        return this.rooms.get(code);
    }
    getCurrentFaction(code) {
        const room = this.rooms.get(code);
        if (!room)
            return undefined;
        return room.turnOrder[room.currentTurnIndex];
    }
    isPlayerTurn(code, socketId) {
        const room = this.rooms.get(code);
        if (!room)
            return false;
        const currentFaction = room.turnOrder[room.currentTurnIndex];
        const playerFaction = room.playerFactions.get(socketId);
        return playerFaction === currentFaction;
    }
    getSocketForFaction(code, faction) {
        const room = this.rooms.get(code);
        if (!room)
            return null;
        for (const [socketId, f] of room.playerFactions) {
            if (f === faction)
                return socketId;
        }
        return null;
    }
    updateGameState(code, newState) {
        const room = this.rooms.get(code);
        if (room) {
            room.gameState = newState;
        }
    }
    advanceTurn(code) {
        const room = this.rooms.get(code);
        if (!room)
            return null;
        room.currentTurnIndex = (room.currentTurnIndex + 1) % room.turnOrder.length;
        const newFaction = room.turnOrder[room.currentTurnIndex];
        // Increment turn number only when we complete a full round (back to first player)
        let turnNumber = room.gameState.turn;
        if (room.currentTurnIndex === 0) {
            turnNumber++;
            room.gameState.turn = turnNumber;
        }
        const isAITurn = newFaction === room.aiFaction;
        console.log(`[GameRoom] ${code}: Turn advanced to ${newFaction} (AI: ${isAITurn})`);
        return { newFaction, newTurnNumber: turnNumber, isAITurn };
    }
    // Combat handling
    initiateCombat(code, combatState, attackerSocketId, defenderFaction) {
        const room = this.rooms.get(code);
        if (!room)
            return null;
        const defenderSocketId = this.getSocketForFaction(code, defenderFaction);
        room.pendingCombat = {
            combatState,
            attackerSocketId,
            defenderSocketId, // null if AI defender
            attackerChoice: null,
            defenderChoice: null
        };
        return room.pendingCombat;
    }
    setAttackerChoice(code, choice) {
        const room = this.rooms.get(code);
        if (!room || !room.pendingCombat)
            return false;
        room.pendingCombat.attackerChoice = choice;
        return true;
    }
    setDefenderChoice(code, choice) {
        const room = this.rooms.get(code);
        if (!room || !room.pendingCombat)
            return false;
        room.pendingCombat.defenderChoice = choice;
        return true;
    }
    isCombatReady(code) {
        const room = this.rooms.get(code);
        if (!room || !room.pendingCombat)
            return false;
        const combat = room.pendingCombat;
        // Combat is ready when:
        // 1. Attacker has chosen
        // 2. Either defender is AI OR defender has chosen
        if (!combat.attackerChoice)
            return false;
        if (combat.defenderSocketId === null)
            return true; // AI defender
        return combat.defenderChoice !== null;
    }
    clearCombat(code) {
        const room = this.rooms.get(code);
        if (room) {
            room.pendingCombat = null;
        }
    }
    deleteRoom(code) {
        this.rooms.delete(code);
        console.log(`[GameRoom] Deleted: ${code}`);
    }
}
exports.GameRoomManager = GameRoomManager;
