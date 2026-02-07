/**
 * Characters Data - All leaders and their initial state
 * 
 * REFACTORED: Added new stats (clandestineOps, discretion, statesmanship),
 * new abilities (MAN_OF_CHURCH, DAREDEVIL, GHOST, PARANOID), 
 * and character traits (IRON_FIST, FAINT_HEARTED, SCORCHED_EARTH).
 * 
 * @see Spécifications fonctionnelles Nouvelle gestion des leaders.txt - Section 3
 */

import { Character, FactionId, CharacterStatus, LeaderAbility } from '../types';
import { LeaderStatLevel, CharacterTrait } from '../types/leaderTypes';
import { ClandestineActionId } from '../types/clandestineTypes';

/**
 * Extended Character type with new stats.
 * Used until the main Character interface is fully migrated.
 */
export interface CharacterNew extends Omit<Character, 'stats'> {
    /** Initial budget for clandestine operations (0 if not specified) */
    budget: number;
    stats: {
        stabilityPerTurn: number;
        commandBonus: number;
        clandestineOps: LeaderStatLevel;
        discretion: LeaderStatLevel;
        statesmanship: LeaderStatLevel;
        ability: LeaderAbility[];
        traits: CharacterTrait[];
        // DEPRECATED - kept for backward compatibility
        insurrectionValue: number;
    };
}

