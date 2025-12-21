

export enum FactionId {
  REPUBLICANS = 'REPUBLICANS',
  CONSPIRATORS = 'CONSPIRATORS',
  NOBLES = 'NOBLES',
  NEUTRAL = 'NEUTRAL'
}

export enum RoadQuality {
  GOOD = 'GOOD',
  MEDIOCRE = 'MEDIOCRE',
  BAD = 'BAD',
  LOCAL = 'LOCAL'
}

export enum LocationType {
  CITY = 'CITY',
  RURAL = 'RURAL',
  ROAD_STAGE = 'ROAD_STAGE'
}

export enum RuralCategory {
  FERTILE = 'FERTILE',
  ORDINARY = 'ORDINARY',
  INHOSPITABLE = 'INHOSPITABLE'
}

export enum CharacterStatus {
  AVAILABLE = 'AVAILABLE',
  ON_MISSION = 'ON_MISSION', // Insurrection logic mostly
  MOVING = 'MOVING', // Traveling alone or with army
  DEAD = 'DEAD'
}

// --- STRUCTURED LOG SYSTEM ---

export enum LogSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL'
}

export enum LogType {
  TURN_MARKER = 'TURN_MARKER',
  GAME_START = 'GAME_START',
  MOVEMENT = 'MOVEMENT',
  CAPTURE = 'CAPTURE',
  CONVOY = 'CONVOY',
  INSURRECTION = 'INSURRECTION',
  NEGOTIATION = 'NEGOTIATION',
  FAMINE = 'FAMINE',
  COMBAT = 'COMBAT',
  ECONOMY = 'ECONOMY',
  COMMERCE = 'COMMERCE',
  LEADER = 'LEADER',
  NARRATIVE = 'NARRATIVE'
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
  id: string;                        // Unique ID for React keys
  type: LogType;                     // Category for filtering/styling
  message: string;                   // Display text
  turn: number;                      // Turn number when created

  // Personalization - which factions can see this log
  // Empty array = visible to all
  visibleToFactions: FactionId[];

  // Base severity (used if viewer not in critical/warning lists)
  baseSeverity: LogSeverity;

  // Factions for whom this log should show as CRITICAL
  criticalForFactions?: FactionId[];

  // Factions for whom this log should show as WARNING
  warningForFactions?: FactionId[];

  // Element to highlight on map when hovering this log
  highlightTarget?: LogHighlightTarget;
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

  // Economy & Resources
  goldIncome: number;
  foodIncome: number; // Net flow for display, handled dynamically in logic
  foodStock: number;

  // Defense & Stability
  stability: number;
  defense: number;
  fortificationLevel: number; // 0-4
  activeConstruction?: ConstructionProject;
  hasBeenSiegedThisTurn?: boolean; // New field for Siege logic
  position: Coordinates;
  backgroundPosition?: Coordinates; // For geographical map view

  // Rural Specifics
  ruralCategory?: RuralCategory;
  isCoastal?: boolean;

  // Management State
  taxLevel?: ManagementLevel;
  tradeTaxLevel?: ManagementLevel;
  foodCollectionLevel?: ManagementLevel;
  isGrainTradeActive?: boolean;

  // Action Tracking
  actionsTaken?: {
    seizeGold: number;
    seizeFood: number;
    recruit: number;
    incite: number; // 1 per turn
  };
}

export interface RoadStage {
  index: number;
  position: Coordinates;
  backgroundPosition?: Coordinates; // For geographical map view
  fortificationLevel: number; // 0-4
  naturalDefense?: number;
  faction: FactionId | null; // Controller of fortification
  hasFortifiedThisTurn?: boolean;
  hasBeenSiegedThisTurn?: boolean; // New field for Siege logic
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
  curveControlPoints?: Coordinates[]; // Points for curved paths in map view
}

export interface SafePosition {
  type: 'LOCATION' | 'ROAD';
  id: string;
  stageIndex?: number;
}

export interface Army {
  id: string;
  faction: FactionId;

  // Current Position
  locationType: 'LOCATION' | 'ROAD';
  locationId: string | null;
  roadId: string | null;
  stageIndex: number;
  direction: 'FORWARD' | 'BACKWARD';

  // Movement Logic
  originLocationId: string; // DEPRECATED: Use tripOriginId. Kept for legacy.
  destinationId: string | null; // DEPRECATED: Use tripDestinationId.
  turnsUntilArrival: number;
  previousStageIndex?: number;
  justMoved?: boolean;

  // New Robust Movement Architecture (Refactor 2024-12-11)
  tripOriginId?: string; // The specific Location ID where the move order was issued. Only set when moving from LOC -> LOC/ROAD.
  tripDestinationId?: string | null; // The final target location ID.
  startOfTurnPosition?: { // Snapshot of position at the beginning of the turn. Used for Retreats.
    type: 'LOCATION' | 'ROAD';
    id: string; // LocationID or RoadID
    stageIndex?: number;
  };

  foodSourceId: string;
  lastSafePosition: SafePosition; // "Position précédente". Still useful for older logic handling? Or replace with startOfTurnPosition?

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

  // New Fields
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

  // Pending Insurrection Data
  missionData?: {
    targetLocationId: string;
    goldSpent: number;
  };

  stats: {
    stabilityPerTurn: number;
    commandBonus: number;
    insurrectionValue: number;
    ability: LeaderAbility[]; // Changed to array
  }

  bonuses: any;
}

export interface NegotiationMission {
  targetLocationId: string;
  factionId: FactionId; // Added for AI support
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
  currentIndex: number;    // 1-based for display (current battle being resolved)
  totalBattles: number;    // Initial total when phase started
  battles: BattleInfo[];   // List of battles in queue for display
}

