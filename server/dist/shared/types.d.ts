export declare enum FactionId {
    REPUBLICANS = "REPUBLICANS",
    CONSPIRATORS = "CONSPIRATORS",
    NOBLES = "NOBLES",
    NEUTRAL = "NEUTRAL"
}
export declare enum RoadQuality {
    GOOD = "GOOD",
    MEDIOCRE = "MEDIOCRE",
    BAD = "BAD",
    LOCAL = "LOCAL"
}
export declare enum LocationType {
    CITY = "CITY",
    RURAL = "RURAL",
    ROAD_STAGE = "ROAD_STAGE"
}
export declare enum RuralCategory {
    FERTILE = "FERTILE",
    ORDINARY = "ORDINARY",
    INHOSPITABLE = "INHOSPITABLE"
}
export declare enum CharacterStatus {
    AVAILABLE = "AVAILABLE",
    ON_MISSION = "ON_MISSION",// Insurrection logic mostly
    MOVING = "MOVING",// Traveling alone or with army
    DEAD = "DEAD"
}
export type LeaderAbility = 'NONE' | 'MANAGER' | 'LEGENDARY' | 'FIREBRAND';
export interface Coordinates {
    x: number;
    y: number;
}
export type ManagementLevel = 'VERY_LOW' | 'LOW' | 'NORMAL' | 'HIGH' | 'VERY_HIGH';
export interface ConstructionProject {
    targetLevel: number;
    turnsRemaining: number;
    armyId: string;
    originalGoldCost: number;
    name: string;
}
export interface Location {
    id: string;
    name: string;
    type: 'CITY' | 'RURAL';
    linkedLocationId: string | null;
    faction: FactionId;
    population: number;
    goldIncome: number;
    foodIncome: number;
    foodStock: number;
    stability: number;
    defense: number;
    fortificationLevel: number;
    activeConstruction?: ConstructionProject;
    hasBeenSiegedThisTurn?: boolean;
    position: Coordinates;
    backgroundPosition?: Coordinates;
    ruralCategory?: RuralCategory;
    isCoastal?: boolean;
    taxLevel?: ManagementLevel;
    tradeTaxLevel?: ManagementLevel;
    foodCollectionLevel?: ManagementLevel;
    isGrainTradeActive?: boolean;
    actionsTaken?: {
        seizeGold: number;
        seizeFood: number;
        recruit: number;
        incite: number;
    };
}
export interface RoadStage {
    index: number;
    position: Coordinates;
    backgroundPosition?: Coordinates;
    fortificationLevel: number;
    naturalDefense?: number;
    faction: FactionId | null;
    hasFortifiedThisTurn?: boolean;
    hasBeenSiegedThisTurn?: boolean;
    activeConstruction?: ConstructionProject;
    name: string;
    flavorText: string;
}
export interface Road {
    id: string;
    from: string;
    to: string;
    quality: RoadQuality;
    stages: RoadStage[];
    travelTurns: number;
    curveControlPoints?: Coordinates[];
}
export interface SafePosition {
    type: 'LOCATION' | 'ROAD';
    id: string;
    stageIndex?: number;
}
export interface Army {
    id: string;
    faction: FactionId;
    locationType: 'LOCATION' | 'ROAD';
    locationId: string | null;
    roadId: string | null;
    stageIndex: number;
    direction: 'FORWARD' | 'BACKWARD';
    originLocationId: string;
    destinationId: string | null;
    turnsUntilArrival: number;
    previousStageIndex?: number;
    justMoved?: boolean;
    tripOriginId?: string;
    tripDestinationId?: string | null;
    startOfTurnPosition?: {
        type: 'LOCATION' | 'ROAD';
        id: string;
        stageIndex?: number;
    };
    foodSourceId: string;
    lastSafePosition: SafePosition;
    strength: number;
    isInsurgent: boolean;
    isGarrisoned?: boolean;
    isSpent?: boolean;
    isSieging?: boolean;
    action?: 'FORTIFY';
}
export interface Convoy {
    id: string;
    faction: FactionId;
    foodAmount: number;
    sourceCityId: string;
    destinationCityId: string;
    locationType: 'LOCATION' | 'ROAD';
    locationId: string | null;
    roadId: string | null;
    stageIndex: number;
    direction: 'FORWARD' | 'BACKWARD';
    lastSafePosition: SafePosition;
    isCaptured: boolean;
}
export interface NavalConvoy {
    id: string;
    faction: FactionId;
    foodAmount: number;
    sourceCityId: string;
    destinationCityId: string;
    daysRemaining: number;
}
export interface Character {
    id: string;
    name: string;
    title: string;
    faction: FactionId;
    description: string;
    status: CharacterStatus;
    locationId: string;
    destinationId: string | null;
    turnsUntilArrival: number;
    armyId: string | null;
    missionData?: {
        targetLocationId: string;
        goldSpent: number;
    };
    stats: {
        stabilityPerTurn: number;
        commandBonus: number;
        insurrectionValue: number;
        ability: LeaderAbility[];
    };
    bonuses: any;
}
export interface NegotiationMission {
    targetLocationId: string;
    factionId: FactionId;
    goldOffer: number;
    foodOffer: number;
    foodSourceCityIds: string[];
    turnsRemaining: number;
}
export interface CombatState {
    locationId?: string;
    roadId?: string;
    stageIndex?: number;
    attackerFaction: FactionId;
    defenderFaction: FactionId;
    attackers: Army[];
    defenders: Army[];
    defenseBonus: number;
    isInsurgentBattle: boolean;
}
export interface GameStats {
    deathToll: number;
}
export interface InsurrectionNotification {
    type: 'SUCCESS_AI' | 'SUCCESS_NEUTRAL' | 'FAILURE';
    faction: FactionId;
    targetName: string;
    leaderName?: string;
    loserFaction?: FactionId;
}
export interface FamineNotification {
    cityName: string;
    ruralName: string;
}
export interface SiegeNotification {
    targetName: string;
    attackerName: string;
}
export interface AITheater {
    id: number;
    locationIds: string[];
    borderLocationIds: string[];
    threatLevel: number;
    armyStrength: number;
    isContested: boolean;
}
export type MissionType = 'CAMPAIGN' | 'DEFEND' | 'PATROL' | 'REINFORCE' | 'INSURRECTION' | 'NEGOTIATE' | 'STABILIZE' | 'ROAD_DEFENSE';
export type MissionStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'FAILED';
export interface AIMission {
    id: string;
    type: MissionType;
    priority: number;
    status: MissionStatus;
    targetId: string;
    stage: string;
    assignedArmyIds: string[];
    data: any;
}
export interface AIGoal {
    type: 'CONQUER' | 'INSURRECTION' | 'DEFEND' | 'CONNECT_THEATERS' | 'STOCKPILE' | 'CONQUER_CITY' | 'CONQUER_RURAL' | 'DEFEND_VITAL';
    targetId?: string;
    priority: number;
    budgetReserved: number;
    assignedArmyIds?: string[];
}
export interface FactionAIState {
    theaters: AITheater[];
    goals: AIGoal[];
    missions: AIMission[];
    savings: number;
}
export interface GameState {
    turn: number;
    playerFaction: FactionId;
    currentPlayerFaction?: FactionId;
    locations: Location[];
    armies: Army[];
    convoys: Convoy[];
    navalConvoys: NavalConvoy[];
    roads: Road[];
    characters: Character[];
    resources: {
        [key in FactionId]: {
            gold: number;
        };
    };
    pendingNegotiations: NegotiationMission[];
    logs: string[];
    stats: GameStats;
    pendingCombatResponse?: CoreGameState['pendingCombatResponse'];
    aiState?: {
        [key in FactionId]?: FactionAIState;
    };
    selectedType: 'LOCATION' | 'ROAD_STAGE' | null;
    selectedId: string | null;
    selectedStageIndex: number | null;
    selectedLocationId: string | null;
    isProcessing: boolean;
    combatQueue: CombatState[];
    combatState: CombatState | null;
    showStartScreen: boolean;
    showLeadersModal: boolean;
    showStatsModal: boolean;
    showFactionModal: boolean;
    logsExpanded: boolean;
    grainTradeNotification: {
        type: 'EMBARGO' | 'RESTORED';
        factionName: string;
    } | null;
    insurrectionNotification: InsurrectionNotification | null;
    famineNotification: FamineNotification | null;
    siegeNotification: SiegeNotification | null;
    victory?: {
        winner: FactionId;
        message: string;
    };
    hasScannedBattles: boolean;
}
export declare const FACTION_COLORS: {
    REPUBLICANS: string;
    CONSPIRATORS: string;
    NOBLES: string;
    NEUTRAL: string;
};
export declare const FACTION_NAMES: {
    REPUBLICANS: string;
    CONSPIRATORS: string;
    NOBLES: string;
    NEUTRAL: string;
};
/**
 * Core Game State - Synchronizable across network
 * Contains only game logic state, no UI state
 */
