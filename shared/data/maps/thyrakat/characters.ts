/**
 * Thyrakat Map Characters
 * Leaders for each faction
 */

import { FactionId, CharacterStatus } from '../../../types';
import { LeaderStatLevel, CharacterTrait } from '../../../types/leaderTypes';
import { CharacterNew } from '../../characters';

export const THYRAKAT_CHARACTERS: CharacterNew[] = [
    // ============================================================
    // LARION_EXPEDITION
    // ============================================================
    {
        id: 'lord_keepsworth',
        name: 'Lord Keepsworth',
        title: 'New-Larion governor',
        faction: FactionId.LARION_EXPEDITION,
        status: CharacterStatus.AVAILABLE,
        locationId: 'faith_pier',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Loyal agent of the Gullwing duke.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 0,
            commandBonus: 0.15,
            clandestineOps: LeaderStatLevel.INEPT,
            discretion: LeaderStatLevel.INEPT,
            statesmanship: LeaderStatLevel.CAPABLE,
            ability: ['PARANOID', 'MANAGER'],
            traits: [CharacterTrait.IRON_FIST],
            insurrectionValue: 20
        }
    },
    {
        id: 'sir_barral',
        name: 'Sir Barral',
        title: 'Knight Commander',
        faction: FactionId.LARION_EXPEDITION,
        status: CharacterStatus.AVAILABLE,
        locationId: 'faith_pier',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'The eyes of the Order.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 5,
            commandBonus: 0.30,
            clandestineOps: LeaderStatLevel.UNRELIABLE,
            discretion: LeaderStatLevel.UNRELIABLE,
            statesmanship: LeaderStatLevel.EFFECTIVE,
            ability: [],
            traits: [],
            insurrectionValue: 20
        }
    },
    {
        id: 'father_jenrick',
        name: 'Father Jenrick',
        title: 'Head priest of the colony',
        faction: FactionId.LARION_EXPEDITION,
        status: CharacterStatus.AVAILABLE,
        locationId: 'tamnit',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'A good heart, but full with ambition.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 3,
            commandBonus: 0,
            clandestineOps: LeaderStatLevel.UNRELIABLE,
            discretion: LeaderStatLevel.UNRELIABLE,
            statesmanship: LeaderStatLevel.CAPABLE,
            ability: ['MAN_OF_CHURCH'],
            traits: [CharacterTrait.FAINT_HEARTED],
            insurrectionValue: 20
        }
    },
    {
        id: 'sufet_phoenice',
        name: 'Sufet Phoenice',
        title: 'Ex-magistrate of Harabour',
        faction: FactionId.LARION_EXPEDITION,
        status: CharacterStatus.UNDERCOVER,
        locationId: 'grenecoste_protectorate',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Corrupt and dangerous.',
        bonuses: {},
        budget: 500,
        stats: {
            stabilityPerTurn: -3,
            commandBonus: 0,
            clandestineOps: LeaderStatLevel.EFFECTIVE,
            discretion: LeaderStatLevel.EFFECTIVE,
            statesmanship: LeaderStatLevel.CAPABLE,
            ability: ['AGITATIONAL_NETWORKS'],
            traits: [],
            insurrectionValue: 20
        }
    },
    {
        id: 'sufet_xerath',
        name: 'Sufet Xerath',
        title: 'Magistrate of Saphir',
        faction: FactionId.LARION_EXPEDITION,
        status: CharacterStatus.UNDERCOVER,
        locationId: 'endless_rivages',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Believes that Thyrakat is doomed.',
        bonuses: {},
        budget: 500,
        stats: {
            stabilityPerTurn: -3,
            commandBonus: 0,
            clandestineOps: LeaderStatLevel.EFFECTIVE,
            discretion: LeaderStatLevel.EFFECTIVE,
            statesmanship: LeaderStatLevel.CAPABLE,
            ability: ['ELITE_NETWORKS'],
            traits: [],
            insurrectionValue: 20
        }
    },
    {
        id: 'meton_thalassas',
        name: 'Meton Thalassas',
        title: 'Governor of the Expanses',
        faction: FactionId.LARION_EXPEDITION,
        status: CharacterStatus.AVAILABLE,
        locationId: 'tamnit',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Misunderstood modernizer.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 3,
            commandBonus: 0.15,
            clandestineOps: LeaderStatLevel.EXCEPTIONAL,
            discretion: LeaderStatLevel.EXCEPTIONAL,
            statesmanship: LeaderStatLevel.EFFECTIVE,
            ability: ['FIREBRAND', 'MANAGER'],
            traits: [],
            insurrectionValue: 20
        }
    },
    // ============================================================
    // LINEAGES_COUNCIL
    // ============================================================
    {
        id: 'hadrumet',
        name: 'Hadrumet « the Great »',
        title: 'Lineages Council Member',
        faction: FactionId.LINEAGES_COUNCIL,
        status: CharacterStatus.AVAILABLE,
        locationId: 'hhad',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Patriarch of the Trader House',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 5,
            commandBonus: 0,
            clandestineOps: LeaderStatLevel.EXCEPTIONAL,
            discretion: LeaderStatLevel.EXCEPTIONAL,
            statesmanship: LeaderStatLevel.EXCEPTIONAL,
            ability: ['MANAGER', 'SMUGGLER', 'ELITE_NETWORKS'],
            traits: [CharacterTrait.FREE_TRADER],
            insurrectionValue: 20
        }
    },
    {
        id: 'magonn',
        name: 'Magonn « the Miserly »',
        title: 'Lineages Council Member',
        faction: FactionId.LINEAGES_COUNCIL,
        status: CharacterStatus.AVAILABLE,
        locationId: 'hhad',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Patriarch of the Treasure House',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 3,
            commandBonus: 0,
            clandestineOps: LeaderStatLevel.INEPT,
            discretion: LeaderStatLevel.INEPT,
            statesmanship: LeaderStatLevel.EFFECTIVE,
            ability: ['MANAGER', 'ELITE_NETWORKS'],
            traits: [CharacterTrait.FREE_TRADER],
            insurrectionValue: 20
        }
    },
    {
        id: 'barcamot',
        name: 'Barcamot « the Storm »',
        title: 'Lineages Council Member',
        faction: FactionId.LINEAGES_COUNCIL,
        status: CharacterStatus.AVAILABLE,
        locationId: 'harabour',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Patriarch of the Guilds House',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 3,
            commandBonus: 0.10,
            clandestineOps: LeaderStatLevel.CAPABLE,
            discretion: LeaderStatLevel.CAPABLE,
            statesmanship: LeaderStatLevel.EFFECTIVE,
            ability: ['PARANOID', 'FIREBRAND'],
            traits: [CharacterTrait.FREE_TRADER],
            insurrectionValue: 20
        }
    },
    {
        id: 'abnal',
        name: 'Abnal « the Corrupt »',
        title: 'Lineages Council Member',
        faction: FactionId.LINEAGES_COUNCIL,
        status: CharacterStatus.AVAILABLE,
        locationId: 'akemen',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Patriarch of the Grain House',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 0,
            commandBonus: 0,
            clandestineOps: LeaderStatLevel.UNRELIABLE,
            discretion: LeaderStatLevel.UNRELIABLE,
            statesmanship: LeaderStatLevel.UNRELIABLE,
            ability: ['SMUGGLER', 'ELITE_NETWORKS'],
            traits: [CharacterTrait.FREE_TRADER],
            insurrectionValue: 20
        }
    },
    {
        id: 'caloptheras',
        name: 'Caloptheras',
        title: 'Urban guard captain',
        faction: FactionId.LINEAGES_COUNCIL,
        status: CharacterStatus.AVAILABLE,
        locationId: 'qados',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'A guard, not a general.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 0,
            commandBonus: 0.15,
            clandestineOps: LeaderStatLevel.EFFECTIVE,
            discretion: LeaderStatLevel.CAPABLE,
            statesmanship: LeaderStatLevel.UNRELIABLE,
            ability: [],
            traits: [CharacterTrait.IRON_FIST],
            insurrectionValue: 20
        }
    },
    {
        id: 'sufet_ammitat',
        name: 'Sufet Ammitat',
        title: 'Magistrate of Qados',
        faction: FactionId.LINEAGES_COUNCIL,
        status: CharacterStatus.AVAILABLE,
        locationId: 'het-yod',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Effective stateswoman.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 1,
            commandBonus: 0,
            clandestineOps: LeaderStatLevel.CAPABLE,
            discretion: LeaderStatLevel.CAPABLE,
            statesmanship: LeaderStatLevel.CAPABLE,
            ability: [],
            traits: [],
            insurrectionValue: 20
        }
    },
    {
        id: 'hadrumast',
        name: 'Hadrumast',
        title: 'Son of Hadrumet',
        faction: FactionId.LINEAGES_COUNCIL,
        status: CharacterStatus.UNDERCOVER,
        locationId: 'saphir',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Eager to prove his valor.',
        bonuses: {},
        budget: 500,
        stats: {
            stabilityPerTurn: 3,
            commandBonus: 0.15,
            clandestineOps: LeaderStatLevel.EFFECTIVE,
            discretion: LeaderStatLevel.EFFECTIVE,
            statesmanship: LeaderStatLevel.CAPABLE,
            ability: ['DAREDEVIL'],
            traits: [],
            insurrectionValue: 20
        }
    },
    // ============================================================
    // OATH_COALITION
    // ============================================================
    {
        id: 'gen_anankon',
        name: 'Gen. Anankon',
        title: 'Leader of the western army',
        faction: FactionId.OATH_COALITION,
        status: CharacterStatus.AVAILABLE,
        locationId: 'archaris',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'The spark of the insurrection.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 5,
            commandBonus: 0.30,
            clandestineOps: LeaderStatLevel.EFFECTIVE,
            discretion: LeaderStatLevel.EFFECTIVE,
            statesmanship: LeaderStatLevel.EFFECTIVE,
            ability: ['LEGENDARY', 'CONSCRIPTION', 'DAREDEVIL'],
            traits: [],
            insurrectionValue: 20
        }
    },
    {
        id: 'priestess_vestrid',
        name: 'Priestess Vestrid',
        title: 'High Officiant of Archaris',
        faction: FactionId.OATH_COALITION,
        status: CharacterStatus.AVAILABLE,
        locationId: 'archaris',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: "The general's confidante",
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 3,
            commandBonus: 0,
            clandestineOps: LeaderStatLevel.EXCEPTIONAL,
            discretion: LeaderStatLevel.EFFECTIVE,
            statesmanship: LeaderStatLevel.CAPABLE,
            ability: ['FIREBRAND', 'PARANOID', 'MAN_OF_CHURCH'],
            traits: [],
            insurrectionValue: 20
        }
    },
    {
        id: 'gen_ak_tur',
        name: 'Gen. Ak-Tur',
        title: 'Leader of the southern army',
        faction: FactionId.OATH_COALITION,
        status: CharacterStatus.AVAILABLE,
        locationId: 'maqom_province',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Old, but determined.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 0,
            commandBonus: 0.20,
            clandestineOps: LeaderStatLevel.EFFECTIVE,
            discretion: LeaderStatLevel.UNRELIABLE,
            statesmanship: LeaderStatLevel.UNRELIABLE,
            ability: ['CONSCRIPTION'],
            traits: [CharacterTrait.IRON_FIST],
            insurrectionValue: 20
        }
    },
    {
        id: 'priest_maharbal',
        name: 'Priest Maharbal',
        title: 'Officiant of Qados',
        faction: FactionId.OATH_COALITION,
        status: CharacterStatus.UNDERCOVER,
        locationId: 'qados',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'A man of rites and discipline.',
        bonuses: {},
        budget: 400,
        stats: {
            stabilityPerTurn: 3,
            commandBonus: 0,
            clandestineOps: LeaderStatLevel.EFFECTIVE,
            discretion: LeaderStatLevel.UNRELIABLE,
            statesmanship: LeaderStatLevel.CAPABLE,
            ability: ['FIREBRAND', 'AGITATIONAL_NETWORKS', 'MAN_OF_CHURCH'],
            traits: [],
            insurrectionValue: 20
        }
    },
    {
        id: 'gen_stilkas',
        name: 'Gen. Stilkas',
        title: 'Leader of the eastern army',
        faction: FactionId.OATH_COALITION,
        status: CharacterStatus.AVAILABLE,
        locationId: 'addir',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Hates the Council more than Larion.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: -3,
            commandBonus: 0.30,
            clandestineOps: LeaderStatLevel.CAPABLE,
            discretion: LeaderStatLevel.CAPABLE,
            statesmanship: LeaderStatLevel.INEPT,
            ability: ['CONSCRIPTION'],
            traits: [CharacterTrait.IRON_FIST, CharacterTrait.SCORCHED_EARTH],
            insurrectionValue: 20
        }
    },
    {
        id: 'sufet_mahsdrumet',
        name: 'Sufet Mahsdrumet',
        title: "Magistrate of Eq'",
        faction: FactionId.OATH_COALITION,
        status: CharacterStatus.AVAILABLE,
        locationId: 'eq_city',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Veteran of battles against Larion.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: -3,
            commandBonus: 0.15,
            clandestineOps: LeaderStatLevel.CAPABLE,
            discretion: LeaderStatLevel.CAPABLE,
            statesmanship: LeaderStatLevel.INEPT,
            ability: ['CONSCRIPTION', 'PARANOID'],
            traits: [CharacterTrait.IRON_FIST, CharacterTrait.SCORCHED_EARTH],
            insurrectionValue: 20
        }
    },
    {
        id: 'xanathos',
        name: 'Xanathos « the Mad »',
        title: "High-Officiant of Eq'",
        faction: FactionId.OATH_COALITION,
        status: CharacterStatus.AVAILABLE,
        locationId: 'eq_city',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'The ardent gaze of an eschatologist.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: -3,
            commandBonus: 0,
            clandestineOps: LeaderStatLevel.EFFECTIVE,
            discretion: LeaderStatLevel.CAPABLE,
            statesmanship: LeaderStatLevel.INEPT,
            ability: ['MAN_OF_CHURCH', 'FIREBRAND', 'AGITATIONAL_NETWORKS'],
            traits: [],
            insurrectionValue: 20
        }
    },
    {
        id: 'meton_xantis',
        name: 'Meton Xantis',
        title: 'Governor of the Rivages',
        faction: FactionId.OATH_COALITION,
        status: CharacterStatus.AVAILABLE,
        locationId: 'endless_rivages',
        destinationId: null,
        turnsUntilArrival: 0,
        armyId: null,
        description: 'Moderate mind among the turmoil.',
        bonuses: {},
        budget: 0,
        stats: {
            stabilityPerTurn: 3,
            commandBonus: 0.15,
            clandestineOps: LeaderStatLevel.CAPABLE,
            discretion: LeaderStatLevel.UNRELIABLE,
            statesmanship: LeaderStatLevel.EFFECTIVE,
            ability: ['ELITE_NETWORKS'],
            traits: [CharacterTrait.FAINT_HEARTED],
            insurrectionValue: 20
        }
    },
];
