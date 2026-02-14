// Shared Types - Used by both client and server
// These mirror the types in Application/types.ts but are standalone for the server

export enum FactionId {
    REPUBLICANS = 'REPUBLICANS',
    CONSPIRATORS = 'CONSPIRATORS',
    NOBLES = 'NOBLES',
    NEUTRAL = 'NEUTRAL',

    // Valis Factions (Future support)
    LOYALISTS = 'LOYALISTS',
    PRINCELY_ARMY = 'PRINCELY_ARMY',
    CONFEDERATE_CITIES = 'CONFEDERATE_CITIES',

    // Thyrakat Tutorial Factions
    LARION_KNIGHTS = 'LARION_KNIGHTS',
    THYRAKAT_SULTANATE = 'THYRAKAT_SULTANATE',

    // Thyrakat Factions
    LINEAGES_COUNCIL = 'LINEAGES_COUNCIL',
    OATH_COALITION = 'OATH_COALITION',
    LARION_EXPEDITION = 'LARION_EXPEDITION'
}

export interface PlayerInfo {
    odId: string;
    faction: FactionId | null;
    isHost: boolean;
    isReady: boolean;
    isConnected: boolean;
    nickname?: string;
}

export interface GameLobby {
    code: string;
    hostSocketId: string;
    maxPlayers: 2 | 3;
    players: PlayerInfo[];
    status: 'WAITING' | 'STARTING' | 'IN_PROGRESS' | 'FINISHED';
    createdAt: number;
}

// Socket.IO Event Types
export interface ServerToClientEvents {
    // Lobby events
    game_created: (data: { code: string; lobby: GameLobby }) => void;
    player_joined: (data: { player: PlayerInfo; lobby: GameLobby }) => void;
    player_left: (data: { odId: string; lobby: GameLobby }) => void;
    faction_selected: (data: { odId: string; faction: FactionId; lobby: GameLobby }) => void;
    player_ready: (data: { odId: string; isReady: boolean; lobby: GameLobby }) => void;
    game_starting: (data: { lobby: GameLobby }) => void;

    // Game events
    game_started: (data: { gameState: any; turnOrder: FactionId[] }) => void;
    state_update: (data: { gameState: any }) => void;
    turn_changed: (data: { currentFaction: FactionId; turnNumber: number }) => void;
    action_result: (data: { success: boolean; error?: string; gameState?: any }) => void;

    // Combat events
    combat_initiated: (data: { combatState: any }) => void;
    combat_choice_requested: (data: { combatState: any; role: 'ATTACKER' | 'DEFENDER' }) => void;
    combat_resolved: (data: { result: any; gameState: any }) => void;

    // Connection events
    error: (data: { message: string; code?: string }) => void;
    reconnected: (data: { lobby: GameLobby; gameState?: any }) => void;
}

export interface ClientToServerEvents {
    // Lobby events
    create_game: (data: { maxPlayers: 2 | 3; nickname?: string }) => void;
    join_game: (data: { code: string; nickname?: string }) => void;
    leave_game: () => void;
    select_faction: (data: { faction: FactionId }) => void;
    set_ready: (data: { isReady: boolean }) => void;
    start_game: () => void;

    // Game events
    player_action: (data: { action: GameAction }) => void;
    end_turn: () => void;

    // Combat events
    combat_choice: (data: { choice: 'FIGHT' | 'RETREAT' | 'RETREAT_CITY' | 'SIEGE'; siegeCost?: number }) => void;
}

// Game Actions (simplified for server - full state is managed separately)
export type GameAction =
    | { type: 'RECRUIT'; locationId: string }
    | { type: 'MOVE_ARMY'; armyId: string; destinationId: string }
    | { type: 'SPLIT_ARMY'; armyId: string; amount: number }
    | { type: 'GARRISON'; armyId: string }
    | { type: 'MERGE_REGIMENTS'; locationId: string }
    | { type: 'FORTIFY'; locationType: 'LOCATION' | 'ROAD_STAGE'; id: string; stageIndex?: number }
    | { type: 'INCITE'; locationId: string; characterId: string; gold: number }
    | { type: 'REQUISITION'; locationId: string; resourceType: 'GOLD' | 'FOOD' }
    | { type: 'SEND_CONVOY'; locationId: string; amount: number; destinationId: string }
    | { type: 'SEND_NAVAL_CONVOY'; locationId: string; amount: number; destinationId: string }
    | { type: 'REVERSE_CONVOY'; convoyId: string }
    | { type: 'ATTACH_LEADER'; armyId: string; characterId: string }
    | { type: 'DETACH_LEADER'; characterId: string }
    | { type: 'MOVE_LEADER'; characterId: string; destinationId: string }
    | { type: 'RETREAT_ARMY'; armyId: string }
    | { type: 'UPDATE_CITY_MANAGEMENT'; locationId: string; updates: any };

export interface InterServerEvents {
    ping: () => void;
}

export interface SocketData {
    odId: string;
    gameCode: string | null;
    faction: FactionId | null;
}
