export * from './types/governorTypes';
export declare enum FactionId {
    REPUBLICANS = "REPUBLICANS",
    CONSPIRATORS = "CONSPIRATORS",
    NOBLES = "NOBLES",
    LOYALISTS = "LOYALISTS",
    PRINCELY_ARMY = "PRINCELY_ARMY",
    CONFEDERATE_CITIES = "CONFEDERATE_CITIES",
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
    UNDERCOVER = "UNDERCOVER",// Leader on undercover mission in enemy territory
    GOVERNING = "GOVERNING",// Leader serving as governor in a controlled region
    DEAD = "DEAD"
}
export declare enum LogSeverity {
    INFO = "INFO",
    WARNING = "WARNING",
    CRITICAL = "CRITICAL",
    GOOD = "GOOD"
}
export declare enum LogType {
    TURN_MARKER = "TURN_MARKER",
    GAME_START = "GAME_START",
    MOVEMENT = "MOVEMENT",
    CAPTURE = "CAPTURE",
    CONVOY = "CONVOY",
    INSURRECTION = "INSURRECTION",
    NEGOTIATION = "NEGOTIATION",
    FAMINE = "FAMINE",
    COMBAT = "COMBAT",
    ECONOMY = "ECONOMY",
    COMMERCE = "COMMERCE",
    LEADER = "LEADER",
    NARRATIVE = "NARRATIVE",
    CLANDESTINE = "CLANDESTINE"
}
export interface LogHighlightTarget {
    type: 'LOCATION' | 'ARMY' | 'ROAD_STAGE';
    id: string;
    stageIndex?: number;
}
/**
 * Structured log entry with personalization and hover highlighting support.
 * Logs can be filtered by faction and have dynamic severity based on viewer.
 */
export interface LogEntry {
    id: string;
    type: LogType;
    message: string;
    turn: number;
    visibleToFactions: FactionId[];
    baseSeverity: LogSeverity;
    criticalForFactions?: FactionId[];
    warningForFactions?: FactionId[];
    highlightTarget?: LogHighlightTarget;
    i18nKey?: string;
    i18nParams?: Record<string, any>;
}
export type LeaderAbility = 'NONE' | 'MANAGER' | 'LEGENDARY' | 'FIREBRAND' | 'MAN_OF_CHURCH' | 'DAREDEVIL' | 'GHOST' | 'PARANOID' | 'SMUGGLER' | 'ELITE_NETWORKS' | 'CONSCRIPTION' | 'AGITATIONAL_NETWORKS';
export * from './types/leaderTypes';
import { GovernorPolicy } from './types/governorTypes';
export * from './types/governorTypes';
export * from './types/clandestineTypes';
export type RepublicanInternalFaction = 'KNIGHTLY_COUP' | 'RABBLE_VICTORY' | 'MERCHANT_DOMINATION' | null;
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
    previousFaction?: FactionId;
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
    governorPolicies?: Partial<Record<GovernorPolicy, boolean>>;
    neutralInsurrectionBlockedUntil?: number;
    neutralInsurrectionBlockedBy?: string;
    governorFoodCost?: number;
    burnedFields?: number;
    burnedDistricts?: number;
    grantedFief?: {
        grantedBy: FactionId;
    };
    demographics?: {
        nobles: number;
        wealthyCommoners: number;
        labouringFolks: number;
    };
    resentment?: Partial<Record<FactionId, number>>;
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
    path?: string[];
    pathIndex?: number;
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
        traits?: ('IRON_FIST' | 'FAINT_HEARTED' | 'SCORCHED_EARTH' | 'FREE_TRADER' | 'MAN_OF_ACTION')[];
        clandestineOps?: number;
        discretion?: number;
        statesmanship?: number;
    };
    bonuses: any;
    budget?: number;
    /** @alias budget - Preferred name for new AI leader system */
    clandestineBudget?: number;
    undercoverMission?: {
        destinationId: string;
        turnsRemaining: number;
        turnStarted?: number;
    };
    /** Active clandestine actions this leader is performing (if UNDERCOVER in enemy territory) */
    activeClandestineActions?: import('./types/clandestineTypes').ActiveClandestineAction[];
    /** Governor appointment mission - leader traveling to become governor */
    governorMission?: {
        destinationId: string;
        turnsRemaining: number;
    };
    /** Active governor policies when acting as governor */
    activeGovernorPolicies?: GovernorPolicy[];
    /** Assigned army ID when serving as commander - alias for armyId for semantic clarity */
    assignedArmyId?: string;
    /** True if leader has been eliminated - derived from status === DEAD */
    isDead?: boolean;
    /** True if leader was detected when arriving in enemy territory (for alert display) */
    isDetectedOnArrival?: boolean;
    /** Pending alert events for this leader (synchronized, displayed at turn start) */
    pendingAlertEvents?: import('./types/clandestineTypes').LeaderAlertEvent[];
    /** Stealth level 1-5 (Inept to Exceptional) - determines detection threshold */
    stealthLevel?: number;
    /** Current detection level (0 = undetected, increases with actions) */
    detectionLevel?: number;
    /** Flags for pending acknowledgment by player (for timing of PARANOID/HUNT effects) */
    pendingDetectionEffects?: {
        /** True if PARANOID governor effect is pending notification */
        paranoidGovernorNotified?: boolean;
        /** True if HUNT_NETWORKS effect is pending notification */
        huntNetworksNotified?: boolean;
        /** True if threshold exceeded notification was sent */
        thresholdExceededNotified?: boolean;
    };
    /**
     * Specific clandestine action intended for this mission.
     * Preserves intent during travel so agent executes the correct plan on arrival.
     */
    plannedMissionAction?: import('./types/clandestineTypes').ClandestineActionId;
    /** Last turn this leader was exfiltrated/moved. Prevents double-exfiltration exploit. */
    lastExfiltrationTurn?: number;
    /** Tracks if this leader has already provided a recruitment discount this turn */
    usedConscriptionThisTurn?: boolean;
    /** True if leader is on a SMUGGLER support mission (cumulative with GOVERNOR role) */
    isSmugglerMission?: boolean;
    /** Target city ID for active SMUGGLER mission */
    smugglerTargetCityId?: string;
    /** True if this leader is available for mid-game recruitment (stored as DEAD in graveyard until recruited) */
    isRecruitableLeader?: boolean;
    /** Abilities disabled by Internal Factions choice (runtime only, not in base data) */
    disabledAbilities?: LeaderAbility[];
    /** Abilities granted by Internal Factions choice (runtime only, not in base data) */
    grantedAbilities?: LeaderAbility[];
    /** Stability modifier override (for Internal Factions effect, replaces stats.stabilityPerTurn for display/calc) */
    stabilityModifierOverride?: number;
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
    targetId: string;
    targetName: string;
    attackerName: string;
}
/**
 * Battle info for display in Battle Resolution Phase panel
 */
