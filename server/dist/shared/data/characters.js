"use strict";
/**
 * Characters Data - All leaders and their initial state
 *
 * REFACTORED: Added new stats (clandestineOps, discretion, statesmanship),
 * new abilities (MAN_OF_CHURCH, DAREDEVIL, GHOST, PARANOID),
 * and character traits (IRON_FIST, FAINT_HEARTED, SCORCHED_EARTH).
 *
 * @see Spécifications fonctionnelles Nouvelle gestion des leaders.txt - Section 3
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHARACTERS = exports.CHARACTERS_NEW = void 0;
const types_1 = require("../types");
const leaderTypes_1 = require("../types/leaderTypes");
const clandestineTypes_1 = require("../types/clandestineTypes");
exports.CHARACTERS_NEW = [
    // ============================================================
    // Republicans (Spec: Faction Républicains)
    // ============================================================
    {
        id: 'azer',
        name: 'Sir Azer',
        title: 'Knight of the Republic',
        faction: types_1.FactionId.REPUBLICANS,
        status: types_1.CharacterStatus.AVAILABLE,
        locationId: 'sunbreach',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Between Honor and Duty.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 5,
            commandBonus: 0.15,
            clandestineOps: leaderTypes_1.LeaderStatLevel.CAPABLE,
            discretion: leaderTypes_1.LeaderStatLevel.CAPABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            ability: ['NONE'],
            traits: [leaderTypes_1.CharacterTrait.FAINT_HEARTED],
            insurrectionValue: 20 // DEPRECATED
        }
    },
    {
        id: 'argo',
        name: 'Argo',
        title: 'The Financier',
        faction: types_1.FactionId.REPUBLICANS,
        status: types_1.CharacterStatus.AVAILABLE,
        locationId: 'sunbreach',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Merchant-prince.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: -3,
            commandBonus: 0,
            clandestineOps: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            discretion: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.CAPABLE,
            ability: ['MANAGER', 'SMUGGLER', 'AGITATIONAL_NETWORKS'],
            traits: [leaderTypes_1.CharacterTrait.FAINT_HEARTED],
            insurrectionValue: 20 // DEPRECATED
        }
    },
    {
        id: 'alia',
        plannedMissionAction: clandestineTypes_1.ClandestineActionId.PREPARE_GRAND_INSURRECTION,
        name: 'Alia',
        title: 'The Messenger',
        faction: types_1.FactionId.REPUBLICANS,
        status: types_1.CharacterStatus.UNDERCOVER, // Starts in enemy territory
        locationId: 'northern_barony', // NEW: Starts in enemy territory
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Daughter of landless nobles.',
        bonuses: {},
        budget: 0, // NEW: Starts with budget
        clandestineBudget: 500, // Required for AI processing
        stats: {
            stabilityPerTurn: -3,
            commandBonus: 0,
            clandestineOps: leaderTypes_1.LeaderStatLevel.EXCEPTIONAL,
            discretion: leaderTypes_1.LeaderStatLevel.EXCEPTIONAL,
            statesmanship: leaderTypes_1.LeaderStatLevel.INEPT,
            ability: ['FIREBRAND', 'GHOST', 'DAREDEVIL'],
            traits: [leaderTypes_1.CharacterTrait.FAINT_HEARTED],
            insurrectionValue: 30 // DEPRECATED
        }
    },
    {
        id: 'lain',
        name: 'Lain',
        title: 'The Philosopher',
        faction: types_1.FactionId.REPUBLICANS,
        status: types_1.CharacterStatus.AVAILABLE,
        locationId: 'sunbreach',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Ideologue.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: -3,
            commandBonus: 0,
            clandestineOps: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            discretion: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            statesmanship: leaderTypes_1.LeaderStatLevel.INEPT,
            ability: [],
            traits: [leaderTypes_1.CharacterTrait.FAINT_HEARTED],
            insurrectionValue: 20 // DEPRECATED
        }
    },
    {
        id: 'caelan',
        plannedMissionAction: clandestineTypes_1.ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS,
        name: 'Caelan',
        title: 'The Lawyer',
        faction: types_1.FactionId.REPUBLICANS,
        status: types_1.CharacterStatus.UNDERCOVER, // Starts in enemy territory
        locationId: 'port_de_sable', // NEW: Starts in enemy territory
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Popular orator.',
        bonuses: {},
        budget: 600, // NEW: Starts with budget
        clandestineBudget: 600, // Required for AI processing
        stats: {
            stabilityPerTurn: -3,
            commandBonus: 0,
            clandestineOps: leaderTypes_1.LeaderStatLevel.EXCEPTIONAL,
            discretion: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            statesmanship: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            ability: [],
            traits: [], // No trait
            insurrectionValue: 30 // DEPRECATED
        }
    },
    {
        id: 'tordis',
        name: 'Tordis',
        title: 'Militia Captain',
        faction: types_1.FactionId.REPUBLICANS,
        status: types_1.CharacterStatus.AVAILABLE,
        locationId: 'sunbreach',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Man of practical mind.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: -3, // CHANGED from +5 in old specs
            commandBonus: 0.15,
            clandestineOps: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            discretion: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            statesmanship: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            ability: [],
            traits: [], // No trait
            insurrectionValue: 30 // DEPRECATED
        }
    },
    {
        id: 'averic',
        name: 'Sir Averic',
        title: "Azer's aide-de-camp",
        faction: types_1.FactionId.REPUBLICANS,
        status: types_1.CharacterStatus.AVAILABLE,
        locationId: 'sunbreach',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'A rallied knight.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 0, // "-" means 0
            commandBonus: 0.15,
            clandestineOps: leaderTypes_1.LeaderStatLevel.CAPABLE,
            discretion: leaderTypes_1.LeaderStatLevel.CAPABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.CAPABLE,
            ability: ['NONE'],
            traits: [], // No trait
            insurrectionValue: 20 // DEPRECATED
        }
    },
    {
        id: 'gebren',
        name: 'Sir Gebren',
        title: "Azer's bodyguard",
        faction: types_1.FactionId.REPUBLICANS,
        status: types_1.CharacterStatus.AVAILABLE,
        locationId: 'sunbreach',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'The disciplined child of Thane.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 0,
            commandBonus: 0.10,
            clandestineOps: leaderTypes_1.LeaderStatLevel.CAPABLE,
            discretion: leaderTypes_1.LeaderStatLevel.CAPABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.CAPABLE,
            ability: ['PARANOID'],
            traits: [leaderTypes_1.CharacterTrait.IRON_FIST],
            insurrectionValue: 20 // DEPRECATED
        }
    },
    {
        id: 'odeke',
        name: 'Sir Odeke',
        title: "Azer's enforcer",
        faction: types_1.FactionId.REPUBLICANS,
        status: types_1.CharacterStatus.AVAILABLE,
        locationId: 'sunbreach',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'The commoner in armor.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 0,
            commandBonus: 0.10,
            clandestineOps: leaderTypes_1.LeaderStatLevel.CAPABLE,
            discretion: leaderTypes_1.LeaderStatLevel.CAPABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.CAPABLE,
            ability: ['NONE'],
            traits: [], // No trait
            insurrectionValue: 20 // DEPRECATED
        }
    },
    // ============================================================
    // Conspirators (Spec: Faction Conspirateurs)
    // ============================================================
    {
        id: 'rivenberg',
        name: 'Count Rivenberg',
        title: 'The Regent',
        faction: types_1.FactionId.CONSPIRATORS,
        status: types_1.CharacterStatus.AVAILABLE,
        locationId: 'windward',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Leader of the Coup.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 10,
            commandBonus: 0.30,
            clandestineOps: leaderTypes_1.LeaderStatLevel.EXCEPTIONAL,
            discretion: leaderTypes_1.LeaderStatLevel.EXCEPTIONAL,
            statesmanship: leaderTypes_1.LeaderStatLevel.EXCEPTIONAL,
            ability: ['MANAGER', 'GHOST', 'DAREDEVIL'],
            traits: [], // No trait
            insurrectionValue: 30 // DEPRECATED
        }
    },
    {
        id: 'barrett',
        name: 'Sir Barrett',
        title: 'Grandmaster of the Knights',
        faction: types_1.FactionId.CONSPIRATORS,
        status: types_1.CharacterStatus.AVAILABLE,
        locationId: 'stormbay',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Legendary Knight.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 10,
            commandBonus: 0.30,
            clandestineOps: leaderTypes_1.LeaderStatLevel.CAPABLE,
            discretion: leaderTypes_1.LeaderStatLevel.CAPABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.EXCEPTIONAL,
            ability: ['LEGENDARY'],
            traits: [], // No trait
            insurrectionValue: 10 // DEPRECATED
        }
    },
    {
        id: 'tymon',
        name: 'Sir Tymon',
        title: 'Knight Commander',
        faction: types_1.FactionId.CONSPIRATORS,
        status: types_1.CharacterStatus.AVAILABLE,
        locationId: 'hornvale',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Duty over oaths.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 3, // "-" means 0
            commandBonus: 0.15,
            clandestineOps: leaderTypes_1.LeaderStatLevel.CAPABLE,
            discretion: leaderTypes_1.LeaderStatLevel.CAPABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            ability: ['NONE'],
            traits: [], // No trait
            insurrectionValue: 10 // DEPRECATED
        }
    },
    {
        id: 'jadis',
        name: 'Jadis',
        title: 'Royal Advisor',
        faction: types_1.FactionId.CONSPIRATORS,
        status: types_1.CharacterStatus.AVAILABLE,
        locationId: 'great_plains',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Previous Witch-Finder General.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 0, // "-" means 0 (note: was +5 in old data)
            commandBonus: 0,
            clandestineOps: leaderTypes_1.LeaderStatLevel.CAPABLE,
            discretion: leaderTypes_1.LeaderStatLevel.CAPABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            ability: ['MAN_OF_CHURCH'],
            traits: [], // No trait
            insurrectionValue: 20 // DEPRECATED
        }
    },
    {
        id: 'ethell',
        plannedMissionAction: clandestineTypes_1.ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS,
        name: 'Lady Ethell',
        title: "King Fredrik's favorite",
        faction: types_1.FactionId.CONSPIRATORS,
        status: types_1.CharacterStatus.UNDERCOVER, // Starts in enemy territory
        locationId: 'sunbreach', // NEW: Starts in enemy territory
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'An ear in every noble manor.',
        bonuses: {},
        budget: 0, // NEW: Starts with budget
        clandestineBudget: 600, // Required for AI processing
        stats: {
            stabilityPerTurn: 0,
            commandBonus: 0,
            clandestineOps: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            discretion: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            statesmanship: leaderTypes_1.LeaderStatLevel.CAPABLE,
            ability: ['DAREDEVIL', 'GHOST', 'ELITE_NETWORKS'],
            traits: [], // No trait
            insurrectionValue: 20 // DEPRECATED
        }
    },
    // ============================================================
    // Nobles / Nobles' Rights Faction (Spec: Faction Droits des Nobles)
    // ============================================================
    {
        id: 'lekal',
        name: 'Baron Lekal',
        title: 'Lord of Port-de-Sable',
        faction: types_1.FactionId.NOBLES,
        status: types_1.CharacterStatus.AVAILABLE,
        locationId: 'port_de_sable',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'The old lion of the aristocracy.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 10,
            commandBonus: 0,
            clandestineOps: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            discretion: leaderTypes_1.LeaderStatLevel.CAPABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            ability: ['MANAGER', 'PARANOID'],
            traits: [], // No trait (empty cell in specs)
            insurrectionValue: 10 // DEPRECATED
        }
    },
    {
        id: 'thane',
        name: 'Duke of Thane',
        title: 'Lord of the Highlands',
        faction: types_1.FactionId.NOBLES,
        status: types_1.CharacterStatus.AVAILABLE,
        locationId: 'karamos',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'The nobility of the sword.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 5,
            commandBonus: 0.30,
            clandestineOps: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            discretion: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            ability: ['NONE'],
            traits: [leaderTypes_1.CharacterTrait.IRON_FIST],
            insurrectionValue: 10 // DEPRECATED
        }
    },
    {
        id: 'wrenfield',
        name: 'Lord Wrenfield',
        title: 'Landless noble',
        faction: types_1.FactionId.NOBLES,
        status: types_1.CharacterStatus.AVAILABLE,
        locationId: 'mirebridge',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Courtesan.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 0, // "-" means 0 (was +5 in old data)
            commandBonus: 0,
            clandestineOps: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            discretion: leaderTypes_1.LeaderStatLevel.EXCEPTIONAL,
            statesmanship: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            ability: ['NONE', 'ELITE_NETWORKS'],
            traits: [], // No trait (empty cell in specs)
            insurrectionValue: 30 // DEPRECATED
        }
    },
    {
        id: 'haraldic',
        name: 'Sir Haraldic',
        title: 'Rebellious Knight Commander',
        faction: types_1.FactionId.NOBLES,
        status: types_1.CharacterStatus.AVAILABLE,
        locationId: 'gullwing',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'The staunch traditionalist.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 0, // "-" means 0
            commandBonus: 0.30,
            clandestineOps: leaderTypes_1.LeaderStatLevel.CAPABLE,
            discretion: leaderTypes_1.LeaderStatLevel.EXCEPTIONAL,
            statesmanship: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            ability: ['LEGENDARY', 'FIREBRAND', 'PARANOID', 'DAREDEVIL'],
            traits: [leaderTypes_1.CharacterTrait.IRON_FIST, leaderTypes_1.CharacterTrait.SCORCHED_EARTH],
            insurrectionValue: 10 // DEPRECATED
        }
    },
    {
        id: 'gullwing_duke',
        name: 'Duke of Gullwing',
        title: 'Lord of the southern lands',
        faction: types_1.FactionId.NOBLES,
        status: types_1.CharacterStatus.AVAILABLE,
        locationId: 'gullwing',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'The narrow and bellicose mind.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 0, // "--" interpreted as 0
            commandBonus: 0.15,
            clandestineOps: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            discretion: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            ability: ['PARANOID'],
            traits: [leaderTypes_1.CharacterTrait.IRON_FIST, leaderTypes_1.CharacterTrait.SCORCHED_EARTH],
            insurrectionValue: 20 // DEPRECATED
        }
    },
    {
        id: 'lys',
        plannedMissionAction: clandestineTypes_1.ClandestineActionId.PREPARE_GRAND_INSURRECTION,
        name: 'Castellan Lys',
        title: 'Vassal of the Baron Lekal',
        faction: types_1.FactionId.NOBLES,
        status: types_1.CharacterStatus.UNDERCOVER, // Starts in enemy territory
        locationId: 'sunbreach_lands', // NEW: Starts in enemy territory
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'The emissary-at-arms.',
        bonuses: {},
        budget: 0, // NEW: Starts with budget
        clandestineBudget: 500, // Required for AI processing
        stats: {
            stabilityPerTurn: 0, // "-" means 0
            commandBonus: 0,
            clandestineOps: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            discretion: leaderTypes_1.LeaderStatLevel.CAPABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.CAPABLE,
            ability: ['FIREBRAND', 'PARANOID', 'ELITE_NETWORKS'],
            traits: [leaderTypes_1.CharacterTrait.IRON_FIST],
            insurrectionValue: 20 // DEPRECATED
        }
    },
    {
        id: 'saltcraw',
        name: 'Viscount of Saltcraw',
        title: 'Lord of the archipelago',
        faction: types_1.FactionId.NOBLES,
        status: types_1.CharacterStatus.AVAILABLE,
        locationId: 'brinewaith',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: "The rigid wit of a ship's captain.",
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 0,
            commandBonus: 0,
            clandestineOps: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            discretion: leaderTypes_1.LeaderStatLevel.INEPT,
            statesmanship: leaderTypes_1.LeaderStatLevel.INEPT,
            ability: ['SMUGGLER'],
            traits: [leaderTypes_1.CharacterTrait.IRON_FIST],
            insurrectionValue: 10 // DEPRECATED
        }
    },
    {
        id: 'shorclyff',
        name: 'Castellan Shorclyff',
        title: 'Vassal of the Duke of Thane',
        faction: types_1.FactionId.NOBLES,
        status: types_1.CharacterStatus.AVAILABLE,
        locationId: 'brinewaith',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'The exile from Sunbreach.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 0,
            commandBonus: 0,
            clandestineOps: leaderTypes_1.LeaderStatLevel.CAPABLE,
            discretion: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.CAPABLE,
            ability: ['ELITE_NETWORKS'],
            traits: [], // No trait
            insurrectionValue: 10 // DEPRECATED
        }
    },
    // ============================================================
    // Recruitable Leaders (available for mid-game recruitment)
    // These start as NEUTRAL/DEAD in graveyard until recruited
    // ============================================================
    {
        id: 'gaiard',
        name: 'Gaiard',
        title: 'City councillor',
        faction: types_1.FactionId.NEUTRAL,
        status: types_1.CharacterStatus.DEAD, // Stored as dead until recruited
        locationId: 'graveyard',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Merchant of everything foreign.',
        bonuses: {},
        budget: 0,
        isRecruitableLeader: true, // Flag for recruitment system
        stats: {
            stabilityPerTurn: 5,
            commandBonus: 0,
            clandestineOps: leaderTypes_1.LeaderStatLevel.INEPT,
            discretion: leaderTypes_1.LeaderStatLevel.INEPT,
            statesmanship: leaderTypes_1.LeaderStatLevel.EXCEPTIONAL,
            ability: ['MANAGER', 'SMUGGLER'],
            traits: [leaderTypes_1.CharacterTrait.FREE_TRADER],
            insurrectionValue: 0 // DEPRECATED
        }
    },
    {
        id: 'gildas',
        name: 'Gildas',
        title: 'City councillor',
        faction: types_1.FactionId.NEUTRAL,
        status: types_1.CharacterStatus.DEAD, // Stored as dead until recruited
        locationId: 'graveyard',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Guild master.',
        bonuses: {},
        budget: 0,
        isRecruitableLeader: true,
        stats: {
            stabilityPerTurn: 0,
            commandBonus: 0,
            clandestineOps: leaderTypes_1.LeaderStatLevel.INEPT,
            discretion: leaderTypes_1.LeaderStatLevel.INEPT,
            statesmanship: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            ability: ['MANAGER'],
            traits: [leaderTypes_1.CharacterTrait.FAINT_HEARTED, leaderTypes_1.CharacterTrait.FREE_TRADER],
            insurrectionValue: 0 // DEPRECATED
        }
    },
    {
        id: 'clavestone',
        name: 'Clavestone',
        title: 'Manufacture owner',
        faction: types_1.FactionId.NEUTRAL,
        status: types_1.CharacterStatus.DEAD, // Stored as dead until recruited
        locationId: 'graveyard',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Former adventurer.',
        bonuses: {},
        budget: 0,
        isRecruitableLeader: true,
        stats: {
            stabilityPerTurn: 3,
            commandBonus: 0.15,
            clandestineOps: leaderTypes_1.LeaderStatLevel.CAPABLE,
            discretion: leaderTypes_1.LeaderStatLevel.CAPABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            ability: ['MANAGER', 'SMUGGLER'],
            traits: [leaderTypes_1.CharacterTrait.IRON_FIST, leaderTypes_1.CharacterTrait.FREE_TRADER],
            insurrectionValue: 0 // DEPRECATED
        }
    },
    {
        id: 'jack_the_fox',
        name: 'Jack the Fox',
        title: 'Pamphleteer',
        faction: types_1.FactionId.NEUTRAL,
        status: types_1.CharacterStatus.DEAD,
        locationId: 'graveyard',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'A cord-maker turned radical agitator.',
        bonuses: {},
        budget: 0,
        isRecruitableLeader: true,
        stats: {
            stabilityPerTurn: -4,
            commandBonus: 0,
            clandestineOps: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            discretion: leaderTypes_1.LeaderStatLevel.EXCEPTIONAL,
            statesmanship: leaderTypes_1.LeaderStatLevel.INEPT,
            ability: ['FIREBRAND', 'SMUGGLER'],
            traits: [leaderTypes_1.CharacterTrait.SCORCHED_EARTH],
            insurrectionValue: 0 // DEPRECATED
        }
    },
    {
        id: 'richard_fayre',
        name: 'Richard Fayre',
        title: 'Demagogue',
        faction: types_1.FactionId.NEUTRAL,
        status: types_1.CharacterStatus.DEAD,
        locationId: 'graveyard',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'A hoodlum with a quill.',
        bonuses: {},
        budget: 0,
        isRecruitableLeader: true,
        stats: {
            stabilityPerTurn: -4,
            commandBonus: 0,
            clandestineOps: leaderTypes_1.LeaderStatLevel.EXCEPTIONAL,
            discretion: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.INEPT,
            ability: ['FIREBRAND'],
            traits: [],
            insurrectionValue: 0 // DEPRECATED
        }
    },
    {
        id: 'enoch',
        name: 'Sir Enoch',
        title: 'Knight Captain',
        faction: types_1.FactionId.NEUTRAL,
        status: types_1.CharacterStatus.DEAD,
        locationId: 'graveyard',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: "Barrett's right hand man.",
        bonuses: {},
        budget: 0,
        isRecruitableLeader: true,
        stats: {
            stabilityPerTurn: 1,
            commandBonus: 0.20,
            clandestineOps: leaderTypes_1.LeaderStatLevel.CAPABLE,
            discretion: leaderTypes_1.LeaderStatLevel.CAPABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.CAPABLE,
            ability: ['NONE'],
            traits: [],
            insurrectionValue: 0
        }
    },
    {
        id: 'alb_turvrard',
        name: 'Alb Turvrard',
        title: 'Royal Treasurer',
        faction: types_1.FactionId.NEUTRAL,
        status: types_1.CharacterStatus.DEAD,
        locationId: 'graveyard',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Looking for a strong regime.',
        bonuses: {},
        budget: 0,
        isRecruitableLeader: true,
        stats: {
            stabilityPerTurn: 0,
            commandBonus: 0,
            clandestineOps: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            discretion: leaderTypes_1.LeaderStatLevel.CAPABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            ability: ['MANAGER', 'ELITE_NETWORKS'],
            traits: [],
            insurrectionValue: 0
        }
    },
    {
        id: 'father_tallysse',
        name: 'Father Tallysse',
        title: 'Witch-Hunter General',
        faction: types_1.FactionId.NEUTRAL,
        status: types_1.CharacterStatus.DEAD,
        locationId: 'graveyard',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'A stake in the heart of the aristocracy.',
        bonuses: {},
        budget: 0,
        isRecruitableLeader: true,
        stats: {
            stabilityPerTurn: 0,
            commandBonus: 0,
            clandestineOps: leaderTypes_1.LeaderStatLevel.EXCEPTIONAL,
            discretion: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            statesmanship: leaderTypes_1.LeaderStatLevel.CAPABLE,
            ability: ['FIREBRAND', 'ELITE_NETWORKS', 'MAN_OF_CHURCH', 'PARANOID'],
            traits: [leaderTypes_1.CharacterTrait.IRON_FIST],
            insurrectionValue: 0
        }
    },
    {
        id: 'maxime_jacob',
        name: 'Maxime Jacob',
        title: 'Lawyer',
        faction: types_1.FactionId.NEUTRAL,
        status: types_1.CharacterStatus.DEAD,
        locationId: 'graveyard',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Man of virtue.',
        bonuses: {},
        budget: 0,
        isRecruitableLeader: true,
        stats: {
            stabilityPerTurn: 3,
            commandBonus: 0,
            clandestineOps: leaderTypes_1.LeaderStatLevel.CAPABLE,
            discretion: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.EXCEPTIONAL,
            ability: ['PARANOID'],
            traits: [],
            insurrectionValue: 0
        }
    },
    {
        id: 'holvein',
        name: 'Sir Holvein',
        title: "Stormbay's Watch commander",
        faction: types_1.FactionId.NEUTRAL,
        status: types_1.CharacterStatus.DEAD,
        locationId: 'graveyard',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'A wall of discipline.',
        bonuses: {},
        budget: 0,
        isRecruitableLeader: true,
        stats: {
            stabilityPerTurn: 0,
            commandBonus: 0.30,
            clandestineOps: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            discretion: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.CAPABLE,
            ability: ['CONSCRIPTION'],
            traits: [leaderTypes_1.CharacterTrait.IRON_FIST, leaderTypes_1.CharacterTrait.MAN_OF_ACTION],
            insurrectionValue: 0
        }
    },
    {
        id: 'lazare_montagne',
        name: 'Lazare Montagne',
        title: 'Former soldier',
        faction: types_1.FactionId.NEUTRAL,
        status: types_1.CharacterStatus.DEAD,
        locationId: 'graveyard',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Will organize victory.',
        bonuses: {},
        budget: 0,
        isRecruitableLeader: true,
        stats: {
            stabilityPerTurn: 1,
            commandBonus: 0.30,
            clandestineOps: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            discretion: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            ability: ['MANAGER', 'CONSCRIPTION'],
            traits: [leaderTypes_1.CharacterTrait.IRON_FIST],
            insurrectionValue: 0
        }
    },
    {
        id: 'vendemer',
        name: 'Vendemer',
        title: 'Ship captain',
        faction: types_1.FactionId.NEUTRAL,
        status: types_1.CharacterStatus.DEAD,
        locationId: 'graveyard',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Traveled far beyond Larion.',
        bonuses: {},
        budget: 0,
        isRecruitableLeader: true,
        stats: {
            stabilityPerTurn: 0,
            commandBonus: 0,
            clandestineOps: leaderTypes_1.LeaderStatLevel.EXCEPTIONAL,
            discretion: leaderTypes_1.LeaderStatLevel.EXCEPTIONAL,
            statesmanship: leaderTypes_1.LeaderStatLevel.CAPABLE,
            ability: ['DAREDEVIL', 'GHOST', 'SMUGGLER'],
            traits: [],
            insurrectionValue: 0
        }
    },
    {
        id: 'armand',
        name: 'Sir Armand',
        title: 'Knight Commander',
        faction: types_1.FactionId.NEUTRAL,
        status: types_1.CharacterStatus.DEAD,
        locationId: 'graveyard',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Too weak for the new regime.',
        bonuses: {},
        budget: 0,
        isRecruitableLeader: true,
        stats: {
            stabilityPerTurn: 3,
            commandBonus: 0.15,
            clandestineOps: leaderTypes_1.LeaderStatLevel.CAPABLE,
            discretion: leaderTypes_1.LeaderStatLevel.CAPABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.CAPABLE,
            ability: ['NONE'],
            traits: [leaderTypes_1.CharacterTrait.FAINT_HEARTED],
            insurrectionValue: 0
        }
    },
    {
        id: 'vergier',
        name: 'Count Vergier',
        title: 'Heir of Jaquelein Rock',
        faction: types_1.FactionId.NEUTRAL,
        status: types_1.CharacterStatus.DEAD,
        locationId: 'graveyard',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'As devout as he is brave.',
        bonuses: {},
        budget: 0,
        isRecruitableLeader: false, // Becomes true at turn 6 (NOBLES recruitment)
        stats: {
            stabilityPerTurn: 3,
            commandBonus: 0.15,
            clandestineOps: leaderTypes_1.LeaderStatLevel.EXCEPTIONAL,
            discretion: leaderTypes_1.LeaderStatLevel.EXCEPTIONAL,
            statesmanship: leaderTypes_1.LeaderStatLevel.CAPABLE,
            ability: ['FIREBRAND', 'DAREDEVIL', 'AGITATIONAL_NETWORKS'],
            traits: [leaderTypes_1.CharacterTrait.MAN_OF_ACTION],
            insurrectionValue: 0
        }
    },
    {
        id: 'georges_cadal',
        name: 'Georges Cadal',
        title: 'Wealthy landlord',
        faction: types_1.FactionId.NEUTRAL,
        status: types_1.CharacterStatus.DEAD,
        locationId: 'graveyard',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'A towering, charismatic commoner.',
        bonuses: {},
        budget: 0,
        isRecruitableLeader: false, // Becomes true at turn 14 (NOBLES recruitment)
        stats: {
            stabilityPerTurn: 0,
            commandBonus: 0.15,
            clandestineOps: leaderTypes_1.LeaderStatLevel.EXCEPTIONAL,
            discretion: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            statesmanship: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            ability: ['FIREBRAND', 'GHOST', 'DAREDEVIL'],
            traits: [leaderTypes_1.CharacterTrait.IRON_FIST, leaderTypes_1.CharacterTrait.MAN_OF_ACTION],
            insurrectionValue: 0
        }
    },
    {
        id: 'klemath',
        name: 'Klemath',
        title: "Baron Lekal's right hand",
        faction: types_1.FactionId.NEUTRAL,
        status: types_1.CharacterStatus.DEAD,
        locationId: 'graveyard',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'The loyal, harsh attack dog.',
        bonuses: {},
        budget: 0,
        isRecruitableLeader: false, // Becomes true at turn 12 (NOBLES recruitment)
        stats: {
            stabilityPerTurn: 1,
            commandBonus: 0.15,
            clandestineOps: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            discretion: leaderTypes_1.LeaderStatLevel.CAPABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.CAPABLE,
            ability: ['SMUGGLER', 'CONSCRIPTION'],
            traits: [leaderTypes_1.CharacterTrait.IRON_FIST],
            insurrectionValue: 0
        }
    },
    {
        id: 'baron_ystrir',
        name: 'Baron of Ystrir',
        title: 'Southern lord',
        faction: types_1.FactionId.NEUTRAL,
        status: types_1.CharacterStatus.DEAD,
        locationId: 'graveyard',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: "Rotten by the Sunbreach's court life.",
        bonuses: {},
        budget: 0,
        isRecruitableLeader: false, // Becomes true at turn 18 (NOBLES recruitment)
        stats: {
            stabilityPerTurn: 0,
            commandBonus: 0,
            clandestineOps: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            discretion: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            ability: ['NONE'],
            traits: [leaderTypes_1.CharacterTrait.IRON_FIST],
            insurrectionValue: 0
        }
    },
    {
        id: 'duke_great_plains',
        name: 'Duke of the Great Plains',
        title: 'Lord of the golden fields',
        faction: types_1.FactionId.NEUTRAL,
        status: types_1.CharacterStatus.DEAD,
        locationId: 'graveyard',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Seeking revenge against the Regent.',
        bonuses: {},
        budget: 0,
        isRecruitableLeader: false, // Becomes true at turn 2 (NOBLES recruitment)
        stats: {
            stabilityPerTurn: 0,
            commandBonus: 0.15,
            clandestineOps: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            discretion: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.CAPABLE,
            ability: ['NONE'],
            traits: [],
            insurrectionValue: 0
        }
    },
    {
        id: 'spelttiller',
        name: 'Castellan Spelttiller',
        title: 'Vassal of the Duke of the Great Plains',
        faction: types_1.FactionId.NEUTRAL,
        status: types_1.CharacterStatus.DEAD,
        locationId: 'graveyard',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'A better man than his master.',
        bonuses: {},
        budget: 0,
        isRecruitableLeader: false, // Becomes true at turn 16 (NOBLES recruitment)
        stats: {
            stabilityPerTurn: 3,
            commandBonus: 0.10,
            clandestineOps: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            discretion: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            statesmanship: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            ability: ['NONE'],
            traits: [leaderTypes_1.CharacterTrait.FAINT_HEARTED],
            insurrectionValue: 0
        }
    },
    {
        id: 'duke_esmarch',
        name: 'Duke of Esmarch',
        title: 'Lord of the northern marshes',
        faction: types_1.FactionId.NEUTRAL,
        status: types_1.CharacterStatus.DEAD,
        locationId: 'graveyard',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'A provincial lord, in power as in mind.',
        bonuses: {},
        budget: 0,
        isRecruitableLeader: false, // Becomes true at turn 8 (NOBLES recruitment)
        stats: {
            stabilityPerTurn: 0,
            commandBonus: 0,
            clandestineOps: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            discretion: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.CAPABLE,
            ability: ['MANAGER'],
            traits: [],
            insurrectionValue: 0
        }
    },
    {
        id: 'duke_hornvale',
        name: 'Duke of Hornvale',
        title: 'Lord of the southern plains',
        faction: types_1.FactionId.NEUTRAL,
        status: types_1.CharacterStatus.DEAD,
        locationId: 'graveyard',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Backward-looking, even for his peers.',
        bonuses: {},
        budget: 0,
        isRecruitableLeader: false, // Becomes true at turn 10 (NOBLES recruitment)
        stats: {
            stabilityPerTurn: 0,
            commandBonus: 0.15,
            clandestineOps: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            discretion: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            statesmanship: leaderTypes_1.LeaderStatLevel.INEPT,
            ability: ['ELITE_NETWORKS', 'CONSCRIPTION'],
            traits: [leaderTypes_1.CharacterTrait.IRON_FIST],
            insurrectionValue: 0
        }
    },
    {
        id: 'demain',
        name: 'Sir Demain',
        title: "Defender of Sunbreach's noble district",
        faction: types_1.FactionId.NEUTRAL,
        status: types_1.CharacterStatus.DEAD,
        locationId: 'graveyard',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'A well-meaning knight, now an aimless sword.',
        bonuses: {},
        budget: 0,
        isRecruitableLeader: false, // Becomes true at turn 4 (NOBLES recruitment)
        stats: {
            stabilityPerTurn: 0,
            commandBonus: 0.30,
            clandestineOps: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            discretion: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.CAPABLE,
            ability: ['ELITE_NETWORKS'],
            traits: [leaderTypes_1.CharacterTrait.FAINT_HEARTED, leaderTypes_1.CharacterTrait.MAN_OF_ACTION],
            insurrectionValue: 0
        }
    },
    {
        id: 'castelreach',
        name: 'Sir Castelreach',
        title: 'Republican army commander',
        faction: types_1.FactionId.NEUTRAL,
        status: types_1.CharacterStatus.DEAD,
        locationId: 'graveyard',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Rallied royal army officer.',
        bonuses: {},
        budget: 0,
        isRecruitableLeader: true,
        stats: {
            stabilityPerTurn: 3,
            commandBonus: 0.30,
            clandestineOps: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            discretion: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            ability: ['CONSCRIPTION'],
            traits: [leaderTypes_1.CharacterTrait.IRON_FIST],
            insurrectionValue: 0
        }
    },
];
// ============================================================
// BACKWARD COMPATIBILITY: CHARACTERS alias
// ============================================================
/**
 * @deprecated Use CHARACTERS_NEW for full new stats structure.
 * This alias maintains backward compatibility for existing code.
 * The CharacterNew type extends Character, so this cast is safe.
 */
exports.CHARACTERS = exports.CHARACTERS_NEW;