export const CHARACTERS_NEW: CharacterNew[] = [
    // ============================================================
    // Republicans (Spec: Faction Républicains)
    // ============================================================
    {
        id: 'azer',
        name: 'Sir Azer',
        title: 'Knight of the Republic',
        faction: FactionId.REPUBLICANS,
        status: CharacterStatus.AVAILABLE,
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
            clandestineOps: LeaderStatLevel.CAPABLE,
            discretion: LeaderStatLevel.CAPABLE,
            statesmanship: LeaderStatLevel.EFFECTIVE,
            ability: ['NONE'],
            traits: [CharacterTrait.FAINT_HEARTED],
            insurrectionValue: 20 // DEPRECATED
        }
    },
    {
        id: 'argo',
        name: 'Argo',
        title: 'The Financier',
        faction: FactionId.REPUBLICANS,
        status: CharacterStatus.AVAILABLE,
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
            clandestineOps: LeaderStatLevel.EFFECTIVE,
            discretion: LeaderStatLevel.UNRELIABLE,
            statesmanship: LeaderStatLevel.CAPABLE,
            ability: ['MANAGER', 'SMUGGLER', 'AGITATIONAL_NETWORKS'],
            traits: [CharacterTrait.FAINT_HEARTED],
            insurrectionValue: 20 // DEPRECATED
        }
    },
    {
        id: 'alia',
        plannedMissionAction: ClandestineActionId.PREPARE_GRAND_INSURRECTION,
        name: 'Alia',
        title: 'The Messenger',
        faction: FactionId.REPUBLICANS,
        status: CharacterStatus.UNDERCOVER, // Starts in enemy territory
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
            clandestineOps: LeaderStatLevel.EXCEPTIONAL,
            discretion: LeaderStatLevel.EXCEPTIONAL,
            statesmanship: LeaderStatLevel.INEPT,
            ability: ['FIREBRAND', 'GHOST', 'DAREDEVIL'],
            traits: [CharacterTrait.FAINT_HEARTED],
            insurrectionValue: 30 // DEPRECATED
        }
    },
    {
        id: 'lain',
        name: 'Lain',
        title: 'The Philosopher',
        faction: FactionId.REPUBLICANS,
        status: CharacterStatus.AVAILABLE,
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
            clandestineOps: LeaderStatLevel.EFFECTIVE,
            discretion: LeaderStatLevel.EFFECTIVE,
            statesmanship: LeaderStatLevel.INEPT,
            ability: [],
            traits: [CharacterTrait.FAINT_HEARTED],
            insurrectionValue: 20 // DEPRECATED
        }
    },
    {
        id: 'caelan',
        plannedMissionAction: ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS,
        name: 'Caelan',
        title: 'The Lawyer',
        faction: FactionId.REPUBLICANS,
        status: CharacterStatus.UNDERCOVER, // Starts in enemy territory
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
            clandestineOps: LeaderStatLevel.EXCEPTIONAL,
            discretion: LeaderStatLevel.EFFECTIVE,
            statesmanship: LeaderStatLevel.UNRELIABLE,
            ability: [],
            traits: [], // No trait
            insurrectionValue: 30 // DEPRECATED
        }
    },
    {
        id: 'tordis',
        name: 'Tordis',
        title: 'Militia Captain',
        faction: FactionId.REPUBLICANS,
        status: CharacterStatus.AVAILABLE,
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
            clandestineOps: LeaderStatLevel.EFFECTIVE,
            discretion: LeaderStatLevel.EFFECTIVE,
            statesmanship: LeaderStatLevel.EFFECTIVE,
            ability: [],
            traits: [], // No trait
            insurrectionValue: 30 // DEPRECATED
        }
    },
    {
        id: 'averic',
        name: 'Sir Averic',
        title: "Azer's aide-de-camp",
        faction: FactionId.REPUBLICANS,
        status: CharacterStatus.AVAILABLE,
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
            clandestineOps: LeaderStatLevel.CAPABLE,
            discretion: LeaderStatLevel.CAPABLE,
            statesmanship: LeaderStatLevel.CAPABLE,
            ability: ['NONE'],
            traits: [], // No trait
            insurrectionValue: 20 // DEPRECATED
        }
    },
    {
        id: 'gebren',
        name: 'Sir Gebren',
        title: "Azer's bodyguard",
        faction: FactionId.REPUBLICANS,
        status: CharacterStatus.AVAILABLE,
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
            clandestineOps: LeaderStatLevel.CAPABLE,
            discretion: LeaderStatLevel.CAPABLE,
            statesmanship: LeaderStatLevel.CAPABLE,
            ability: ['PARANOID'],
            traits: [CharacterTrait.IRON_FIST],
            insurrectionValue: 20 // DEPRECATED
        }
    },
    {
        id: 'odeke',
        name: 'Sir Odeke',
        title: "Azer's enforcer",
        faction: FactionId.REPUBLICANS,
        status: CharacterStatus.AVAILABLE,
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
            clandestineOps: LeaderStatLevel.CAPABLE,
            discretion: LeaderStatLevel.CAPABLE,
            statesmanship: LeaderStatLevel.CAPABLE,
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
        faction: FactionId.CONSPIRATORS,
        status: CharacterStatus.AVAILABLE,
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
            clandestineOps: LeaderStatLevel.EXCEPTIONAL,
            discretion: LeaderStatLevel.EXCEPTIONAL,
            statesmanship: LeaderStatLevel.EXCEPTIONAL,
            ability: ['MANAGER', 'GHOST', 'DAREDEVIL'],
            traits: [], // No trait
            insurrectionValue: 30 // DEPRECATED
        }
    },
    {
        id: 'barrett',
        name: 'Sir Barrett',
        title: 'Grandmaster of the Knights',
        faction: FactionId.CONSPIRATORS,
        status: CharacterStatus.AVAILABLE,
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
            clandestineOps: LeaderStatLevel.CAPABLE,
            discretion: LeaderStatLevel.CAPABLE,
            statesmanship: LeaderStatLevel.EXCEPTIONAL,
            ability: ['LEGENDARY'],
            traits: [], // No trait
            insurrectionValue: 10 // DEPRECATED
        }
    },
    {
        id: 'tymon',
        name: 'Sir Tymon',
        title: 'Knight Commander',
        faction: FactionId.CONSPIRATORS,
        status: CharacterStatus.AVAILABLE,
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
            clandestineOps: LeaderStatLevel.CAPABLE,
            discretion: LeaderStatLevel.CAPABLE,
            statesmanship: LeaderStatLevel.EFFECTIVE,
            ability: ['NONE'],
            traits: [], // No trait
            insurrectionValue: 10 // DEPRECATED
        }
    },
    {
        id: 'jadis',
        name: 'Jadis',
        title: 'Royal Advisor',
        faction: FactionId.CONSPIRATORS,
        status: CharacterStatus.AVAILABLE,
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
            clandestineOps: LeaderStatLevel.CAPABLE,
            discretion: LeaderStatLevel.CAPABLE,
            statesmanship: LeaderStatLevel.EFFECTIVE,
            ability: ['MAN_OF_CHURCH'],
            traits: [], // No trait
            insurrectionValue: 20 // DEPRECATED
        }
    },
    {
        id: 'ethell',
        plannedMissionAction: ClandestineActionId.INCITE_NEUTRAL_INSURRECTIONS,
        name: 'Lady Ethell',
        title: "King Fredrik's favorite",
        faction: FactionId.CONSPIRATORS,
        status: CharacterStatus.UNDERCOVER, // Starts in enemy territory
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
            clandestineOps: LeaderStatLevel.EFFECTIVE,
            discretion: LeaderStatLevel.EFFECTIVE,
            statesmanship: LeaderStatLevel.CAPABLE,
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
        faction: FactionId.NOBLES,
        status: CharacterStatus.AVAILABLE,
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
            clandestineOps: LeaderStatLevel.UNRELIABLE,
            discretion: LeaderStatLevel.CAPABLE,
            statesmanship: LeaderStatLevel.EFFECTIVE,
            ability: ['MANAGER', 'PARANOID'],
            traits: [], // No trait (empty cell in specs)
            insurrectionValue: 10 // DEPRECATED
        }
    },
    {
        id: 'thane',
        name: 'Duke of Thane',
        title: 'Lord of the Highlands',
        faction: FactionId.NOBLES,
        status: CharacterStatus.AVAILABLE,
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
            clandestineOps: LeaderStatLevel.UNRELIABLE,
            discretion: LeaderStatLevel.UNRELIABLE,
            statesmanship: LeaderStatLevel.UNRELIABLE,
            ability: ['NONE'],
            traits: [CharacterTrait.IRON_FIST],
            insurrectionValue: 10 // DEPRECATED
        }
    },
    {
        id: 'wrenfield',
        name: 'Lord Wrenfield',
        title: 'Landless noble',
        faction: FactionId.NOBLES,
        status: CharacterStatus.AVAILABLE,
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
            clandestineOps: LeaderStatLevel.EFFECTIVE,
            discretion: LeaderStatLevel.EXCEPTIONAL,
            statesmanship: LeaderStatLevel.EFFECTIVE,
            ability: ['NONE', 'ELITE_NETWORKS'],
            traits: [], // No trait (empty cell in specs)
            insurrectionValue: 30 // DEPRECATED
        }
    },
    {
        id: 'haraldic',
        name: 'Sir Haraldic',
        title: 'Rebellious Knight Commander',
        faction: FactionId.NOBLES,
        status: CharacterStatus.AVAILABLE,
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
            clandestineOps: LeaderStatLevel.CAPABLE,
            discretion: LeaderStatLevel.EXCEPTIONAL,
            statesmanship: LeaderStatLevel.EFFECTIVE,
            ability: ['LEGENDARY', 'FIREBRAND', 'PARANOID', 'DAREDEVIL'],
            traits: [CharacterTrait.IRON_FIST, CharacterTrait.SCORCHED_EARTH],
            insurrectionValue: 10 // DEPRECATED
        }
    },
    {
        id: 'gullwing_duke',
        name: 'Duke of Gullwing',
        title: 'Lord of the southern lands',
        faction: FactionId.NOBLES,
        status: CharacterStatus.AVAILABLE,
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
            clandestineOps: LeaderStatLevel.UNRELIABLE,
            discretion: LeaderStatLevel.UNRELIABLE,
            statesmanship: LeaderStatLevel.UNRELIABLE,
            ability: ['PARANOID'],
            traits: [CharacterTrait.IRON_FIST, CharacterTrait.SCORCHED_EARTH],
            insurrectionValue: 20 // DEPRECATED
        }
    },
    {
        id: 'lys',
        plannedMissionAction: ClandestineActionId.PREPARE_GRAND_INSURRECTION,
        name: 'Castellan Lys',
        title: 'Vassal of the Baron Lekal',
        faction: FactionId.NOBLES,
        status: CharacterStatus.UNDERCOVER, // Starts in enemy territory
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
            clandestineOps: LeaderStatLevel.EFFECTIVE,
            discretion: LeaderStatLevel.CAPABLE,
            statesmanship: LeaderStatLevel.CAPABLE,
            ability: ['FIREBRAND', 'PARANOID', 'ELITE_NETWORKS'],
            traits: [CharacterTrait.IRON_FIST],
            insurrectionValue: 20 // DEPRECATED
        }
    },
    {
        id: 'saltcraw',
        name: 'Viscount of Saltcraw',
        title: 'Lord of the archipelago',
        faction: FactionId.NOBLES,
        status: CharacterStatus.AVAILABLE,
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
            clandestineOps: LeaderStatLevel.UNRELIABLE,
            discretion: LeaderStatLevel.INEPT,
            statesmanship: LeaderStatLevel.INEPT,
            ability: ['SMUGGLER'],
            traits: [CharacterTrait.IRON_FIST],
            insurrectionValue: 10 // DEPRECATED
        }
    },
    {
        id: 'shorclyff',
        name: 'Castellan Shorclyff',
        title: 'Vassal of the Duke of Thane',
        faction: FactionId.NOBLES,
        status: CharacterStatus.AVAILABLE,
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
            clandestineOps: LeaderStatLevel.CAPABLE,
            discretion: LeaderStatLevel.UNRELIABLE,
            statesmanship: LeaderStatLevel.CAPABLE,
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
        faction: FactionId.NEUTRAL,
        status: CharacterStatus.DEAD, // Stored as dead until recruited
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
            clandestineOps: LeaderStatLevel.INEPT,
            discretion: LeaderStatLevel.INEPT,
            statesmanship: LeaderStatLevel.EXCEPTIONAL,
            ability: ['MANAGER', 'SMUGGLER'],
            traits: [CharacterTrait.FREE_TRADER],
            insurrectionValue: 0 // DEPRECATED
        }
    },
    {
        id: 'gildas',
        name: 'Gildas',
        title: 'City councillor',
        faction: FactionId.NEUTRAL,
        status: CharacterStatus.DEAD, // Stored as dead until recruited
        locationId: 'graveyard',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Guild master.',
        bonuses: {},
        budget: 0,
        isRecruitableLeader: true,
        stats: {
            stabilityPerTurn: 3,
            commandBonus: 0,
            clandestineOps: LeaderStatLevel.INEPT,
            discretion: LeaderStatLevel.INEPT,
            statesmanship: LeaderStatLevel.EFFECTIVE,
            ability: ['MANAGER'],
            traits: [CharacterTrait.FAINT_HEARTED, CharacterTrait.FREE_TRADER],
            insurrectionValue: 0 // DEPRECATED
        }
    },
    {
        id: 'clavestone',
        name: 'Clavestone',
        title: 'Manufacture owner',
        faction: FactionId.NEUTRAL,
        status: CharacterStatus.DEAD, // Stored as dead until recruited
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
            clandestineOps: LeaderStatLevel.CAPABLE,
            discretion: LeaderStatLevel.CAPABLE,
            statesmanship: LeaderStatLevel.EFFECTIVE,
            ability: ['MANAGER', 'SMUGGLER'],
            traits: [CharacterTrait.IRON_FIST, CharacterTrait.FREE_TRADER],
            insurrectionValue: 0 // DEPRECATED
        }
    },
    {
        id: 'jack_the_fox',
        name: 'Jack the Fox',
        title: 'Pamphleteer',
        faction: FactionId.NEUTRAL,
        status: CharacterStatus.DEAD,
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
            clandestineOps: LeaderStatLevel.EFFECTIVE,
            discretion: LeaderStatLevel.EXCEPTIONAL,
            statesmanship: LeaderStatLevel.INEPT,
            ability: ['FIREBRAND', 'SMUGGLER'],
            traits: [CharacterTrait.SCORCHED_EARTH],
            insurrectionValue: 0 // DEPRECATED
        }
    },
    {
        id: 'richard_fayre',
        name: 'Richard Fayre',
        title: 'Demagogue',
        faction: FactionId.NEUTRAL,
        status: CharacterStatus.DEAD,
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
            clandestineOps: LeaderStatLevel.EXCEPTIONAL,
            discretion: LeaderStatLevel.UNRELIABLE,
            statesmanship: LeaderStatLevel.INEPT,
            ability: ['FIREBRAND'],
            traits: [],
            insurrectionValue: 0 // DEPRECATED
        }
    },
    {
        id: 'enoch',
        name: 'Sir Enoch',
        title: 'Knight Captain',
        faction: FactionId.NEUTRAL,
        status: CharacterStatus.DEAD,
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
            clandestineOps: LeaderStatLevel.CAPABLE,
            discretion: LeaderStatLevel.CAPABLE,
            statesmanship: LeaderStatLevel.CAPABLE,
            ability: ['NONE'],
            traits: [],
            insurrectionValue: 0
        }
    },
    {
        id: 'alb_turvrard',
        name: 'Alb Turvrard',
        title: 'Royal Treasurer',
        faction: FactionId.NEUTRAL,
        status: CharacterStatus.DEAD,
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
            clandestineOps: LeaderStatLevel.UNRELIABLE,
            discretion: LeaderStatLevel.CAPABLE,
            statesmanship: LeaderStatLevel.EFFECTIVE,
            ability: ['MANAGER', 'ELITE_NETWORKS'],
            traits: [],
            insurrectionValue: 0
        }
    },
    {
        id: 'father_tallysse',
        name: 'Father Tallysse',
        title: 'Witch-Hunter General',
        faction: FactionId.NEUTRAL,
        status: CharacterStatus.DEAD,
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
            clandestineOps: LeaderStatLevel.EXCEPTIONAL,
            discretion: LeaderStatLevel.EFFECTIVE,
            statesmanship: LeaderStatLevel.CAPABLE,
            ability: ['FIREBRAND', 'ELITE_NETWORKS', 'MAN_OF_CHURCH', 'PARANOID'],
            traits: [CharacterTrait.IRON_FIST],
            insurrectionValue: 0
        }
    },
    {
        id: 'maxime_jacob',
        name: 'Maxime Jacob',
        title: 'Lawyer',
        faction: FactionId.NEUTRAL,
        status: CharacterStatus.DEAD,
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
            clandestineOps: LeaderStatLevel.CAPABLE,
            discretion: LeaderStatLevel.UNRELIABLE,
            statesmanship: LeaderStatLevel.EXCEPTIONAL,
            ability: ['PARANOID'],
            traits: [],
            insurrectionValue: 0
        }
    },
    {
        id: 'holvein',
        name: 'Sir Holvein',
        title: "Stormbay's Watch commander",
        faction: FactionId.NEUTRAL,
        status: CharacterStatus.DEAD,
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
            clandestineOps: LeaderStatLevel.UNRELIABLE,
            discretion: LeaderStatLevel.UNRELIABLE,
            statesmanship: LeaderStatLevel.CAPABLE,
            ability: ['CONSCRIPTION'],
            traits: [CharacterTrait.IRON_FIST, CharacterTrait.MAN_OF_ACTION],
            insurrectionValue: 0
        }
    },
    {
        id: 'lazare_montagne',
        name: 'Lazare Montagne',
        title: 'Former soldier',
        faction: FactionId.NEUTRAL,
        status: CharacterStatus.DEAD,
        locationId: 'graveyard',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Will organize victory.',
        bonuses: {},
        budget: 0,
        isRecruitableLeader: true,
        stats: {
            stabilityPerTurn: 3,
            commandBonus: 0.30,
            clandestineOps: LeaderStatLevel.UNRELIABLE,
            discretion: LeaderStatLevel.UNRELIABLE,
            statesmanship: LeaderStatLevel.EFFECTIVE,
            ability: ['MANAGER', 'CONSCRIPTION'],
            traits: [CharacterTrait.IRON_FIST],
            insurrectionValue: 0
        }
    },
    {
        id: 'vendemer',
        name: 'Vendemer',
        title: 'Ship captain',
        faction: FactionId.NEUTRAL,
        status: CharacterStatus.DEAD,
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
            clandestineOps: LeaderStatLevel.EXCEPTIONAL,
            discretion: LeaderStatLevel.EXCEPTIONAL,
            statesmanship: LeaderStatLevel.CAPABLE,
            ability: ['DAREDEVIL', 'GHOST', 'SMUGGLER'],
            traits: [],
            insurrectionValue: 0
        }
    },
    {
        id: 'armand',
        name: 'Sir Armand',
        title: 'Knight Commander',
        faction: FactionId.NEUTRAL,
        status: CharacterStatus.DEAD,
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
            clandestineOps: LeaderStatLevel.CAPABLE,
            discretion: LeaderStatLevel.CAPABLE,
            statesmanship: LeaderStatLevel.CAPABLE,
            ability: ['NONE'],
            traits: [CharacterTrait.FAINT_HEARTED],
            insurrectionValue: 0
        }
    },
    {
        id: 'vergier',
        name: 'Count Vergier',
        title: 'Heir of Jaquelein Rock',
        faction: FactionId.NEUTRAL,
        status: CharacterStatus.DEAD,
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
            clandestineOps: LeaderStatLevel.EXCEPTIONAL,
            discretion: LeaderStatLevel.EXCEPTIONAL,
            statesmanship: LeaderStatLevel.CAPABLE,
            ability: ['FIREBRAND', 'DAREDEVIL', 'AGITATIONAL_NETWORKS'],
            traits: [CharacterTrait.MAN_OF_ACTION],
            insurrectionValue: 0
        }
    },
    {
        id: 'georges_cadal',
        name: 'Georges Cadal',
        title: 'Wealthy landlord',
        faction: FactionId.NEUTRAL,
        status: CharacterStatus.DEAD,
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
            clandestineOps: LeaderStatLevel.EXCEPTIONAL,
            discretion: LeaderStatLevel.EFFECTIVE,
            statesmanship: LeaderStatLevel.UNRELIABLE,
            ability: ['FIREBRAND', 'GHOST', 'DAREDEVIL'],
            traits: [CharacterTrait.IRON_FIST, CharacterTrait.MAN_OF_ACTION],
            insurrectionValue: 0
        }
    },
    {
        id: 'klemath',
        name: 'Klemath',
        title: "Baron Lekal's right hand",
        faction: FactionId.NEUTRAL,
        status: CharacterStatus.DEAD,
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
            clandestineOps: LeaderStatLevel.EFFECTIVE,
            discretion: LeaderStatLevel.CAPABLE,
            statesmanship: LeaderStatLevel.CAPABLE,
            ability: ['SMUGGLER', 'CONSCRIPTION'],
            traits: [CharacterTrait.IRON_FIST],
            insurrectionValue: 0
        }
    },
    {
        id: 'baron_ystrir',
        name: 'Baron of Ystrir',
        title: 'Southern lord',
        faction: FactionId.NEUTRAL,
        status: CharacterStatus.DEAD,
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
            clandestineOps: LeaderStatLevel.UNRELIABLE,
            discretion: LeaderStatLevel.UNRELIABLE,
            statesmanship: LeaderStatLevel.UNRELIABLE,
            ability: ['NONE'],
            traits: [CharacterTrait.IRON_FIST],
            insurrectionValue: 0
        }
    },
    {
        id: 'duke_great_plains',
        name: 'Duke of the Great Plains',
        title: 'Lord of the golden fields',
        faction: FactionId.NEUTRAL,
        status: CharacterStatus.DEAD,
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
            clandestineOps: LeaderStatLevel.UNRELIABLE,
            discretion: LeaderStatLevel.UNRELIABLE,
            statesmanship: LeaderStatLevel.CAPABLE,
            ability: ['NONE'],
            traits: [],
            insurrectionValue: 0
        }
    },
    {
        id: 'spelttiller',
        name: 'Castellan Spelttiller',
        title: 'Vassal of the Duke of the Great Plains',
        faction: FactionId.NEUTRAL,
        status: CharacterStatus.DEAD,
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
            clandestineOps: LeaderStatLevel.EFFECTIVE,
            discretion: LeaderStatLevel.EFFECTIVE,
            statesmanship: LeaderStatLevel.EFFECTIVE,
            ability: ['NONE'],
            traits: [CharacterTrait.FAINT_HEARTED],
            insurrectionValue: 0
        }
    },
    {
        id: 'duke_esmarch',
        name: 'Duke of Esmarch',
        title: 'Lord of the northern marshes',
        faction: FactionId.NEUTRAL,
        status: CharacterStatus.DEAD,
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
            commandBonus: 0.10,
            clandestineOps: LeaderStatLevel.UNRELIABLE,
            discretion: LeaderStatLevel.UNRELIABLE,
            statesmanship: LeaderStatLevel.EFFECTIVE,
            ability: ['MANAGER'],
            traits: [],
            insurrectionValue: 0
        }
    },
    {
        id: 'duke_hornvale',
        name: 'Duke of Hornvale',
        title: 'Lord of the southern plains',
        faction: FactionId.NEUTRAL,
        status: CharacterStatus.DEAD,
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
            clandestineOps: LeaderStatLevel.EFFECTIVE,
            discretion: LeaderStatLevel.EFFECTIVE,
            statesmanship: LeaderStatLevel.INEPT,
            ability: ['ELITE_NETWORKS', 'CONSCRIPTION'],
            traits: [CharacterTrait.IRON_FIST],
            insurrectionValue: 0
        }
    },
    {
        id: 'demain',
        name: 'Sir Demain',
        title: "Defender of Sunbreach's noble district",
        faction: FactionId.NEUTRAL,
        status: CharacterStatus.DEAD,
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
            clandestineOps: LeaderStatLevel.UNRELIABLE,
            discretion: LeaderStatLevel.UNRELIABLE,
            statesmanship: LeaderStatLevel.CAPABLE,
            ability: ['ELITE_NETWORKS'],
            traits: [CharacterTrait.FAINT_HEARTED, CharacterTrait.MAN_OF_ACTION],
            insurrectionValue: 0
        }
    },
    {
        id: 'castelreach',
        name: 'Sir Castelreach',
        title: 'Republican army commander',
        faction: FactionId.NEUTRAL,
        status: CharacterStatus.DEAD,
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
            clandestineOps: LeaderStatLevel.UNRELIABLE,
            discretion: LeaderStatLevel.UNRELIABLE,
            statesmanship: LeaderStatLevel.EFFECTIVE,
            ability: ['CONSCRIPTION'],
            traits: [CharacterTrait.IRON_FIST],
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
export const CHARACTERS = CHARACTERS_NEW as unknown as import('../types').Character[];