export interface BattleInfo {
    attackerFaction: FactionId;
    defenderFaction: FactionId;
    locationName: string;
}
/**
 * Battle Resolution Phase state (multiplayer only)
 * Tracks the combat resolution phase for all players
 */
export interface BattleResolutionPhase {
    isActive: boolean;
    currentIndex: number;
    totalBattles: number;
    battles: BattleInfo[];
}
export interface AITheater {
    id: number;
    locationIds: string[];
    borderLocationIds: string[];
    threatLevel: number;
    armyStrength: number;
    isContested: boolean;
}
export type MissionType = 'CAMPAIGN' | 'DEFEND' | 'PATROL' | 'REINFORCE' | 'INSURRECTION' | 'NEGOTIATE' | 'STABILIZE' | 'ROAD_DEFENSE' | 'COUNTER_INSURRECTION';
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
    leaderRecruitmentFund?: number;
    republicanInternalFaction?: {
        savingsMode: 'KNIGHTLY_COUP' | 'MERCHANT_DOMINATION' | null;
        savedGold: number;
        decisionMade: boolean;
    };
}
export interface LeaderEliminatedNotification {
    faction: FactionId;
    leaderName: string;
    header: string;
    buttonText: string;
}
export interface GameState {
    turn: number;
    mapId?: string;
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
    logs: LogEntry[];
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
    leaderEliminatedNotification: LeaderEliminatedNotification | null;
    victory?: {
        winner: FactionId;
        message: string;
    };
    hasScannedBattles: boolean;
    /** @alias logs - Preferred name for new AI leader system */
    eventLog?: LogEntry[];
    /** @alias resources - Faction data including gold, for new AI leader system */
    factions?: {
        [key in FactionId]?: {
            gold: number;
        };
    };
    chosenInternalFaction?: RepublicanInternalFaction;
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
    battleResolutionPhase?: BattleResolutionPhase;
    aiState?: {
        [key in FactionId]?: FactionAIState;
    };
    stats: GameStats;
    logs: LogEntry[];
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
    leaderEliminatedNotification: LeaderEliminatedNotification | null;
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
    type: 'CONSCRIPT';
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