// --- AI SPECIFIC TYPES ---
export interface AITheater {
  id: number;
  locationIds: string[]; // Owned locations in this theater
  borderLocationIds: string[]; // Adjacent enemy/neutral locations
  threatLevel: number; // Total enemy strength on borders
  armyStrength: number; // Total friendly strength
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
  stage: string; // 'GATHERING', 'MOVING', 'SIEGING', 'ASSAULTING'
  assignedArmyIds: string[];
  data: any; // Flexible storage for mission specific data (staging point, siege progress, etc.)
}

export interface AIGoal {
  // Deprecated but kept for compatibility during refactor if needed, 
  // or we can remove if we fully switch. Let's keep a simplified version 
  // or just rely on Missions.
  // For now, let's keep it to avoid breaking other files immediately, 
  // but the strategy will primarily use Missions.
  type: 'CONQUER' | 'INSURRECTION' | 'DEFEND' | 'CONNECT_THEATERS' | 'STOCKPILE' | 'CONQUER_CITY' | 'CONQUER_RURAL' | 'DEFEND_VITAL';
  targetId?: string;
  priority: number;
  budgetReserved: number;
  assignedArmyIds?: string[]; // Added for compatibility
}

export interface FactionAIState {
  theaters: AITheater[];
  goals: AIGoal[]; // Kept for legacy/transition
  missions: AIMission[]; // NEW: Persistent missions
  savings: number;
}

export interface GameState {
  turn: number;
  playerFaction: FactionId; // The local player's faction
  currentPlayerFaction?: FactionId; // The faction currently playing (Multiplayer only)
  locations: Location[];
  armies: Army[];
  convoys: Convoy[];
  navalConvoys: NavalConvoy[];
  roads: Road[];
  characters: Character[];
  resources: {
    [key in FactionId]: {
      gold: number;
    }
  };
  pendingNegotiations: NegotiationMission[];
  logs: LogEntry[];
  stats: GameStats;
  pendingCombatResponse?: CoreGameState['pendingCombatResponse'];

  // Persistent AI State per faction
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

export const FACTION_COLORS = {
  [FactionId.REPUBLICANS]: 'text-blue-400 bg-blue-900 border-blue-500',
  [FactionId.CONSPIRATORS]: 'text-amber-400 bg-amber-900 border-amber-500',
  [FactionId.NOBLES]: 'text-red-400 bg-red-900 border-red-500',
  [FactionId.NEUTRAL]: 'text-gray-400 bg-gray-800 border-gray-500',
};

export const FACTION_NAMES = {
  [FactionId.REPUBLICANS]: 'Republicans',
  [FactionId.CONSPIRATORS]: 'Conspirators',
  [FactionId.NOBLES]: "Nobles' rights faction",
  [FactionId.NEUTRAL]: 'Neutral',
};

// --- MULTIPLAYER TYPES ---

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

  resources: { [key in FactionId]: { gold: number } };
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

  // Battle Resolution Phase (multiplayer only)
  battleResolutionPhase?: BattleResolutionPhase;

  aiState?: { [key in FactionId]?: FactionAIState };
  stats: GameStats;
  logs: LogEntry[];
  victory?: { winner: FactionId; message: string };
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
  grainTradeNotification: { type: 'EMBARGO' | 'RESTORED'; factionName: string } | null;
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
export type GameAction =
  | { type: 'RECRUIT'; locationId: string; faction: FactionId }
  | { type: 'MOVE_ARMY'; armyId: string; destinationId: string; faction: FactionId }
  | { type: 'SPLIT_ARMY'; armyId: string; amount: number; faction: FactionId }
  | { type: 'GARRISON'; armyId: string; faction: FactionId }
  | { type: 'MERGE_REGIMENTS'; locationId: string; faction: FactionId }
  | { type: 'FORTIFY'; locationType: 'LOCATION' | 'ROAD_STAGE'; id: string; stageIndex?: number; faction: FactionId }
  | { type: 'INCITE'; locationId: string; characterId: string; gold: number; faction: FactionId }
  | { type: 'REQUISITION'; locationId: string; resourceType: 'GOLD' | 'FOOD'; faction: FactionId }
  | { type: 'NEGOTIATE'; locationId: string; gold: number; food: number; foodSourceIds: string[]; faction: FactionId }
  | { type: 'UPDATE_CITY_MANAGEMENT'; locationId: string; updates: Partial<Location>; faction: FactionId }
  | { type: 'SEND_CONVOY'; locationId: string; amount: number; destinationId: string; faction: FactionId }
  | { type: 'SEND_NAVAL_CONVOY'; locationId: string; amount: number; destinationId: string; faction: FactionId }
  | { type: 'REVERSE_CONVOY'; convoyId: string; faction: FactionId }
  | { type: 'ATTACH_LEADER'; armyId: string; characterId: string; faction: FactionId }
  | { type: 'DETACH_LEADER'; characterId: string; faction: FactionId }
  | { type: 'MOVE_LEADER'; characterId: string; destinationId: string; faction: FactionId }
  | { type: 'RETREAT_ARMY'; armyId: string; faction: FactionId }
  | { type: 'COMBAT_CHOICE'; choice: 'FIGHT' | 'RETREAT' | 'RETREAT_CITY' | 'SIEGE'; siegeCost?: number; faction: FactionId }
  | { type: 'END_TURN'; faction: FactionId };

export type GameMode = 'SOLO' | 'MULTIPLAYER';

/** Combined state for backwards compatibility */
export interface CombinedGameState extends CoreGameState, UIState {
  mode: GameMode;
  playerFaction: FactionId;
}