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
            ability: ['MANAGER'],
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
        budget: 500, // NEW: Starts with budget
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
            ability: ['NONE'],
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
        stats: {
            stabilityPerTurn: -3,
            commandBonus: 0,
            clandestineOps: leaderTypes_1.LeaderStatLevel.EXCEPTIONAL,
            discretion: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            statesmanship: leaderTypes_1.LeaderStatLevel.UNRELIABLE,
            ability: ['NONE'],
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
            ability: ['NONE'],
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
            stabilityPerTurn: 0, // "-" means 0
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
        budget: 600, // NEW: Starts with budget
        stats: {
            stabilityPerTurn: 0,
            commandBonus: 0,
            clandestineOps: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            discretion: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            statesmanship: leaderTypes_1.LeaderStatLevel.CAPABLE,
            ability: ['DAREDEVIL', 'GHOST'],
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
            stabilityPerTurn: 5,
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
            ability: ['NONE'],
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
        budget: 500, // NEW: Starts with budget
        stats: {
            stabilityPerTurn: 0, // "-" means 0
            commandBonus: 0,
            clandestineOps: leaderTypes_1.LeaderStatLevel.EFFECTIVE,
            discretion: leaderTypes_1.LeaderStatLevel.CAPABLE,
            statesmanship: leaderTypes_1.LeaderStatLevel.CAPABLE,
            ability: ['FIREBRAND', 'PARANOID'],
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
            ability: ['NONE'],
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
            ability: ['NONE'],
            traits: [], // No trait
            insurrectionValue: 10 // DEPRECATED
        }
    },
];
/**
 * @deprecated Use CHARACTERS_NEW instead with the new stats structure.
 * This export is kept for backward compatibility during migration.
 */