export interface CoreGameState {
    gameId: string;
    turn: number;
    currentPlayerFaction: FactionId;
    turnOrder: FactionId[];
    playerFactions: FactionId[];
    aiFaction: FactionId | null;
    locations: Location[];
    armies: Army[];
    characters: Character[];
    roads: Road[];
    convoys: Convoy[];
    navalConvoys: NavalConvoy[];
    resources: {
        [key in FactionId]: {
            gold: number;
        };
    };
    pendingNegotiations: NegotiationMission[];
    combatState: CombatState | null;
    combatQueue: CombatState[];
    pendingCombatResponse?: {
        combatId: string;
        attackerChoice: 'FIGHT' | 'RETREAT' | 'SIEGE';
        attackerFaction: FactionId;
        defenderFaction: FactionId;
        awaitingDefenderChoice: boolean;
    };
    aiState?: {
        [key in FactionId]?: FactionAIState;
    };
    stats: GameStats;
    logs: string[];
    victory?: {
        winner: FactionId;
        message: string;
    };
}
/**
 * UI State - Local to each client, not synchronized
 */
export interface UIState {
    myFaction: FactionId;
    selectedType: 'LOCATION' | 'ROAD_STAGE' | null;
    selectedId: string | null;
    selectedStageIndex: number | null;
    selectedLocationId: string | null;
    isProcessing: boolean;
    showStartScreen: boolean;
    showLeadersModal: boolean;
    showStatsModal: boolean;
    showFactionModal: boolean;
    logsExpanded: boolean;
    grainTradeNotification: {
        type: 'EMBARGO' | 'RESTORED';
        factionName: string;
    } | null;
    insurrectionNotification: InsurrectionNotification | null;
    famineNotification: FamineNotification | null;
    siegeNotification: SiegeNotification | null;
    hasScannedBattles: boolean;
}
/** Player info in multiplayer lobby */
export interface PlayerInfo {
    odId: string;
    faction: FactionId | null;
    isHost: boolean;
    isReady: boolean;
    isConnected: boolean;
}
/** Game lobby for multiplayer */
export interface GameLobby {
    code: string;
    hostSocketId: string;
    maxPlayers: 2 | 3;
    players: PlayerInfo[];
    status: 'WAITING' | 'STARTING' | 'IN_PROGRESS' | 'FINISHED';
    createdAt: number;
}
/** Game actions that can be sent over network */
export type GameAction = {
    type: 'RECRUIT';
    locationId: string;
    faction: FactionId;
} | {
    type: 'MOVE_ARMY';
    armyId: string;
    destinationId: string;
    faction: FactionId;
} | {
    type: 'SPLIT_ARMY';
    armyId: string;
    amount: number;
    faction: FactionId;
} | {
    type: 'GARRISON';
    armyId: string;
    faction: FactionId;
} | {
    type: 'MERGE_REGIMENTS';
    locationId: string;
    faction: FactionId;
} | {
    type: 'FORTIFY';
    locationType: 'LOCATION' | 'ROAD_STAGE';
    id: string;
    stageIndex?: number;
    faction: FactionId;
} | {
    type: 'INCITE';
    locationId: string;
    characterId: string;
    gold: number;
    faction: FactionId;
} | {
    type: 'REQUISITION';
    locationId: string;
    resourceType: 'GOLD' | 'FOOD';
    faction: FactionId;
} | {
    type: 'NEGOTIATE';
    locationId: string;
    gold: number;
    food: number;
    foodSourceIds: string[];
    faction: FactionId;
} | {
    type: 'UPDATE_CITY_MANAGEMENT';
    locationId: string;
    updates: Partial<Location>;
    faction: FactionId;
} | {
    type: 'SEND_CONVOY';
    locationId: string;
    amount: number;
    destinationId: string;
    faction: FactionId;
} | {
    type: 'SEND_NAVAL_CONVOY';
    locationId: string;
    amount: number;
    destinationId: string;
    faction: FactionId;
} | {
    type: 'REVERSE_CONVOY';
    convoyId: string;
    faction: FactionId;
} | {
    type: 'ATTACH_LEADER';
    armyId: string;
    characterId: string;
    faction: FactionId;
} | {
    type: 'DETACH_LEADER';
    characterId: string;
    faction: FactionId;
} | {
    type: 'MOVE_LEADER';
    characterId: string;
    destinationId: string;
    faction: FactionId;
} | {
    type: 'RETREAT_ARMY';
    armyId: string;
    faction: FactionId;
} | {
    type: 'COMBAT_CHOICE';
    choice: 'FIGHT' | 'RETREAT' | 'RETREAT_CITY' | 'SIEGE';
    siegeCost?: number;
    faction: FactionId;
} | {
    type: 'END_TURN';
    faction: FactionId;
};
export type GameMode = 'SOLO' | 'MULTIPLAYER';
/** Combined state for backwards compatibility */
export interface CombinedGameState extends CoreGameState, UIState {
    mode: GameMode;
    playerFaction: FactionId;
}
