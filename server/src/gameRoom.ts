// Game Room - Manages a single multiplayer game session

import { FactionId, GameLobby, GameAction } from './types';

// Simplified game state for server - full game logic will be imported from shared code
// For now, we store the state as-is and broadcast changes
export interface GameRoom {
    code: string;
    gameState: any; // Will be CoreGameState from client
    turnOrder: FactionId[];
    currentTurnIndex: number;
    playerFactions: Map<string, FactionId>; // socketId -> faction
    aiFaction: FactionId | null;
    pendingCombat: PendingCombat | null;
}

export interface PendingCombat {
    combatState: any;
    attackerSocketId: string;
    defenderSocketId: string | null; // null if defender is AI
    attackerChoice: 'FIGHT' | 'RETREAT' | 'SIEGE' | null;
    defenderChoice: 'FIGHT' | 'RETREAT_CITY' | null;
    siegeCost?: number;
}

export class GameRoomManager {
    private rooms: Map<string, GameRoom> = new Map();

    createRoom(lobby: GameLobby, initialGameState: any): GameRoom {
        const playerFactions = new Map<string, FactionId>();
        const humanFactions: FactionId[] = [];

        for (const player of lobby.players) {
            if (player.faction) {
                playerFactions.set(player.odId, player.faction);
                humanFactions.push(player.faction);
            }
        }

        // Determine AI faction (if 2 players)
        let aiFaction: FactionId | null = null;
        if (lobby.maxPlayers === 2) {
            const allFactions = [FactionId.REPUBLICANS, FactionId.CONSPIRATORS, FactionId.NOBLES];
            aiFaction = allFactions.find(f => !humanFactions.includes(f)) || null;
        }

        // Calculate turn order: humans first (in faction order), then AI
        const factionOrder = [FactionId.REPUBLICANS, FactionId.CONSPIRATORS, FactionId.NOBLES];
        const humanTurnOrder = factionOrder.filter(f => humanFactions.includes(f));
        const turnOrder = aiFaction ? [...humanTurnOrder, aiFaction] : humanTurnOrder;

        const room: GameRoom = {
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

    getRoom(code: string): GameRoom | undefined {
        return this.rooms.get(code);
    }

    /**
     * Find gameCode for a socket ID by searching all rooms' playerFactions
     * This handles socket reconnection where socket.data.gameCode might be lost
     */
    getGameCodeForSocket(socketId: string): string | null {
        for (const [code, room] of this.rooms) {
            if (room.playerFactions.has(socketId)) {
                return code;
            }
        }
        return null;
    }

    getCurrentFaction(code: string): FactionId | undefined {
        const room = this.rooms.get(code);
        if (!room) return undefined;
        return room.turnOrder[room.currentTurnIndex];
    }

    isPlayerTurn(code: string, socketId: string): boolean {
        const room = this.rooms.get(code);
        if (!room) return false;

        // Use gameState.currentTurnFaction which is properly updated by advanceTurn
        const currentFaction = room.gameState.currentTurnFaction;
        const playerFaction = room.playerFactions.get(socketId);

        console.log(`[GameRoom] isPlayerTurn check: current=${currentFaction}, player=${playerFaction}, match=${playerFaction === currentFaction}`);
        return playerFaction === currentFaction;
    }

    getSocketForFaction(code: string, faction: FactionId): string | null {
        const room = this.rooms.get(code);
        if (!room) return null;

        for (const [socketId, f] of room.playerFactions) {
            if (f === faction) return socketId;
        }
        return null;
    }

    updateGameState(code: string, newState: any): void {
        const room = this.rooms.get(code);
        if (room) {
            room.gameState = newState;
        }
    }

    advanceTurn(code: string): { newFaction: FactionId; newTurnNumber: number; isAITurn: boolean } | null {
        const room = this.rooms.get(code);
        if (!room) return null;

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
    initiateCombat(code: string, combatState: any, attackerSocketId: string, defenderFaction: FactionId): PendingCombat | null {
        const room = this.rooms.get(code);
        if (!room) return null;

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

    setAttackerChoice(code: string, choice: 'FIGHT' | 'RETREAT' | 'SIEGE', siegeCost?: number): boolean {
        const room = this.rooms.get(code);
        if (!room || !room.pendingCombat) return false;

        room.pendingCombat.attackerChoice = choice;
        if (siegeCost !== undefined) room.pendingCombat.siegeCost = siegeCost;
        return true;
    }

    setDefenderChoice(code: string, choice: 'FIGHT' | 'RETREAT_CITY'): boolean {
        const room = this.rooms.get(code);
        if (!room || !room.pendingCombat) return false;

        room.pendingCombat.defenderChoice = choice;
        return true;
    }

    isCombatReady(code: string): boolean {
        const room = this.rooms.get(code);
        if (!room || !room.pendingCombat) return false;

        const combat = room.pendingCombat;

        // Combat is ready when:
        // 1. Attacker has chosen
        // 2. Either defender is AI OR defender has chosen
        if (!combat.attackerChoice) return false;
        if (combat.defenderSocketId === null) return true; // AI defender
        return combat.defenderChoice !== null;
    }

    clearCombat(code: string): void {
        const room = this.rooms.get(code);
        if (room) {
            room.pendingCombat = null;
        }
    }

    deleteRoom(code: string): void {
        this.rooms.delete(code);
        console.log(`[GameRoom] Deleted: ${code}`);
    }
}