exports.CHARACTERS = [
    // Republicans (Spec 3.4 - Faction: Républicains)
    {
        id: 'azer', name: 'Sir Azer', title: 'Knight of the Republic', faction: types_1.FactionId.REPUBLICANS, status: types_1.CharacterStatus.AVAILABLE, locationId: 'sunbreach', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'Between Honor and Duty.',
        bonuses: {},
        stats: { stabilityPerTurn: 5, commandBonus: 0.15, insurrectionValue: 20, ability: ['NONE'] }
    },
    {
        id: 'argo', name: 'Argo', title: 'The Financier', faction: types_1.FactionId.REPUBLICANS, status: types_1.CharacterStatus.AVAILABLE, locationId: 'sunbreach', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'Merchant-prince.',
        bonuses: {},
        stats: { stabilityPerTurn: -3, commandBonus: 0, insurrectionValue: 20, ability: ['MANAGER'] }
    },
    {
        id: 'alia', name: 'Alia', title: 'The Messenger', faction: types_1.FactionId.REPUBLICANS, status: types_1.CharacterStatus.AVAILABLE, locationId: 'sunbreach', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'Daughter of landless nobles.',
        bonuses: {},
        stats: { stabilityPerTurn: -3, commandBonus: 0, insurrectionValue: 30, ability: ['FIREBRAND'] }
    },
    {
        id: 'lain', name: 'Lain', title: 'The Philosopher', faction: types_1.FactionId.REPUBLICANS, status: types_1.CharacterStatus.AVAILABLE, locationId: 'sunbreach', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'Ideologue.',
        bonuses: {},
        stats: { stabilityPerTurn: -3, commandBonus: 0, insurrectionValue: 20, ability: ['NONE'] }
    },
    {
        id: 'caelan', name: 'Caelan', title: 'The Lawyer', faction: types_1.FactionId.REPUBLICANS, status: types_1.CharacterStatus.AVAILABLE, locationId: 'sunbreach', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'Popular orator.',
        bonuses: {},
        stats: { stabilityPerTurn: -3, commandBonus: 0, insurrectionValue: 30, ability: ['NONE'] }
    },
    {
        id: 'tordis', name: 'Tordis', title: 'Militia Captain', faction: types_1.FactionId.REPUBLICANS, status: types_1.CharacterStatus.AVAILABLE, locationId: 'sunbreach', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'Man of practical mind.',
        bonuses: {},
        stats: { stabilityPerTurn: 5, commandBonus: 0.15, insurrectionValue: 30, ability: ['NONE'] }
    },
    {
        id: 'averic', name: 'Sir Averic', title: "Azer's aide-de-camp", faction: types_1.FactionId.REPUBLICANS, status: types_1.CharacterStatus.AVAILABLE, locationId: 'sunbreach', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'A rallied knight.',
        bonuses: {},
        stats: { stabilityPerTurn: 0, commandBonus: 0.10, insurrectionValue: 20, ability: ['NONE'] }
    },
    {
        id: 'gebren', name: 'Sir Gebren', title: "Azer's bodyguard", faction: types_1.FactionId.REPUBLICANS, status: types_1.CharacterStatus.AVAILABLE, locationId: 'sunbreach', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'The disciplined child of Thane.',
        bonuses: {},
        stats: { stabilityPerTurn: 0, commandBonus: 0.10, insurrectionValue: 20, ability: ['NONE'] }
    },
    {
        id: 'odeke', name: 'Sir Odeke', title: "Azer's enforcer", faction: types_1.FactionId.REPUBLICANS, status: types_1.CharacterStatus.AVAILABLE, locationId: 'sunbreach', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'The commoner in armor.',
        bonuses: {},
        stats: { stabilityPerTurn: 0, commandBonus: 0.10, insurrectionValue: 20, ability: ['NONE'] }
    },
    // Conspirators (Spec 3.4 - Faction: Conspirateurs)
    {
        id: 'rivenberg', name: 'Count Rivenberg', title: 'The Regent', faction: types_1.FactionId.CONSPIRATORS, status: types_1.CharacterStatus.AVAILABLE, locationId: 'windward', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'Leader of the Coup.',
        bonuses: {},
        stats: { stabilityPerTurn: 10, commandBonus: 0.30, insurrectionValue: 30, ability: ['MANAGER'] }
    },
    {
        id: 'barrett', name: 'Sir Barrett', title: 'Grandmaster of the Knights', faction: types_1.FactionId.CONSPIRATORS, status: types_1.CharacterStatus.AVAILABLE, locationId: 'stormbay', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'Legendary Knight.',
        bonuses: {},
        stats: { stabilityPerTurn: 10, commandBonus: 0.30, insurrectionValue: 10, ability: ['LEGENDARY'] }
    },
    {
        id: 'jadis', name: 'Jadis', title: 'Royal Advisor', faction: types_1.FactionId.CONSPIRATORS, status: types_1.CharacterStatus.AVAILABLE, locationId: 'great_plains', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'Previous Witch-Finder General.',
        bonuses: {},
        stats: { stabilityPerTurn: 5, commandBonus: 0, insurrectionValue: 20, ability: ['MANAGER'] }
    },
    {
        id: 'tymon', name: 'Sir Tymon', title: 'Knight Commander', faction: types_1.FactionId.CONSPIRATORS, status: types_1.CharacterStatus.AVAILABLE, locationId: 'hornvale', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'Duty over oaths.',
        bonuses: {},
        stats: { stabilityPerTurn: 3, commandBonus: 0.15, insurrectionValue: 10, ability: ['NONE'] }
    },
    {
        id: 'ethell', name: 'Lady Ethell', title: "King Fredrik's favorite", faction: types_1.FactionId.CONSPIRATORS, status: types_1.CharacterStatus.AVAILABLE, locationId: 'stormbay', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'An ear in every noble manor.',
        bonuses: {},
        stats: { stabilityPerTurn: 0, commandBonus: 0, insurrectionValue: 20, ability: ['NONE'] }
    },
    // Nobles (Spec 3.4 - Faction: Droits des Nobles)
    {
        id: 'lekal', name: 'Baron Lekal', title: 'Lord of Port-de-Sable', faction: types_1.FactionId.NOBLES, status: types_1.CharacterStatus.AVAILABLE, locationId: 'port_de_sable', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'The old lion of the aristocracy.',
        bonuses: {},
        stats: { stabilityPerTurn: 5, commandBonus: 0, insurrectionValue: 10, ability: ['MANAGER'] }
    },
    {
        id: 'thane', name: 'Duke of Thane', title: 'Lord of the Highlands', faction: types_1.FactionId.NOBLES, status: types_1.CharacterStatus.AVAILABLE, locationId: 'karamos', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'The nobility of the sword.',
        bonuses: {},
        stats: { stabilityPerTurn: 5, commandBonus: 0.30, insurrectionValue: 10, ability: ['NONE'] }
    },
    {
        id: 'wrenfield', name: 'Lord Wrenfield', title: 'Landless noble', faction: types_1.FactionId.NOBLES, status: types_1.CharacterStatus.AVAILABLE, locationId: 'mirebridge', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'Courtesan.',
        bonuses: {},
        stats: { stabilityPerTurn: 5, commandBonus: 0, insurrectionValue: 30, ability: ['NONE'] }
    },
    {
        id: 'haraldic', name: 'Sir Haraldic', title: 'Rebellious Knight Commander', faction: types_1.FactionId.NOBLES, status: types_1.CharacterStatus.AVAILABLE, locationId: 'gullwing', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'The staunch traditionalist.',
        bonuses: {},
        stats: { stabilityPerTurn: 0, commandBonus: 0.30, insurrectionValue: 10, ability: ['LEGENDARY', 'FIREBRAND'] }
    },
    {
        id: 'gullwing_duke', name: 'Duke of Gullwing', title: 'Lord of the southern lands', faction: types_1.FactionId.NOBLES, status: types_1.CharacterStatus.AVAILABLE, locationId: 'gullwing', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'The narrow and bellicose mind.',
        bonuses: {},
        stats: { stabilityPerTurn: 0, commandBonus: 0.15, insurrectionValue: 20, ability: ['NONE'] }
    },
    {
        id: 'lys', name: 'Castellan Lys', title: 'Vassal of the Baron Lekal', faction: types_1.FactionId.NOBLES, status: types_1.CharacterStatus.AVAILABLE, locationId: 'northern_barony', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'The emissary-at-arms.',
        bonuses: {},
        stats: { stabilityPerTurn: 0, commandBonus: 0, insurrectionValue: 20, ability: ['FIREBRAND'] }
    },
    {
        id: 'saltcraw', name: 'Viscount of Saltcraw', title: 'Lord of the archipelago', faction: types_1.FactionId.NOBLES, status: types_1.CharacterStatus.AVAILABLE, locationId: 'brinewaith', destinationId: null, turnsUntilArrival: 0, armyId: null, description: "The rigid wit of a ship's captain.",
        bonuses: {},
        stats: { stabilityPerTurn: 0, commandBonus: 0, insurrectionValue: 10, ability: ['NONE'] }
    },
    {
        id: 'shorclyff', name: 'Castellan Shorclyff', title: 'Vassal of the Duke of Thane', faction: types_1.FactionId.NOBLES, status: types_1.CharacterStatus.AVAILABLE, locationId: 'brinewaith', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'The exile from Sunbreach.',
        bonuses: {},
        stats: { stabilityPerTurn: 0, commandBonus: 0, insurrectionValue: 10, ability: ['NONE'] }
    },
];
